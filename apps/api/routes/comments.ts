import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { comments, shares, users } from "../db/schema.js";
import { getOptionalAuth, requireAuth } from "../middleware/auth.js";
import { isCommentOutdated, resolveAnchor } from "../lib/comment-outdated.js";
import { maskEmail, toPublicAuthor } from "../lib/comment-author.js";
import { RATE_LIMITS, checkRateLimit, clientIp, tooManyRequests } from "../lib/rate-limit.js";
import type { CreateCommentInput, PublicComment } from "@markdown-viewer/shared";

const MAX_AUTHOR_NAME_LENGTH = 50;

// Names anonymous commenters may not pick (case-insensitive), whole-word or
// de-spaced ("ad min" -> "admin"). Deters casual impersonation, not
// determined abuse — consistent with the rest of the anti-abuse posture here.
const RESERVED_AUTHOR_WORDS = [
  "admin",
  "administrator",
  "moderator",
  "mod",
  "owner",
  "staff",
  "support",
  "system",
  "official",
  "bot",
  "anthropic",
  "claude",
];

const app = new Hono();

function isShareExpired(share: { expiresAt: Date | null }): boolean {
  return share.expiresAt !== null && new Date(share.expiresAt) < new Date();
}

// Strip invisible Unicode format characters (zero-width spaces/joiners — used
// to sneak "ad​min" past the reserved-word checks), then trim + collapse
// internal whitespace runs to a single space.
function normalizeAuthorName(name: string): string {
  return name
    .replace(/\p{Cf}/gu, "")
    .trim()
    .replace(/\s+/g, " ");
}

// `collapsed` must already be normalized (normalizeAuthorName). Checks, in
// order: email impersonation, whole-word reserved match, de-spaced reserved
// match (substrings like "admiral" must NOT match), file-owner username
// impersonation, and names with no letters or digits at all (any script —
// non-Latin names are welcome).
function isDisallowedAuthorName(collapsed: string, ownerUsername: string | null): boolean {
  const lower = collapsed.toLowerCase();

  if (collapsed.includes("@")) return true;
  if (lower.split(" ").some((token) => RESERVED_AUTHOR_WORDS.includes(token))) return true;
  if (RESERVED_AUTHOR_WORDS.includes(lower.replace(/\s+/g, ""))) return true;
  if (ownerUsername !== null && lower === ownerUsername.toLowerCase()) return true;
  if (!/[\p{L}\p{N}]/u.test(collapsed)) return true;

  return false;
}

// Get all comments for a share (public - always returns comments for read-only
// display). The viewer may be anonymous, a Clerk session, or a bearer key; we
// resolve them so `canDelete` / `viewerIsFileOwner` can be computed server-side
// and no raw Clerk user ID ever appears on the wire.
app.get("/:shareId", async (c) => {
  const { shareId } = c.req.param();

  try {
    const auth = await getOptionalAuth(c);

    const share = await db.query.shares.findFirst({
      where: eq(shares.id, shareId),
      with: { file: true },
    });

    if (!share) {
      return c.json({ error: "Share not found" }, 404);
    }

    if (isShareExpired(share)) {
      return c.json({ error: "Share has expired" }, 410);
    }

    const viewerIsFileOwner = auth?.userId === share.file.userId;

    const shareComments = await db
      .select()
      .from(comments)
      .where(eq(comments.shareId, shareId))
      .orderBy(comments.createdAt);

    // Project explicit columns — never spread the raw row, which carries userId.
    const projected: PublicComment[] = shareComments.map((comment) => ({
      id: comment.id,
      shareId: comment.shareId,
      content: comment.content,
      parentId: comment.parentId,
      anchorStartLine: comment.anchorStartLine,
      anchorEndLine: comment.anchorEndLine,
      anchorText: comment.anchorText,
      createdAt: comment.createdAt,
      userEmail: toPublicAuthor(comment),
      isOutdated: isCommentOutdated(comment, share.file.content),
      isAnonymous: comment.userId === null,
      canDelete: auth !== null && (comment.userId === auth.userId || viewerIsFileOwner),
    }));

    // Per-viewer fields (canDelete / viewerIsFileOwner) must never be served
    // from a shared cache.
    c.header("Cache-Control", "private, no-store");
    return c.json({ comments: projected, viewerIsFileOwner });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return c.json({ error: "Failed to fetch comments" }, 500);
  }
});

