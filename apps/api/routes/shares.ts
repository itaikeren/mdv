import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { files, shares } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import type { CreateShareInput, SharedFile } from "@markdown-viewer/shared";

const app = new Hono();

// Create a share link
app.post("/", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  try {
    const body = await c.req.json<CreateShareInput>();

    // Verify user owns the file
    const file = await db.query.files.findFirst({
      where: and(eq(files.id, body.fileId), eq(files.userId, auth.userId)),
    });

    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }

    // Generate unique share token
    const shareToken = crypto.randomUUID();

    // Create the share
    const [newShare] = await db
      .insert(shares)
      .values({
        fileId: body.fileId,
        shareToken,
        commentsEnabled: body.commentsEnabled ?? false,
        allowAnonymousComments: body.allowAnonymousComments ?? false,
        expiresAt: body.expiresAt || null,
      })
      .returning();

    // Get the full origin URL
    const origin = new URL(c.req.url).origin;

    return c.json(
      {
        shareUrl: `${origin}/share/${shareToken}`,
        shareToken,
        share: newShare,
      },
      201,
    );
  } catch (error) {
    console.error("Error creating share:", error);
    return c.json({ error: "Failed to create share link" }, 500);
  }
});

// Get shared file (PUBLIC - no auth required)
app.get("/:token", async (c) => {
  const { token } = c.req.param();

  try {
    // Fetch share + file + author username and increment the view count in a
    // single round trip
    const result = await db.execute(sql`
      UPDATE shares
      SET view_count = shares.view_count + 1
      FROM files
      INNER JOIN users ON users.id = files.user_id
      WHERE shares.share_token = ${token}
        AND files.id = shares.file_id
        AND (shares.expires_at IS NULL OR shares.expires_at > now())
      RETURNING
        shares.id AS share_id,
        shares.comments_enabled,
        shares.allow_anonymous_comments,
        shares.view_count,
        files.id AS file_id,
        files.name,
        files.content,
        files.created_at,
        files.updated_at,
        files.slug,
        files.visibility,
        users.username AS author_username
    `);

    const row = result.rows[0];

    if (!row) {
      // Distinguish missing from expired (rare path, so the extra query is fine)
      const share = await db.query.shares.findFirst({
        where: eq(shares.shareToken, token),
        columns: { id: true },
      });
      if (share) {
        return c.json({ error: "Share has expired" }, 410);
      }
      return c.json({ error: "Share not found" }, 404);
    }

    // Public share response — the file shape deliberately omits the owner's
    // Clerk user ID (dropped from the RETURNING list above too).
    const file: SharedFile = {
      id: row.file_id as string,
      name: row.name as string,
      content: row.content as string,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      slug: (row.slug ?? null) as string | null,
      visibility: row.visibility as "private" | "public",
    };

    return c.json({
      file,
      shareId: row.share_id,
      commentsEnabled: row.comments_enabled,
      allowAnonymousComments: row.allow_anonymous_comments,
      viewCount: row.view_count,
      authorUsername: row.author_username ?? null,
    });
  } catch (error) {
    console.error("Error fetching share:", error);
    return c.json({ error: "Failed to fetch shared file" }, 500);
  }
});

// Get all shares for a file
app.get("/file/:fileId", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  const { fileId } = c.req.param();

  try {
    // Verify user owns the file
    const file = await db.query.files.findFirst({
      where: and(eq(files.id, fileId), eq(files.userId, auth.userId)),
    });

    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }

    // Get all shares for this file
    const fileShares = await db.select().from(shares).where(eq(shares.fileId, fileId));

    return c.json(fileShares);
  } catch (error) {
    console.error("Error fetching shares:", error);
    return c.json({ error: "Failed to fetch shares" }, 500);
  }
});

// Update a share (toggle comments)
app.patch("/:id", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  const { id } = c.req.param();

  try {
    const body = await c.req.json<{
      commentsEnabled?: boolean;
      allowAnonymousComments?: boolean;
    }>();

    // Get the share and verify ownership through file
    const share = await db.query.shares.findFirst({
      where: eq(shares.id, id),
      with: {
        file: true,
      },
    });

    if (!share) {
      return c.json({ error: "Share not found" }, 404);
    }

    if (share.file.userId !== auth.userId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const nextCommentsEnabled = body.commentsEnabled ?? share.commentsEnabled;
    const nextAllowAnonymous = body.allowAnonymousComments ?? share.allowAnonymousComments;

    const [updated] = await db
      .update(shares)
      .set({
        commentsEnabled: nextCommentsEnabled,
        // Anonymous comments only meaningful while comments are enabled
        allowAnonymousComments: nextCommentsEnabled ? nextAllowAnonymous : false,
      })
      .where(eq(shares.id, id))
      .returning();

    return c.json(updated);
  } catch (error) {
    console.error("Error updating share:", error);
    return c.json({ error: "Failed to update share" }, 500);
  }
});

// Delete a share
app.delete("/:id", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  const { id } = c.req.param();

  try {
    // Get the share and verify ownership through file
    const share = await db.query.shares.findFirst({
      where: eq(shares.id, id),
      with: {
        file: true,
      },
    });

    if (!share) {
      return c.json({ error: "Share not found" }, 404);
    }

    if (share.file.userId !== auth.userId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    // Delete the share
    await db.delete(shares).where(eq(shares.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting share:", error);
    return c.json({ error: "Failed to delete share" }, 500);
  }
});

export default app;
