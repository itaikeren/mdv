import { sql } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../db/client.js";

// Postgres-backed fixed-window rate limiting. These are anti-abuse ceilings,
// not a security boundary, so every path FAILS OPEN — a DB hiccup must never
// take down commenting or publishing. Because fail-open hides a broken helper
// (it just looks like "no limits"), the live-DB 429 test is a REQUIRED gate.

// Named limits (fixed window). Tuned so a normal human or a single busy agent
// never notices; only abusive bursts hit them. windowSeconds doubles as the
// Retry-After value returned on a 429.
export const RATE_LIMITS = {
  anonComment: { name: "anon-comment", limit: 10, windowSeconds: 60 }, // per client IP
  anonCommentShare: { name: "anon-comment-share", limit: 200, windowSeconds: 3600 }, // per shareId
  comment: { name: "comment", limit: 60, windowSeconds: 60 }, // authed, per userId
  docCreate: { name: "doc-create", limit: 120, windowSeconds: 3600 }, // per userId (REST + MCP)
  keyCreate: { name: "key-create", limit: 20, windowSeconds: 3600 }, // per userId
} as const;

// Run the opportunistic expired-row sweep once every N hits on a key.
const CLEANUP_EVERY = 50;

// Returns true when the request is allowed, false when it exceeds `limit`
// within the current window. Fails open (returns true) on any DB error.
export async function checkRateLimit(
  name: string,
  id: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `${name}:${id}:${bucket}`;

  try {
    // The INSERT MUST populate expires_at (column is NOT NULL with no default);
    // to_timestamp takes the window-end epoch seconds.
    const result = await db.execute(sql`
      INSERT INTO rate_limits (key, expires_at)
      VALUES (${key}, to_timestamp(${(bucket + 1) * windowSeconds}))
      ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1
      RETURNING count
    `);
    const count = Number(result.rows[0]?.count ?? 0);

    // Opportunistic cleanup MUST be a SEPARATE statement — the Neon HTTP driver
    // rejects multi-statement queries, so never concatenate it onto the upsert.
    // Its own try/catch so a cleanup failure never affects the limit decision.
    if (count % CLEANUP_EVERY === 0) {
      try {
        await db.execute(sql`DELETE FROM rate_limits WHERE expires_at < now()`);
      } catch (cleanupError) {
        console.error("rate-limit cleanup failed:", cleanupError);
      }
    }

    return count <= limit;
  } catch (error) {
    // Fail open: availability over strictness.
    console.error("rate-limit check failed, allowing request:", error);
    return true;
  }
}

// Best-effort client IP for anonymous rate limiting. Vercel sets
// x-forwarded-for; "unknown" lumps local-dev callers together (acceptable).
export function clientIp(c: Context): string {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Build a 429 with a Retry-After header (window seconds). Shared so the header
// is never forgotten on a rate-limited REST response.
export function tooManyRequests(c: Context, windowSeconds: number, message: string) {
  c.header("Retry-After", String(windowSeconds));
  return c.json({ error: message }, 429);
}
