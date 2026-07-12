import type { Context } from "hono";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { and, desc, eq, ilike } from "drizzle-orm";
import { db } from "../db/client.js";
import { comments, files, shares, users } from "../db/schema.js";
import type { AuthContext } from "../middleware/auth.js";
import { isCommentOutdated, resolveAnchor } from "../lib/comment-outdated.js";
import { maskEmail, toPublicAuthor } from "../lib/comment-author.js";

// NOTE: built on the stable v1 MCP SDK line (`McpServer` + `registerTool`) and
// `@hono/mcp`'s `StreamableHTTPTransport`. A migration to the v2 SDK packages is
// expected post-2026-07-28; revisit the tool-registration + transport wiring then.

const MAX_NAME_LENGTH = 255;
const MAX_CONTENT_LENGTH = 1_000_000; // ~1MB of markdown, mirrors routes/files.ts
const MAX_COMMENT_LENGTH = 2000;
const LIST_LIMIT = 100;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

function jsonResult(data: unknown): ToolResult {
  return textResult(JSON.stringify(data, null, 2));
}

function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function isShareExpired(share: { expiresAt: Date | null }): boolean {
  return share.expiresAt !== null && new Date(share.expiresAt) < new Date();
}

// Accepts a bare share token, or a share/raw URL, and returns the trailing
// path segment (the token). Strips any query string or fragment.
function parseToken(input: string): string {
  const withoutQueryOrHash = input.trim().split(/[?#]/)[0] ?? "";
  const segments = withoutQueryOrHash.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

// Ensure the key's Clerk user exists locally and resolve a public-safe display
// name for authored comments. Mirrors routes/comments.ts: try Clerk, fall back
// to a masked bearer email so an API-key comment never hard-fails on a Clerk
// hiccup.
async function resolveApiKeyAuthor(c: Context, auth: AuthContext): Promise<string> {
  try {
    const clerkClient = c.get("clerk");
    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || "";

    const authorName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      maskEmail(email) ||
      "agent";

    await db.insert(users).values({ id: auth.userId, email }).onConflictDoNothing();
    return authorName;
  } catch (clerkError) {
    console.error("Failed to resolve commenter identity from Clerk:", clerkError);
    await db
      .insert(users)
      .values({ id: auth.userId, email: auth.email ?? "" })
      .onConflictDoNothing();
    return maskEmail(auth.email ?? "") || "agent";
  }
}

// Build a fresh MCP server bound to the authenticated API-key identity. One
// server (and transport) is created per HTTP request — the transport is
// stateless, so nothing is shared across requests.
export function createMcpServer(auth: AuthContext, c: Context): McpServer {
  const server = new McpServer({ name: "markdown-viewer", version: "1.0.0" });
  const origin = new URL(c.req.url).origin;

  // --- publish_document -----------------------------------------------------
  server.registerTool(
    "publish_document",
    {
      title: "Publish document",
      description:
        "Publish a new markdown document and get back a shareable link. Returns `rawUrl` (directly fetchable text/markdown via plain HTTP GET, ideal for other agents) and `shareUrl` (the human-readable share page). Comments are enabled by default so the document can be reviewed frictionlessly.",
      inputSchema: {
        name: z
          .string()
          .min(1)
          .max(MAX_NAME_LENGTH)
          .describe('Document title / filename, e.g. "design-review.md".'),
        content: z
          .string()
          .max(MAX_CONTENT_LENGTH)
          .describe("The full markdown body of the document."),
        comments_enabled: z
          .boolean()
          .optional()
          .describe("Whether humans can leave comments on the share. Defaults to true."),
        allow_anonymous_comments: z
          .boolean()
          .optional()
          .describe(
            "Whether signed-out visitors can comment (only meaningful when comments are enabled). Defaults to true.",
          ),
      },
    },
    async (args) => {
      try {
        const name = args.name.trim();
        if (name.length === 0) {
          return errorResult("name is required");
        }

        await db
          .insert(users)
          .values({ id: auth.userId, email: auth.email ?? "" })
          .onConflictDoNothing();

        const [file] = await db
          .insert(files)
          .values({ userId: auth.userId, name, content: args.content })
          .returning();

        const shareToken = crypto.randomUUID();
        // Deliberate product decision: agent-published docs default comments ON
        // (inverted from the REST defaults) so they are reviewable by default.
        await db.insert(shares).values({
          fileId: file.id,
          shareToken,
          commentsEnabled: args.comments_enabled ?? true,
          allowAnonymousComments: args.allow_anonymous_comments ?? true,
        });

        return jsonResult({
          fileId: file.id,
          shareToken,
          shareUrl: `${origin}/share/${shareToken}`,
          rawUrl: `${origin}/raw/${shareToken}`,
        });
      } catch (error) {
        console.error("mcp publish_document failed:", error);
        return errorResult("Failed to publish document");
      }
    },
  );

  // --- read_document --------------------------------------------------------
  server.registerTool(
    "read_document",
    {
      title: "Read document",
      description:
        "Read any shared document by its share token or a share/raw URL. Returns the markdown content, name, and last-updated time. Works for any public share, not just your own. (For a raw HTTP fetch, GET the document's rawUrl directly.)",
      inputSchema: {
        token_or_url: z
          .string()
          .min(1)
          .describe("A share token, or a full share/raw URL (the trailing token is extracted)."),
      },
    },
    async (args) => {
      try {
        const token = parseToken(args.token_or_url);
        if (!token) {
          return errorResult("A share token or URL is required");
        }

        const share = await db.query.shares.findFirst({
          where: eq(shares.shareToken, token),
          with: { file: true },
        });

        if (!share) {
          return errorResult("Document not found");
        }
        if (isShareExpired(share)) {
          return errorResult("This share has expired");
        }

        return jsonResult({
          name: share.file.name,
          content: share.file.content,
          updatedAt: share.file.updatedAt,
        });
      } catch (error) {
        console.error("mcp read_document failed:", error);
        return errorResult("Failed to read document");
      }
    },
  );

  // --- update_document ------------------------------------------------------
  server.registerTool(
    "update_document",
    {
      title: "Update document",
      description:
        "Replace the content (and optionally rename) a document you own. Accepts the file id or a share token. Existing share/raw links keep working and continue to serve the new content.",
      inputSchema: {
        file_id_or_token: z
          .string()
          .min(1)
          .describe(
            "The file id returned by publish_document, or one of the document's share tokens.",
          ),
        content: z.string().max(MAX_CONTENT_LENGTH).describe("The new full markdown body."),
        name: z
          .string()
          .min(1)
          .max(MAX_NAME_LENGTH)
          .optional()
          .describe("Optional new title / filename."),
      },
    },
    async (args) => {
      try {
        const identifier = args.file_id_or_token.trim();

        // Both file ids and share tokens are UUIDs, so try the (safe, text)
        // share-token lookup first, then fall back to a direct file id.
        let fileId: string | null = null;
        let ownerId: string | null = null;

        const share = await db.query.shares.findFirst({
          where: eq(shares.shareToken, identifier),
          with: { file: true },
        });
        if (share) {
          fileId = share.file.id;
          ownerId = share.file.userId;
        } else if (UUID_RE.test(identifier)) {
          const file = await db.query.files.findFirst({ where: eq(files.id, identifier) });
          if (file) {
            fileId = file.id;
            ownerId = file.userId;
          }
        }

        if (!fileId || ownerId === null) {
          return errorResult("Document not found");
        }
        if (ownerId !== auth.userId) {
          return errorResult("You do not have permission to update this document");
        }

        const name = args.name?.trim();
        const [updated] = await db
          .update(files)
          .set({
            content: args.content,
            ...(name ? { name } : {}),
            updatedAt: new Date(),
          })
          .where(eq(files.id, fileId))
          .returning();

        return jsonResult({
          fileId: updated.id,
          name: updated.name,
          updatedAt: updated.updatedAt,
        });
      } catch (error) {
        console.error("mcp update_document failed:", error);
        return errorResult("Failed to update document");
      }
    },
  );

  // --- list_documents -------------------------------------------------------
  server.registerTool(
    "list_documents",
    {
      title: "List documents",
      description:
        "List documents you own (most recent first, up to 100), including any share tokens for docs you've published. Optionally filter by a case-insensitive substring of the name.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Optional case-insensitive name filter (substring match)."),
      },
    },
    async (args) => {
      try {
        const query = args.query?.trim();
        const rows = await db.query.files.findMany({
          where: query
            ? and(eq(files.userId, auth.userId), ilike(files.name, `%${query}%`))
            : eq(files.userId, auth.userId),
          with: { shares: { columns: { shareToken: true } } },
          orderBy: desc(files.createdAt),
          limit: LIST_LIMIT,
        });

        return jsonResult(
          rows.map((file) => ({
            id: file.id,
            name: file.name,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            shareTokens: file.shares.map((s) => s.shareToken),
          })),
        );
      } catch (error) {
        console.error("mcp list_documents failed:", error);
        return errorResult("Failed to list documents");
      }
    },
  );

  // --- get_comments ---------------------------------------------------------
  server.registerTool(
    "get_comments",
    {
      title: "Get comments",
      description:
        "Get all comments on a shared document by its share token. Each comment includes its line anchor (anchorStartLine/anchorEndLine) when present and `isOutdated`, which is true when the anchored lines have changed since the comment was made.",
      inputSchema: {
        token: z
          .string()
          .min(1)
          .describe("The document's share token (or a share/raw URL; the token is extracted)."),
      },
    },
    async (args) => {
      try {
        const token = parseToken(args.token);
        if (!token) {
          return errorResult("A share token is required");
        }

        const share = await db.query.shares.findFirst({
          where: eq(shares.shareToken, token),
          with: { file: true },
        });

        if (!share) {
          return errorResult("Document not found");
        }
        if (isShareExpired(share)) {
          return errorResult("This share has expired");
        }

        const shareComments = await db
          .select()
          .from(comments)
          .where(eq(comments.shareId, share.id))
          .orderBy(comments.createdAt);

        return jsonResult(
          shareComments.map((comment) => ({
            id: comment.id,
            author: toPublicAuthor(comment),
            content: comment.content,
            parentId: comment.parentId,
            anchorStartLine: comment.anchorStartLine,
            anchorEndLine: comment.anchorEndLine,
            isOutdated: isCommentOutdated(comment, share.file.content),
            isAnonymous: comment.userId === null,
            createdAt: comment.createdAt,
          })),
        );
      } catch (error) {
        console.error("mcp get_comments failed:", error);
        return errorResult("Failed to get comments");
      }
    },
  );

  // --- add_comment ----------------------------------------------------------
  server.registerTool(
    "add_comment",
    {
      title: "Add comment",
      description:
        "Add a comment to a shared document, posted as your API key's user. Optionally anchor it to a line range (anchor_start_line / anchor_end_line, 1-based) or reply to an existing top-level comment via parent_id. Replies cannot be anchored.",
      inputSchema: {
        token: z
          .string()
          .min(1)
          .describe("The document's share token (or a share/raw URL; the token is extracted)."),
        content: z
          .string()
          .min(1)
          .max(MAX_COMMENT_LENGTH)
          .describe("The comment body (max 2000 characters)."),
        anchor_start_line: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("First source line (1-based) to anchor to. Omit for a general comment."),
        anchor_end_line: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe(
            "Last source line (1-based); defaults to anchor_start_line. Max 200-line span.",
          ),
        parent_id: z
          .string()
          .uuid()
          .optional()
          .describe("Reply under this top-level comment id. Replies cannot carry a line anchor."),
      },
    },
    async (args) => {
      try {
        const content = args.content.trim();
        if (content.length === 0) {
          return errorResult("Comment content is required");
        }

        const token = parseToken(args.token);
        if (!token) {
          return errorResult("A share token is required");
        }

        const share = await db.query.shares.findFirst({
          where: eq(shares.shareToken, token),
          with: { file: true },
        });

        if (!share) {
          return errorResult("Document not found");
        }
        if (isShareExpired(share)) {
          return errorResult("This share has expired");
        }
        if (!share.commentsEnabled) {
          return errorResult("Comments are disabled for this share");
        }

        // Reply validation: parent must be a top-level comment in this share.
        if (args.parent_id) {
          const parent = await db.query.comments.findFirst({
            where: and(eq(comments.id, args.parent_id), eq(comments.shareId, share.id)),
          });
          if (!parent) {
            return errorResult("Parent comment not found");
          }
          if (parent.parentId !== null) {
            return errorResult("Cannot reply to a reply");
          }
        }

        // Line anchor (top-level comments only). Server computes anchorText from
        // current content via the shared Phase 3 helper — never trust the client.
        let anchorStartLine: number | null = null;
        let anchorEndLine: number | null = null;
        let anchorText: string | null = null;

        if (args.anchor_start_line !== undefined) {
          if (args.parent_id) {
            return errorResult("Replies cannot have a line anchor");
          }
          const resolved = resolveAnchor(
            share.file.content,
            args.anchor_start_line,
            args.anchor_end_line,
          );
          if (!resolved.ok) {
            return errorResult(resolved.error);
          }
          anchorStartLine = resolved.anchor.anchorStartLine;
          anchorEndLine = resolved.anchor.anchorEndLine;
          anchorText = resolved.anchor.anchorText;
        }

        const authorName = await resolveApiKeyAuthor(c, auth);

        const [comment] = await db
          .insert(comments)
          .values({
            shareId: share.id,
            userId: auth.userId,
            userEmail: authorName,
            content,
            parentId: args.parent_id ?? null,
            anchorStartLine,
            anchorEndLine,
            anchorText,
          })
          .returning();

        return jsonResult({
          id: comment.id,
          author: authorName,
          content: comment.content,
          parentId: comment.parentId,
          anchorStartLine: comment.anchorStartLine,
          anchorEndLine: comment.anchorEndLine,
          createdAt: comment.createdAt,
        });
      } catch (error) {
        console.error("mcp add_comment failed:", error);
        return errorResult("Failed to add comment");
      }
    },
  );

  return server;
}
