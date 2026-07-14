import { Hono } from "hono";
import { eq, and, ne, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { files, users } from "../db/schema.js";
import { requireAuth, requireFullScope } from "../middleware/auth.js";
import { SLUG_REGEX, deriveUniqueSlug } from "../lib/slug.js";
import { isUniqueViolation } from "../lib/db-errors.js";
import { RATE_LIMITS, checkRateLimit, tooManyRequests } from "../lib/rate-limit.js";
import { checkCreateQuota, checkUpdateQuota } from "../lib/quota.js";
import type { CreateFileInput, UpdateFileInput } from "@mdv/shared";

const app = new Hono();

const MAX_NAME_LENGTH = 255;
const MAX_CONTENT_LENGTH = 1_000_000; // ~1MB of markdown
const VALID_VISIBILITIES = new Set(["private", "public"]);

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
        slug: files.slug,
        visibility: files.visibility,
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

    const withinRate = await checkRateLimit(
      RATE_LIMITS.docCreate.name,
      auth.userId,
      RATE_LIMITS.docCreate.limit,
      RATE_LIMITS.docCreate.windowSeconds,
    );
    if (!withinRate) {
      return tooManyRequests(
        c,
        RATE_LIMITS.docCreate.windowSeconds,
        "Too many documents — slow down",
      );
    }

    const withinQuota = await checkCreateQuota(auth.userId, (body.content || "").length);
    if (!withinQuota) {
      return c.json({ error: "Storage quota exceeded" }, 403);
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

    // Changing visibility or slug shapes the public profile — that is
    // account-shaping, so docs-scope keys are refused. Name/content-only PUTs
    // stay docs-allowed. This runs before the public-visibility slug auto-derive
    // (which only triggers on visibility === "public"), so there is no bypass.
    if (body.visibility !== undefined || body.slug !== undefined) {
      const scopeError = requireFullScope(c, auth);
      if (scopeError) return scopeError;
    }

    const validationError = validateFileInput(body.name, body.content);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    if (body.slug !== undefined && !SLUG_REGEX.test(body.slug)) {
      return c.json(
        { error: "Slug must be 3-32 characters: lowercase letters, numbers, and hyphens" },
        400,
      );
    }

    if (body.visibility !== undefined && !VALID_VISIBILITIES.has(body.visibility)) {
      return c.json({ error: "Visibility must be 'private' or 'public'" }, 400);
    }

    // Only content changes affect storage; enforce the byte quota when content
    // is being replaced (the doc count is unchanged by an update).
    if (body.content !== undefined) {
      const withinQuota = await checkUpdateQuota(auth.userId, id, body.content.length);
      if (!withinQuota) {
        return c.json({ error: "Storage quota exceeded" }, 403);
      }
    }

    // Publishing publicly requires a claimed username, and the file needs a
    // slug (explicit or auto-derived from its name) before it can go public.
    let slug = body.slug;

    if (body.visibility === "public") {
      const owner = await db.query.users.findFirst({
        where: eq(users.id, auth.userId),
        columns: { username: true },
      });
      if (!owner?.username) {
        return c.json({ error: "Claim a username before publishing files publicly" }, 400);
      }

      if (slug === undefined) {
        const current = await db.query.files.findFirst({
          where: and(eq(files.id, id), eq(files.userId, auth.userId)),
          columns: { name: true, slug: true },
        });
        if (!current) {
          return c.json({ error: "File not found" }, 404);
        }
        if (!current.slug) {
          slug = await deriveUniqueSlug(auth.userId, body.name ?? current.name, id);
        }
      }
    }

    if (slug !== undefined) {
      const collision = await db.query.files.findFirst({
        where: and(eq(files.userId, auth.userId), eq(files.slug, slug), ne(files.id, id)),
        columns: { id: true },
      });
      if (collision) {
        return c.json({ error: "You already have a file with this slug" }, 409);
      }
    }

    // Update with ownership check in a single query; only allow known fields
    const [updatedFile] = await db
      .update(files)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(files.id, id), eq(files.userId, auth.userId)))
      .returning();

    if (!updatedFile) {
      return c.json({ error: "File not found" }, 404);
    }

    return c.json(updatedFile);
  } catch (error) {
    // Lost slug-uniqueness race: the pre-check passed but the UPDATE hit
    // files_user_slug_idx. Same outcome as the pre-check, not a server error.
    if (isUniqueViolation(error)) {
      return c.json({ error: "You already have a file with this slug" }, 409);
    }
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
