import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseUrl } from "@/lib/database-url";

// Plain postgres:// over TCP: works with Prisma Postgres and Neon alike.
// One client per server instance; reused across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: PrismaClient };

export const db =
  globalForDb.db ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl() }) });

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
