import { Hono } from "hono";
import { eq, and, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { requireAuth, requireFullScope } from "../middleware/auth.js";
import { SLUG_REGEX } from "../lib/slug.js";
import { isUniqueViolation } from "../lib/db-errors.js";

const app = new Hono();

// Top-level path segments already claimed by the app's own routes - a
// username here would collide with e.g. /u/api or /u/mcp.
const RESERVED_USERNAMES = new Set([
  "api",
  "raw",
  "share",
  "u",
  "admin",
  "settings",
  "login",
  "signup",
  "files",
  "keys",
  "mcp",
]);

// Ensure a users row exists for this caller without ever clobbering an
// existing email (mirrors the lazy-upsert pattern used by files.ts/comments.ts).
async function ensureUserRow(userId: string, email: string | null): Promise<void> {
  await db
    .insert(users)
    .values({ id: userId, email: email ?? "" })
    .onConflictDoNothing();
}

// Get the caller's own profile.
app.get("/me", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  try {
    await ensureUserRow(auth.userId, auth.email);

    const user = await db.query.users.findFirst({
      where: eq(users.id, auth.userId),
    });

    return c.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    return c.json({ error: "Failed to fetch user" }, 500);
  }
});

// Claim or change the caller's username.
app.patch("/me", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  // Claiming a username is account-shaping — docs-scope keys are refused.
  const scopeError = requireFullScope(c, auth);
  if (scopeError) return scopeError;

  try {
    const body = await c.req.json<{ username?: string }>();
    const username = body.username?.trim();

    if (!username) {
      return c.json({ error: "Username is required" }, 400);
    }
    if (!SLUG_REGEX.test(username)) {
      return c.json(
        {
          error:
            "Username must be 3-32 characters: lowercase letters, numbers, and hyphens, and can't start or end with a hyphen",
        },
        400,
      );
    }
    if (RESERVED_USERNAMES.has(username)) {
      return c.json({ error: "This username is reserved" }, 400);
    }

    await ensureUserRow(auth.userId, auth.email);

    const existing = await db.query.users.findFirst({
      where: and(eq(users.username, username), ne(users.id, auth.userId)),
      columns: { id: true },
    });
    if (existing) {
      return c.json({ error: "Username is already taken" }, 409);
    }

    const [updated] = await db
      .update(users)
      .set({ username })
      .where(eq(users.id, auth.userId))
      .returning();

    return c.json(updated);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: "Username is already taken" }, 409);
    }
    console.error("Error updating username:", err);
    return c.json({ error: "Failed to update username" }, 500);
  }
});

export default app;
