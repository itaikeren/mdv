import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { files, users } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import type { CreateFileInput, UpdateFileInput } from "@markdown-viewer/shared";

const app = new Hono();

const MAX_NAME_LENGTH = 255;
const MAX_CONTENT_LENGTH = 1_000_000; // ~1MB of markdown

function validateFileInput(name: string | undefined, content: string | undefined): string | null {
  if (name !== undefined && (name.trim().length === 0 || name.length > MAX_NAME_LENGTH)) {
    return `Name must be between 1 and ${MAX_NAME_LENGTH} characters`;
  }
  if (content !== undefined && content.length > MAX_CONTENT_LENGTH) {
    return "File content is too large";
  }
  return null;
}

// Get all files for the authenticated user (metadata only - content is fetched per file)
app.get("/", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  try {
    const userFiles = await db
      .select({
        id: files.id,
        userId: files.userId,
        name: files.name,
        createdAt: files.createdAt,
        updatedAt: files.updatedAt,
      })
      .from(files)
      .where(eq(files.userId, auth.userId))
      .orderBy(desc(files.createdAt));

    return c.json(userFiles);
  } catch (error) {
    console.error("Error fetching files:", error);
    return c.json({ error: "Failed to fetch files" }, 500);
  }
});

// Get a single file
app.get("/:id", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  const { id } = c.req.param();

  try {
    const file = await db.query.files.findFirst({
      where: and(eq(files.id, id), eq(files.userId, auth.userId)),
    });

    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }

    return c.json(file);
  } catch (error) {
    console.error("Error fetching file:", error);
    return c.json({ error: "Failed to fetch file" }, 500);
  }
});

// Create a new file
app.post("/", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  try {
    const body = await c.req.json<CreateFileInput>();

    // Name is required on create; pass "" so a missing name fails validation
    const validationError = validateFileInput(body.name ?? "", body.content);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    // Ensure user exists in database
    await db
      .insert(users)
      .values({
        id: auth.userId,
        email: auth.email ?? "",
      })
      .onConflictDoNothing();

    // Create the file
    const [newFile] = await db
      .insert(files)
      .values({
        userId: auth.userId,
        name: body.name,
        content: body.content || "",
      })
      .returning();

    return c.json(newFile, 201);
  } catch (error) {
    console.error("Error creating file:", error);
    return c.json({ error: "Failed to create file" }, 500);
  }
});

// Update a file
app.put("/:id", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  const { id } = c.req.param();

  try {
    const body = await c.req.json<UpdateFileInput>();

    const validationError = validateFileInput(body.name, body.content);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    // Update with ownership check in a single query; only allow known fields
    const [updatedFile] = await db
      .update(files)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(files.id, id), eq(files.userId, auth.userId)))
      .returning();

    if (!updatedFile) {
      return c.json({ error: "File not found" }, 404);
    }

    return c.json(updatedFile);
  } catch (error) {
    console.error("Error updating file:", error);
    return c.json({ error: "Failed to update file" }, 500);
  }
});

// Delete a file
app.delete("/:id", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  const { id } = c.req.param();

  try {
    // Delete with ownership check in a single query (shares will be cascade deleted)
    const [deletedFile] = await db
      .delete(files)
      .where(and(eq(files.id, id), eq(files.userId, auth.userId)))
      .returning({ id: files.id });

    if (!deletedFile) {
      return c.json({ error: "File not found" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return c.json({ error: "Failed to delete file" }, 500);
  }
});

export default app;
