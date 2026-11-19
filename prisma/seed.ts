/* Minimal seed: guarantees the admin account exists. Never creates demo data. */
import path from "path";
import bcrypt from "bcryptjs";

const isPostgres = process.env.DATABASE_URL?.startsWith("postgresql");
let prisma: any;

async function getDb() {
  if (prisma) return prisma;

  if (isPostgres) {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../src/generated/prisma/client.js");
    const schema = new URL(process.env.DATABASE_URL!).searchParams.get("schema") || "public";
    const adapter = new PrismaPg(
      { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } },
      { schema }
    );
    prisma = new PrismaClient({ adapter });
  } else {
    const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
    const { PrismaClient } = await import("../src/generated/prisma/client.js");
    const adapter = new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL || "file:./prisma/can-desk.db",
    });
    prisma = new PrismaClient({ adapter });
  }

  return prisma;
}

async function seed() {
  const db = await getDb();
  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "admin", 12);
  await db.user.upsert({
    where: { email: "admin@canagency.cz" },
    update: {},
    create: {
      email: "admin@canagency.cz",
      passwordHash,
      name: "Filip Hauška",
      role: "ADMIN",
      hourlyRate: 1500,
    },
  });
  console.log("seed: admin ready");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => getDb().then((db: any) => db.$disconnect()));
