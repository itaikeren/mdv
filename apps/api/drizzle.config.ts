import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local from monorepo root
config({ path: "../../.env.local" });

// The dev and prod databases are separate Neon branches. `pnpm db:push`
// targets the dev branch (DATABASE_URL); `pnpm db:push:prod` sets
// DB_TARGET=prod to target the production branch (DATABASE_URL_PROD).
const urlVar = process.env.DB_TARGET === "prod" ? "DATABASE_URL_PROD" : "DATABASE_URL";
const url = process.env[urlVar];

if (!url) {
  throw new Error(`${urlVar} is not set in .env.local`);
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
