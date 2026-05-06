import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { files, shares } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import type { CreateShareInput } from "@markdown-viewer/shared";

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
    const share = await db.query.shares.findFirst({
      where: eq(shares.shareToken, token),
      with: {
        file: true,
      },
    });

    if (!share) {
      return c.json({ error: "Share not found" }, 404);
    }

    // Check if share has expired
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return c.json({ error: "Share has expired" }, 410);
    }

    // Increment view count
    await db
      .update(shares)
      .set({
        viewCount: sql`${shares.viewCount} + 1`,
      })
      .where(eq(shares.shareToken, token));

    return c.json({
      file: share.file,
      shareId: share.id,
      commentsEnabled: share.commentsEnabled,
      allowAnonymousComments: share.allowAnonymousComments,
      viewCount: share.viewCount + 1,
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
