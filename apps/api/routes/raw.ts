import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { shares } from "../db/schema.js";

const app = new Hono();

// Get shared file as raw markdown (PUBLIC - no auth required)
// Does not increment viewCount, so agent fetches don't inflate human view stats.
app.get("/:token", async (c) => {
  const { token } = c.req.param();

  try {
    const share = await db.query.shares.findFirst({
      where: eq(shares.shareToken, token),
      with: { file: true },
    });

    if (!share) {
      return c.text("Not found", 404);
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      return c.text("Share has expired", 410);
    }

    return c.text(share.file.content, 200, {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Document-Name": encodeURIComponent(share.file.name),
    });
  } catch (error) {
    console.error("Error fetching raw share:", error);
    return c.text("Failed to fetch shared file", 500);
  }
});

export default app;
