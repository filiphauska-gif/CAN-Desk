import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL;
  const isPostgres = dbUrl?.startsWith("postgresql");

  if (isPostgres) {
    // Vercel / Production — PostgreSQL via Neon
    const { PrismaNeon } = require("@prisma/adapter-neon");
    const { Pool } = require("@neondatabase/serverless");
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter });
  }

  // Local development — SQLite
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const url = dbUrl || "file:./prisma/can-desk.db";
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
