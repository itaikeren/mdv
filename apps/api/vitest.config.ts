import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    env: {
      // Several modules construct the Drizzle/Neon client at import time and throw
      // without DATABASE_URL. The neon-http driver is lazy — it builds a fetch-based
      // query function and opens no connection until a query runs — so a dummy URL
      // lets those modules import in tests without touching a network.
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
  },
});