// Create a comment (auth optional - anonymous allowed when share permits it)
app.post("/", async (c) => {
  try {
    const auth = await getOptionalAuth(c);
    const body = await c.req.json<CreateCommentInput>();

    // Validate content length
    if (!body.content || body.content.trim().length === 0) {
      return c.json({ error: "Comment content is required" }, 400);
    }
    if (body.content.length > 2000) {
      return c.json({ error: "Comment must be 2000 characters or less" }, 400);
    }

    // Rate limit EARLY — after auth resolution (needed to pick anon-vs-authed
    // limits) but before the share lookup, validation work, and insert.
    // Anonymous callers are limited per-IP and per-share; authed per user.
    if (!auth) {
      const ip = clientIp(c);
      const withinIp = await checkRateLimit(
        RATE_LIMITS.anonComment.name,
        ip,
        RATE_LIMITS.anonComment.limit,
        RATE_LIMITS.anonComment.windowSeconds,
      );
      if (!withinIp) {
        return tooManyRequests(
          c,
          RATE_LIMITS.anonComment.windowSeconds,
          "Too many comments — slow down",
        );
      }
      const withinShare = await checkRateLimit(
        RATE_LIMITS.anonCommentShare.name,
        body.shareId,
        RATE_LIMITS.anonCommentShare.limit,
        RATE_LIMITS.anonCommentShare.windowSeconds,
      );
      if (!withinShare) {
        return tooManyRequests(
          c,
          RATE_LIMITS.anonCommentShare.windowSeconds,
          "Too many comments — slow down",
        );
      }
    } else {
      const withinUser = await checkRateLimit(
        RATE_LIMITS.comment.name,
        auth.userId,
        RATE_LIMITS.comment.limit,
        RATE_LIMITS.comment.windowSeconds,
      );
      if (!withinUser) {
        return tooManyRequests(
          c,
          RATE_LIMITS.comment.windowSeconds,
          "Too many comments — slow down",
        );
      }
    }

    // Verify share exists and comments are enabled
    const share = await db.query.shares.findFirst({
      where: eq(shares.id, body.shareId),
      with: { file: true },
    });

    if (!share) {
      return c.json({ error: "Share not found" }, 404);
    }

    if (isShareExpired(share)) {
      return c.json({ error: "Share has expired" }, 410);
    }

    if (!share.commentsEnabled) {
      return c.json({ error: "Comments are disabled for this share" }, 403);
    }

    // If not signed in, the share must allow anonymous comments
    if (!auth?.userId && !share.allowAnonymousComments) {
      return c.json({ error: "Sign in required to comment on this share" }, 401);
    }

    // If replying, validate parent is a top-level comment (no nested replies)
    if (body.parentId) {
      const parentComment = await db.query.comments.findFirst({
        where: and(eq(comments.id, body.parentId), eq(comments.shareId, body.shareId)),
      });

      if (!parentComment) {
        return c.json({ error: "Parent comment not found" }, 404);
      }

      if (parentComment.parentId !== null) {
        return c.json({ error: "Cannot reply to a reply" }, 400);
      }
    }

    // Line anchor (GitHub-style) — top-level comments only; the server
    // computes anchorText from CURRENT file content (never trust client text).
    let anchorStartLine: number | null = null;
    let anchorEndLine: number | null = null;
    let anchorText: string | null = null;

    if (body.anchorStartLine !== undefined) {
      if (body.parentId) {
        return c.json({ error: "Replies cannot have a line anchor" }, 400);
      }

      const resolved = resolveAnchor(share.file.content, body.anchorStartLine, body.anchorEndLine);
      if (!resolved.ok) {
        return c.json({ error: resolved.error }, 400);
      }

      anchorStartLine = resolved.anchor.anchorStartLine;
      anchorEndLine = resolved.anchor.anchorEndLine;
      anchorText = resolved.anchor.anchorText;
    }

    let userId: string | null = null;
    let authorName: string;

    if (auth?.userId) {
      // Authenticated (Clerk session OR API key — both map to a real Clerk
      // userId, and the clerk client is on context for every request). Resolve
      // a public-safe display name and ensure the user row exists (email stays
      // private in the users table). Wrapped in try/catch so agent commenting
      // via API key never hard-fails on a Clerk hiccup.
      try {
        const clerkClient = c.get("clerk");
        const clerkUser = await clerkClient.users.getUser(auth.userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress || "";

        authorName =
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
          clerkUser.username ||
          maskEmail(email) ||
          "user";

        await db.insert(users).values({ id: auth.userId, email }).onConflictDoNothing();
      } catch (clerkError) {
        console.error("Failed to resolve commenter identity from Clerk:", clerkError);
        authorName = maskEmail(auth.email ?? "") || "agent";
        // Ensure the user row exists so the comment's userId FK holds.
        await db
          .insert(users)
          .values({ id: auth.userId, email: auth.email ?? "" })
          .onConflictDoNothing();
      }

      userId = auth.userId;
    } else {
      // Anonymous: require a non-empty author name that isn't a misleading
      // identity (reserved word, email, or an impersonation of the file owner).
      const trimmedName = body.authorName?.trim() ?? "";
      if (trimmedName.length === 0) {
        return c.json({ error: "Name is required for anonymous comments" }, 400);
      }
      if (trimmedName.length > MAX_AUTHOR_NAME_LENGTH) {
        return c.json({ error: `Name must be ${MAX_AUTHOR_NAME_LENGTH} characters or less` }, 400);
      }

      const collapsed = normalizeAuthorName(trimmedName);
      const owner = await db.query.users.findFirst({
        where: eq(users.id, share.file.userId),
        columns: { username: true },
      });
      if (isDisallowedAuthorName(collapsed, owner?.username ?? null)) {
        return c.json({ error: "Please pick a different name" }, 400);
      }

      authorName = collapsed;
    }

    const [newComment] = await db
      .insert(comments)
      .values({
        shareId: body.shareId,
        userId,
        userEmail: authorName,
        content: body.content.trim(),
        parentId: body.parentId ?? null,
        anchorStartLine,
        anchorEndLine,
        anchorText,
      })
      .returning();

    // Project the same public shape as GET so userId never appears on any
    // public comment response. The author can always delete what they just made.
    const created: PublicComment = {
      id: newComment.id,
      shareId: newComment.shareId,
      content: newComment.content,
      parentId: newComment.parentId,
      anchorStartLine: newComment.anchorStartLine,
      anchorEndLine: newComment.anchorEndLine,
      anchorText: newComment.anchorText,
      createdAt: newComment.createdAt,
      userEmail: toPublicAuthor(newComment),
      isOutdated: isCommentOutdated(newComment, share.file.content),
      isAnonymous: newComment.userId === null,
      canDelete: true,
    };

    return c.json(created, 201);
  } catch (error) {
    console.error("Error creating comment:", error);
    return c.json({ error: "Failed to create comment" }, 500);
  }
});

// Delete a comment (own comment or file owner)
app.delete("/:id", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  const { id } = c.req.param();

  try {
    // Get the comment with share and file info
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, id),
      with: {
        share: {
          with: {
            file: true,
          },
        },
      },
    });

    if (!comment) {
      return c.json({ error: "Comment not found" }, 404);
    }

    // Allow deletion if user owns the comment OR owns the file
    const isCommentOwner = comment.userId === auth.userId;
    const isFileOwner = comment.share.file.userId === auth.userId;

    if (!isCommentOwner && !isFileOwner) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    await db.delete(comments).where(eq(comments.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return c.json({ error: "Failed to delete comment" }, 500);
  }
});

export default app;
