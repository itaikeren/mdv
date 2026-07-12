import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";
import { StreamableHTTPTransport } from "@hono/mcp";
import { authenticateApiKey, clerkMiddleware } from "./middleware/auth.js";
import { createMcpServer } from "./mcp/server.js";
import filesRoutes from "./routes/files.js";
import sharesRoutes from "./routes/shares.js";
import commentsRoutes from "./routes/comments.js";
import rawRoutes from "./routes/raw.js";
import apiKeysRoutes from "./routes/api-keys.js";
import usersRoutes from "./routes/users.js";
import publicRoutes from "./routes/public.js";

// API sub-app, mounted at /api on the root app below. A separate root app
// exists so the pretty raw URL (/raw/:token) can be served OUTSIDE the /api
// prefix: Vercel rewrites don't cascade, so /raw/:token is rewritten straight
// to this function with its original path and must be matched at the top level.
const app = new Hono();

// The app is served same-origin (Vercel rewrites in prod, vite proxy in dev),
// so cross-origin access is limited to localhost plus an explicit allowlist.
// Reflecting arbitrary origins with credentials would let any website make
// authenticated requests on behalf of a signed-in user.
const LOCALHOST_ORIGIN = /^http:\/\/localhost(:\d+)?$/;
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (LOCALHOST_ORIGIN.test(origin) || allowedOrigins.includes(origin)) {
        return origin;
      }
      return null;
    },
    credentials: true,
  }),
);
app.use("*", clerkMiddleware());

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.route("/files", filesRoutes);
app.route("/shares", sharesRoutes);
app.route("/comments", commentsRoutes);
app.route("/raw", rawRoutes);
app.route("/keys", apiKeysRoutes);
app.route("/users", usersRoutes);
app.route("/u", publicRoutes);

// MCP endpoint (Streamable HTTP): agents authenticate with an API-key bearer
// token. A fresh, stateless server + transport is built per request.
app.all("/mcp", async (c) => {
  const auth = await authenticateApiKey(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401, { "WWW-Authenticate": "Bearer" });
  }

  const server = createMcpServer(auth, c);
  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: undefined, // stateless: no session ids
    enableJsonResponse: true,
  });
  await server.connect(transport);

  const response = await transport.handleRequest(c);
  return response ?? c.body(null, 202);
});

// Root app: the API under /api, plus the pretty public raw URL at /raw.
const root = new Hono();
root.route("/api", app);
root.route("/raw", rawRoutes);

// Export for Vercel Functions
export const GET = handle(root);
export const POST = handle(root);
export const PUT = handle(root);
export const DELETE = handle(root);
export const PATCH = handle(root);

// For local development
export default root;
