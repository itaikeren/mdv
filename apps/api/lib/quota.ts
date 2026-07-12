import { sql } from "drizzle-orm";
import { db } from "../db/client.js";

// Per-user storage ceilings. Generous enough that a normal user or a busy agent
// never hits them; they exist to bound runaway automation and abuse.
export const MAX_DOCS_PER_USER = 1000;
export const MAX_TOTAL_BYTES_PER_USER = 100_000_000; // 100 MB of markdown

interface Usage {
  docCount: number;
  totalBytes: number;
}

async function getUsage(userId: string): Promise<Usage> {
  const result = await db.execute(sql`
    SELECT count(*) AS doc_count, coalesce(sum(length(content)), 0) AS total_bytes
    FROM files WHERE user_id = ${userId}
  `);
  const row = result.rows[0];
  return {
    docCount: Number(row?.doc_count ?? 0),
    totalBytes: Number(row?.total_bytes ?? 0),
  };
}

// Quota check for CREATING a document: both the doc count and the byte total
// must stay within budget once this document is added.
export async function checkCreateQuota(userId: string, newContentLength: number): Promise<boolean> {
  const { docCount, totalBytes } = await getUsage(userId);
  if (docCount + 1 > MAX_DOCS_PER_USER) return false;
  if (totalBytes + newContentLength > MAX_TOTAL_BYTES_PER_USER) return false;
  return true;
}

// Quota check for UPDATING a document's content: only the byte total is
// enforced (an update never changes the doc count). We exclude the file being
// updated and add its NEW length, so the old content isn't double-counted and
// shrinking an over-budget file is never wrongly blocked.
export async function checkUpdateQuota(
  userId: string,
  fileId: string,
  newContentLength: number,
): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT coalesce(sum(length(content)), 0) AS total_bytes
    FROM files WHERE user_id = ${userId} AND id <> ${fileId}
  `);
  const otherBytes = Number(result.rows[0]?.total_bytes ?? 0);
  return otherBytes + newContentLength <= MAX_TOTAL_BYTES_PER_USER;
}
