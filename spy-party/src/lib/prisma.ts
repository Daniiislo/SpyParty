import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 no longer reads the connection URL from schema.prisma — the runtime
// client must be given a *driver adapter*. We use node-postgres via
// `@prisma/adapter-pg`, which works with any Postgres on the Node runtime
// (Supabase, Neon, RDS, local). `DATABASE_URL` comes from `.env.local`; for a
// pooled host point it at the POOLED connection (migrations use `DIRECT_URL`
// through prisma.config.ts).
const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

// In dev, Next.js re-evaluates modules on every hot reload. Without caching the
// instance on `globalThis`, each reload would spin up a fresh client (and a new
// connection pool) and quickly exhaust the database's connection limit. In
// production a single module instance is fine, so we don't cache there.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
