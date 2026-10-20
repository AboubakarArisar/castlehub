import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseUrl } from "@/lib/database-url";

// Plain postgres:// over TCP: works with Prisma Postgres and Neon alike.
// One client per server instance; reused across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: PrismaClient };

// DATABASE_POOL_MAX caps the connection pool: set it to 1 for a local `prisma dev` database,
// which serves one connection at a time. Unset in production (pg's default pool).
const max = Number(process.env.DATABASE_POOL_MAX) || undefined;

export const db =
  globalForDb.db ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl(), max }) });

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
