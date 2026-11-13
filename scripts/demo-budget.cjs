/* Demo budget + invoices for project-1 so the three bars are visible */
const Database = require("better-sqlite3");
const db = new Database("./prisma/can-desk.db");

const project = db.prepare("SELECT id, clientId, accountId FROM Project WHERE id='project-1'").get();
const owner = db.prepare("SELECT id FROM User WHERE role='ADMIN' LIMIT 1").get();
if (!project || !owner) { console.log("missing project/owner"); process.exit(1); }

// clean previous demo data
db.prepare("DELETE FROM BudgetLine WHERE budgetDocumentId='demo-budget-1'").run();
db.prepare("DELETE FROM BudgetDocument WHERE id='demo-budget-1'").run();
db.prepare("DELETE FROM Invoice WHERE projectId='project-1'").run();

const now = new Date().toISOString();
db.prepare(`INSERT INTO BudgetDocument (id, documentNumber, title, type, clientId, projectId, date, currency, ownerId, status, clientStatus, version, discountPercent, discountAmount, createdAt, updatedAt)
  VALUES ('demo-budget-1','N-2026-0002','Jarní kampaň - rozpočet','NABIDKA',?,? ,?,'CZK',?,'SCHVALENO','SCHVALENO',1,0,0,?,?)`)
  .run(project.clientId, project.id, now, owner.id, now, now);

const lines = [
  // type, subject, qty, unit, unitCost, totalCost, unitPrice, hourlyRate, internalHourlyCost, plannedHours, totalExclVat
  ["INTERNI_PRACE", "Kreativní práce", 120, "h", 750, 90000, 1500, 1500, 750, 120, 180000],
  ["INTERNI_PRACE", "Produkce a account", 80, "h", 600, 48000, 1200, 1200, 600, 80, 96000],
  ["EXTERNI_NAKLAD", "TV spot - produkce", 1, "ks", 200000, 200000, 250000, 0, 0, 0, 250000],
  ["EXTERNI_NAKLAD", "OOH média", 1, "ks", 180000, 180000, 200000, 0, 0, 0, 200000],
  ["PAUSAL", "Agenturní paušál", 1, "ks", 0, 0, 60000, 0, 0, 0, 60000],
];

const ins = db.prepare(`INSERT INTO BudgetLine (id, budgetDocumentId, type, subject, quantity, unit, unitCost, totalCost, unitPrice, hourlyRate, internalHourlyCost, plannedHours, totalExclVat, vatRate, vatAmount, totalInclVat, discountPercent, discountAmount, plannedMargin, plannedMarginPercent, isPrintable, isInternalOnly, sortOrder, createdAt, updatedAt)
  VALUES (?, 'demo-budget-1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 21, ?, ?, 0, 0, ?, ?, 1, 0, ?, ?, ?)`);

lines.forEach((l, i) => {
  const [type, subject, qty, unit, unitCost, totalCost, unitPrice, hourlyRate, internalCost, plannedHours, totalExcl] = l;
  const vat = Math.round(totalExcl * 0.21);
  const margin = totalExcl - totalCost - plannedHours * internalCost;
  const marginPct = totalExcl > 0 ? Math.round((margin / totalExcl) * 100) : 0;
  ins.run(`demo-line-${i + 1}`, type, subject, qty, unit, unitCost, totalCost, unitPrice, hourlyRate, internalCost, plannedHours, totalExcl, vat, totalExcl + vat, margin, marginPct, i, now, now);
});

// Invoices: one issued to client, one received cost invoice
db.prepare(`INSERT INTO Invoice (id, projectId, type, number, amount, date, note, createdAt) VALUES ('demo-inv-1','project-1','ISSUED','F-2026-118',300000,?,?,?)`)
  .run(new Date("2026-04-20").toISOString(), "Zálohová faktura - 1. etapa", now);
db.prepare(`INSERT INTO Invoice (id, projectId, type, number, amount, date, note, createdAt) VALUES ('demo-inv-2','project-1','RECEIVED','PF-8841',200000,?,?,?)`)
  .run(new Date("2026-04-28").toISOString(), "Produkce TV spotu", now);

console.log("demo budget + invoices created for project-1");
