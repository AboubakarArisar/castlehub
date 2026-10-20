// The Vercel Prisma Postgres integration may add a project prefix
// (castlehub_DATABASE_URL, castlehub_POSTGRES_URL). Use the first plain
// postgres:// URL found; the prisma+postgres:// Accelerate URL needs a
// different client setup and is skipped.
const CANDIDATES = ["DATABASE_URL", "castlehub_DATABASE_URL", "castlehub_POSTGRES_URL", "POSTGRES_URL"];

export function databaseUrl(env: Record<string, string | undefined> = process.env) {
  for (const key of CANDIDATES) {
    const value = env[key];
    if (value && /^postgres(ql)?:\/\//.test(value)) return value;
  }
  return undefined;
}
