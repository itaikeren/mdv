import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { files, users } from "../db/schema.js";

const app = new Hono();

// Public profile: username + metadata for their public files. No auth.
app.get("/:username", async (c) => {
  const { username } = c.req.param();

  try {
    const owner = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: { username: true },
    });

    if (!owner?.username) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const publicFiles = await db
      .select({
        id: files.id,
        name: files.name,
        slug: files.slug,
        updatedAt: files.updatedAt,
      })
      .from(files)
      .innerJoin(users, eq(files.userId, users.id))
      .where(and(eq(users.username, username), eq(files.visibility, "public")))
      .orderBy(desc(files.updatedAt));

    return c.json({ username: owner.username, files: publicFiles });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

// Full public file by username + slug. No auth. 404 for unknown or private.
app.get("/:username/:slug", async (c) => {
  const { username, slug } = c.req.param();

  try {
    const [row] = await db
      .select({
        id: files.id,
        name: files.name,
        slug: files.slug,
        content: files.content,
        updatedAt: files.updatedAt,
      })
      .from(files)
      .innerJoin(users, eq(files.userId, users.id))
      .where(
        and(eq(users.username, username), eq(files.slug, slug), eq(files.visibility, "public")),
      )
      .limit(1);

    if (!row || !row.slug) {
      return c.json({ error: "File not found" }, 404);
    }

    return c.json({
      id: row.id,
      name: row.name,
      slug: row.slug,
      content: row.content,
      updatedAt: row.updatedAt,
      authorUsername: username,
    });
  } catch (error) {
    console.error("Error fetching public file:", error);
    return c.json({ error: "Failed to fetch public file" }, 500);
  }
});

export default app;
