import { serve } from "@hono/node-server";
import app from "./index.js";

const port = Number(process.env.PORT) || 3000;

console.log(`🚀 API Server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
