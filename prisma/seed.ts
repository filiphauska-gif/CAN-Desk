import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const dbPath =
  process.env.DATABASE_URL?.replace("file:", "") || "./prisma/can-desk.db";
const resolvedPath = path.resolve(process.cwd(), dbPath);
const connection = new Database(resolvedPath);
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function seed() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@canagency.cz" },
    update: { name: "Adam Admin", role: "ADMIN" },
    create: { email: "admin@canagency.cz", passwordHash, name: "Adam Admin", role: "ADMIN", hourlyRate: 1500 },
  });
  const finance = await prisma.user.upsert({
    where: { email: "finance@canagency.cz" },
    update: { name: "František Finance", role: "FINANCE" },
    create: { email: "finance@canagency.cz", passwordHash, name: "František Finance", role: "FINANCE", hourlyRate: 1200 },
  });
  const account = await prisma.user.upsert({
    where: { email: "account@canagency.cz" },
    update: { name: "Filip Account", role: "ACCOUNT_MANAGER" },
    create: { email: "account@canagency.cz", passwordHash, name: "Filip Account", role: "ACCOUNT_MANAGER", hourlyRate: 1300 },
  });
  const pm = await prisma.user.upsert({
    where: { email: "pm@canagency.cz" },
    update: { name: "Petra Projektová", role: "PROJECT_MANAGER" },
    create: { email: "pm@canagency.cz", passwordHash, name: "Petra Projektová", role: "PROJECT_MANAGER", hourlyRate: 1100 },
  });
  const kreativec = await prisma.user.upsert({
    where: { email: "kreativec@canagency.cz" },
    update: { name: "Karel Kreativní", role: "KREATIVEC" },
    create: { email: "kreativec@canagency.cz", passwordHash, name: "Karel Kreativní", role: "KREATIVEC", hourlyRate: 900 },
  });
  const produkcni = await prisma.user.upsert({
    where: { email: "produkcni@canagency.cz" },
    update: { name: "Petr Produkční", role: "PRODUKCNI" },
    create: { email: "produkcni@canagency.cz", passwordHash, name: "Petr Produkční", role: "PRODUKCNI", hourlyRate: 800 },
  });

  const client1 = await prisma.client.upsert({
    where: { id: "client-1" }, update: { name: "AutoMotiva s.r.o." },
    create: { id: "client-1", name: "AutoMotiva s.r.o.", email: "info@automotiva.cz", phone: "+420 777 111 222", contactName: "Jan Novák", note: "Pravidelný klient" },
  });
  const client2 = await prisma.client.upsert({
    where: { id: "client-2" }, update: { name: "FreshFood Brands" },
    create: { id: "client-2", name: "FreshFood Brands", email: "marketing@freshfood.cz", phone: "+420 777 333 444", contactName: "Eva Svobodová" },
  });
  const client3 = await prisma.client.upsert({
    where: { id: "client-3" }, update: { name: "TechVision Czech" },
    create: { id: "client-3", name: "TechVision Czech", email: "hello@techvision.cz", contactName: "Tomáš Krátký" },
  });

  const p1 = await prisma.project.upsert({
    where: { id: "project-1" }, update: { name: "Jarní kampaň AutoMotiva" },
    create: { id: "project-1", name: "Jarní kampaň AutoMotiva", description: "Komplexní kampaň zahrnující TV, rádio, sociální sítě a OOH.", status: "BEZI", clientId: client1.id, accountId: account.id, deadline: new Date("2026-04-30"), budgetAmount: 850000, budgetHours: 120 },
  });
  await prisma.project.upsert({
    where: { id: "project-2" }, update: {},
    create: { id: "project-2", name: "Redesign obalů FreshFood", status: "V_PRIPRAVE", clientId: client2.id, accountId: account.id, deadline: new Date("2026-05-15"), budgetAmount: 450000, budgetHours: 80 },
  });
  await prisma.project.upsert({
    where: { id: "project-3" }, update: {},
    create: { id: "project-3", name: "TechVision korporátní video", status: "CEKA_NA_KLIENTA", clientId: client3.id, accountId: account.id, deadline: new Date("2026-03-20"), budgetAmount: 320000, budgetHours: 60 },
  });
  await prisma.project.upsert({
    where: { id: "project-4" }, update: {},
    create: { id: "project-4", name: "Sociální sítě AutoMotiva - Q1", status: "BEZI", clientId: client1.id, accountId: account.id, deadline: new Date("2026-03-31"), budgetAmount: 180000, budgetHours: 40 },
  });

  await prisma.task.upsert({ where: { id: "task-1" }, update: {}, create: { id: "task-1", title: "Napsat kreativní brief", status: "DONE", priority: 1, projectId: p1.id, assigneeId: account.id, deadline: new Date("2026-03-05") } });
  await prisma.task.upsert({ where: { id: "task-2" }, update: {}, create: { id: "task-2", title: "Navrhnout 3 varianty vizuálu", status: "IN_PROGRESS", priority: 2, projectId: p1.id, assigneeId: kreativec.id, deadline: new Date("2026-03-15"), estimatedHours: 16 } });
  await prisma.task.upsert({ where: { id: "task-5" }, update: {}, create: { id: "task-5", title: "Připravit harmonogram kampaně", status: "TODO", priority: 1, projectId: p1.id, assigneeId: pm.id, deadline: new Date("2026-03-12"), estimatedHours: 4 } });

  // Use createMany without skipDuplicates — fresh DB only
  // If re-running, these may fail and that's ok
  try {
    await prisma.comment.create({
      data: { id: "comment-1", content: "Klient poslal dodatečné podklady.", projectId: p1.id, authorId: account.id },
    });
  } catch {}
  try {
    await prisma.comment.create({
      data: { id: "comment-3", content: "Čekáme na podpis klienta.", projectId: "project-2", authorId: account.id },
    });
  } catch {}
  try {
    await prisma.timeEntry.create({
      data: { id: "time-1", date: new Date("2026-03-01"), hours: 3.5, description: "Zpracování briefu", billable: true, projectId: p1.id, userId: account.id },
    });
  } catch {}
  try {
    await prisma.timeEntry.create({
      data: { id: "time-2", date: new Date("2026-03-02"), hours: 2, description: "Rekerše", billable: true, projectId: p1.id, userId: kreativec.id },
    });
  } catch {}
  try {
    await prisma.cost.create({
      data: { id: "cost-1", description: "Stock fotografie", amount: 8500, type: "EXTERNAL", projectId: p1.id },
    });
  } catch {}
  try {
    await prisma.cost.create({
      data: { id: "cost-2", description: "Grafický design", amount: 15000, type: "INTERNAL", projectId: p1.id },
    });
  } catch {}

  console.log("✅ Seed completed");
}

seed().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
