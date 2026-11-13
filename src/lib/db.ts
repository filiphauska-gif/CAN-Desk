import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL;
  const isPostgres = dbUrl?.startsWith("postgresql");

  if (isPostgres) {
    // Neon (Vercel) → serverless driver
    if (dbUrl!.includes("neon.tech")) {
      const { PrismaNeon } = require("@prisma/adapter-neon");
      const { Pool } = require("@neondatabase/serverless");
      const pool = new Pool({ connectionString: dbUrl });
      return new PrismaClient({ adapter: new PrismaNeon(pool) });
    }
    // Any other Postgres (Supabase, ...) → generic pg driver
    const { PrismaPg } = require("@prisma/adapter-pg");
    const { Pool } = require("pg");
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: dbUrl!.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
    });
    return new PrismaClient({ adapter: new PrismaPg(pool) });
  }

  // Local development — SQLite
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const url = dbUrl || "file:./prisma/can-desk.db";
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
