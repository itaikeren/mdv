import { serve } from "@hono/node-server";
import app from "./index.js";

const port = 3000;

console.log(`🚀 API Server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
