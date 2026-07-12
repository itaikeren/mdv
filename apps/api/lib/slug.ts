import { and, eq, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { files } from "../db/schema.js";

// Shared charset for both usernames and file slugs: lowercase letters,
// digits, and internal hyphens; can't start or end with a hyphen. Length
// 3-32 by design (deliberate - keeps 1-2 char handles reserved).
export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/;

export function isValidSlug(value: string): boolean {
  return SLUG_REGEX.test(value);
}

const MAX_SLUG_LENGTH = 32;

// Derive a slug candidate from a file name: lowercase, non-alnum runs
// collapsed to a single hyphen, trimmed, capped at the max length, and
// padded if the result is shorter than SLUG_REGEX allows.
export function slugify(name: string): string {
  let base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base.length > MAX_SLUG_LENGTH) {
    base = base.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  }
  if (base.length < 3) {
    base = (base || "file").padEnd(3, "0");
  }
  return base;
}

// Derive a slug from `name` that is unique among `userId`'s files, appending
// "-2", "-3", ... on collision. `excludeFileId` lets a file being republished
// ignore its own current row.
export async function deriveUniqueSlug(
  userId: string,
  name: string,
  excludeFileId: string,
): Promise<string> {
  const base = slugify(name);
  let candidate = base;

  // Bounded rather than unconditional: guarantees termination even if this
  // user somehow already owns thousands of colliding slugs.
  for (let suffix = 2; suffix < 10_000; suffix++) {
    const collision = await db.query.files.findFirst({
      where: and(eq(files.userId, userId), eq(files.slug, candidate), ne(files.id, excludeFileId)),
      columns: { id: true },
    });
    if (!collision) return candidate;

    const suffixStr = `-${suffix}`;
    candidate = `${base.slice(0, MAX_SLUG_LENGTH - suffixStr.length)}${suffixStr}`;
  }

  // Astronomically unlikely fallback: fold in part of a random id.
  return `${base.slice(0, MAX_SLUG_LENGTH - 9)}-${crypto.randomUUID().slice(0, 8)}`;
}
