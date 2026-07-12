import { clerkMiddleware, getAuth as clerkGetAuth } from "@hono/clerk-auth";
import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { apiKeys, users } from "../db/schema.js";

export { clerkMiddleware };

// All API keys start with this prefix so a bearer token can be routed to key
// auth vs. a Clerk session JWT without a database lookup.
export const API_KEY_PREFIX = "mdv_";

// Normalized identity for a request, regardless of whether it authenticated via
// a Clerk session or a long-lived API key.
export interface AuthContext {
  userId: string;
  email: string | null;
  viaApiKey: boolean;
}

// sha256 hex of the full key. Only the hash is ever stored; plaintext is shown
// once at creation and never persisted.
async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generate a new key (`mdv_` + 32 random bytes base64url), its display prefix
// (first 12 chars), and its sha256 hex. Only prefix + hash are stored.
export async function generateApiKey(): Promise<{ key: string; prefix: string; hash: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = `${API_KEY_PREFIX}${Buffer.from(bytes).toString("base64url")}`;
  const prefix = key.slice(0, 12);
  const hash = await hashApiKey(key);
  return { key, prefix, hash };
}

// Extract a `mdv_...` bearer token from the Authorization header, or null when
// the header is absent or carries a non-key bearer (e.g. a Clerk session JWT).
function extractApiKey(c: Context): string | null {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.startsWith(API_KEY_PREFIX) ? token : null;
}

// Resolve an API-key bearer token to an AuthContext, or null when there is no
// key or it does not match a stored key. Exported for reuse by the MCP server.
export async function authenticateApiKey(c: Context): Promise<AuthContext | null> {
  const key = extractApiKey(c);
  if (!key) return null;

  const keyHash = await hashApiKey(key);

  const [row] = await db
    .select({ userId: apiKeys.userId, email: users.email })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!row) return null;

  // Await the update: un-awaited promises can be frozen when a Vercel function
  // returns before they settle, so lastUsedAt would silently never persist.
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.keyHash, keyHash));

  return {
    userId: row.userId,
    email: row.email || "agent",
    viaApiKey: true,
  };
}

// Require authentication. Tries API-key bearer first, then a Clerk session.
// Returns the same `{ error, auth }` contract used by every protected route.
export async function requireAuth(c: Context) {
  const apiKeyAuth = await authenticateApiKey(c);
  if (apiKeyAuth) {
    return { error: null, auth: apiKeyAuth };
  }

  const clerkAuth = clerkGetAuth(c);
  if (!clerkAuth?.userId) {
    return { error: c.json({ error: "Unauthorized" }, 401), auth: null };
  }

  const auth: AuthContext = {
    userId: clerkAuth.userId,
    email: (clerkAuth.sessionClaims?.email as string) ?? null,
    viaApiKey: false,
  };
  return { error: null, auth };
}

// Optional authentication for endpoints that also serve anonymous callers.
// API-key bearer first, then a Clerk session, else null.
export async function getOptionalAuth(c: Context): Promise<AuthContext | null> {
  const apiKeyAuth = await authenticateApiKey(c);
  if (apiKeyAuth) return apiKeyAuth;

  const clerkAuth = clerkGetAuth(c);
  if (clerkAuth?.userId) {
    return {
      userId: clerkAuth.userId,
      email: (clerkAuth.sessionClaims?.email as string) ?? null,
      viaApiKey: false,
    };
  }

  return null;
}
