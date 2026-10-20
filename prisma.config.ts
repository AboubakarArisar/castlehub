import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { databaseUrl } from "./src/lib/database-url";

// Same files Next.js reads: `vercel env pull` writes .env.local.
config({ path: [".env.local", ".env"], quiet: true });

// Migrations use a direct (unpooled) connection when one is provided.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || databaseUrl(),
  },
});
