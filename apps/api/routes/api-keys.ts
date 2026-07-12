import { Hono } from "hono";
import type { Context } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { apiKeys, users } from "../db/schema.js";
import { generateApiKey, requireAuth, type AuthContext } from "../middleware/auth.js";
import type { CreateApiKeyInput } from "@markdown-viewer/shared";

const app = new Hono();

const MAX_KEY_NAME_LENGTH = 100;

// Managing keys is a human-only action: a key must not be able to mint or
// revoke keys. requireAuth accepts bearer keys, so reject them explicitly.
function rejectApiKeyAuth(c: Context, auth: AuthContext) {
  if (auth.viaApiKey) {
    return c.json({ error: "API keys cannot manage API keys" }, 403);
  }
  return null;
}

// List the caller's keys (never the hash).
app.get("/", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  const rejected = rejectApiKeyAuth(c, auth);
  if (rejected) return rejected;

  try {
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, auth.userId))
      .orderBy(desc(apiKeys.createdAt));

    return c.json(keys);
  } catch (err) {
    console.error("Error fetching API keys:", err);
    return c.json({ error: "Failed to fetch API keys" }, 500);
  }
});

// Create a key. Returns the plaintext exactly once.
app.post("/", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  const rejected = rejectApiKeyAuth(c, auth);
  if (rejected) return rejected;

  try {
    const body = await c.req.json<CreateApiKeyInput>();
    const name = body.name?.trim();

    if (!name) {
      return c.json({ error: "Key name is required" }, 400);
    }
    if (name.length > MAX_KEY_NAME_LENGTH) {
      return c.json({ error: `Key name must be ${MAX_KEY_NAME_LENGTH} characters or less` }, 400);
    }

    // Upsert the user with their real email so bearer auth (which reads
    // users.email) resolves a proper identity. The lazy files.ts upsert often
    // stores "" because default Clerk session tokens carry no email claim.
    const clerkUser = await c.get("clerk").users.getUser(auth.userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    if (email) {
      await db
        .insert(users)
        .values({ id: auth.userId, email })
        .onConflictDoUpdate({ target: users.id, set: { email } });
    } else {
      // No email on the Clerk account: never overwrite a previously-good one.
      await db.insert(users).values({ id: auth.userId, email }).onConflictDoNothing();
    }

    const { key, prefix, hash } = await generateApiKey();

    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        userId: auth.userId,
        name,
        keyHash: hash,
        keyPrefix: prefix,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
      });

    return c.json({ key, apiKey }, 201);
  } catch (err) {
    console.error("Error creating API key:", err);
    return c.json({ error: "Failed to create API key" }, 500);
  }
});

// Revoke a key (ownership enforced via the WHERE clause).
app.delete("/:id", async (c) => {
  const { error, auth } = await requireAuth(c);
  if (error) return error;

  const rejected = rejectApiKeyAuth(c, auth);
  if (rejected) return rejected;

  const { id } = c.req.param();

  try {
    const [deleted] = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, auth.userId)))
      .returning({ id: apiKeys.id });

    if (!deleted) {
      return c.json({ error: "API key not found" }, 404);
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("Error deleting API key:", err);
    return c.json({ error: "Failed to delete API key" }, 500);
  }
});

export default app;
