import path from "path";
import bcrypt from "bcryptjs";

const isPostgres = process.env.DATABASE_URL?.startsWith("postgresql");

let prisma: any;

async function getDb() {
  if (prisma) return prisma;

  if (isPostgres) {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../src/generated/prisma/client.js");
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    prisma = new PrismaClient({ adapter });
  } else {
    const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
    const Database = await import("better-sqlite3");
    const { PrismaClient } = await import("../src/generated/prisma/client.js");
    const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./prisma/can-desk.db";
    const resolvedPath = path.resolve(process.cwd(), dbPath);
    const connection = new Database.default(resolvedPath);
    const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./prisma/can-desk.db" });
    prisma = new PrismaClient({ adapter });
  }

  return prisma;
}

async function seed() {
  const db = await getDb();
  const passwordHash = await bcrypt.hash("admin123", 12);

  const admin = await db.user.upsert({ where: { email: "admin@canagency.cz" }, update: {}, create: { email: "admin@canagency.cz", passwordHash, name: "Adam Admin", role: "ADMIN", hourlyRate: 1500 } });
  await db.user.upsert({ where: { email: "finance@canagency.cz" }, update: {}, create: { email: "finance@canagency.cz", passwordHash, name: "František Finance", role: "FINANCE", hourlyRate: 1200 } });
  await db.user.upsert({ where: { email: "account@canagency.cz" }, update: {}, create: { email: "account@canagency.cz", passwordHash, name: "Filip Account", role: "ACCOUNT_MANAGER", hourlyRate: 1300 } });
  await db.user.upsert({ where: { email: "pm@canagency.cz" }, update: {}, create: { email: "pm@canagency.cz", passwordHash, name: "Petra Projektová", role: "PROJECT_MANAGER", hourlyRate: 1100 } });
  await db.user.upsert({ where: { email: "kreativec@canagency.cz" }, update: {}, create: { email: "kreativec@canagency.cz", passwordHash, name: "Karel Kreativní", role: "KREATIVEC", hourlyRate: 900 } });
  await db.user.upsert({ where: { email: "produkcni@canagency.cz" }, update: {}, create: { email: "produkcni@canagency.cz", passwordHash, name: "Petr Produkční", role: "PRODUKCNI", hourlyRate: 800 } });

  const c1 = await db.client.upsert({ where: { id: "client-1" }, update: {}, create: { id: "client-1", name: "AutoMotiva s.r.o.", email: "info@automotiva.cz", contactName: "Jan Novák" } });
  const c2 = await db.client.upsert({ where: { id: "client-2" }, update: {}, create: { id: "client-2", name: "FreshFood Brands", email: "marketing@freshfood.cz", contactName: "Eva Svobodová" } });
  const c3 = await db.client.upsert({ where: { id: "client-3" }, update: {}, create: { id: "client-3", name: "TechVision Czech", email: "hello@techvision.cz", contactName: "Tomáš Krátký" } });

  const p1 = await db.project.upsert({ where: { id: "project-1" }, update: {}, create: { id: "project-1", name: "Jarní kampaň AutoMotiva", status: "BEZI", clientId: c1.id, deadline: new Date("2026-04-30"), budgetAmount: 850000 } });
  await db.project.upsert({ where: { id: "project-2" }, update: {}, create: { id: "project-2", name: "Redesign obalů FreshFood", status: "V_PRIPRAVE", clientId: c2.id, deadline: new Date("2026-05-15"), budgetAmount: 450000 } });
  await db.project.upsert({ where: { id: "project-3" }, update: {}, create: { id: "project-3", name: "TechVision korporátní video", status: "CEKA_NA_KLIENTA", clientId: c3.id, deadline: new Date("2026-03-20"), budgetAmount: 320000 } });
  await db.project.upsert({ where: { id: "project-4" }, update: {}, create: { id: "project-4", name: "Sociální sítě AutoMotiva - Q1", status: "BEZI", clientId: c1.id, deadline: new Date("2026-03-31"), budgetAmount: 180000 } });

  await db.task.upsert({ where: { id: "task-1" }, update: {}, create: { id: "task-1", title: "Napsat kreativní brief", status: "DONE", projectId: p1.id, deadline: new Date("2026-03-05") } });
  await db.task.upsert({ where: { id: "task-2" }, update: {}, create: { id: "task-2", title: "Navrhnout 3 varianty", status: "IN_PROGRESS", projectId: p1.id, deadline: new Date("2026-03-15") } });

  await db.budgetDocument.upsert({ where: { id: "budget-1" }, update: {}, create: { id: "budget-1", documentNumber: "N-2026-0001", title: "Rozpočet - Jarní kampaň", clientId: c1.id, projectId: p1.id, ownerId: admin.id, status: "SCHVALENO", specificationHtml: "<p>Komplexní kampaň zahrnující TV, rádio, sociální sítě.</p>" } });

  console.log("✅ Seed completed for", isPostgres ? "PostgreSQL" : "SQLite");
  console.log("  Users: 6 | Clients: 3 | Projects: 4 | Tasks: 2");
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma?.$disconnect());
