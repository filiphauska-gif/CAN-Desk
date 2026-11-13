/* Demo budget + invoices for project-1 in Supabase (same as local demo) */
const { Client } = require("pg");

(async () => {
  const c = new Client({
    connectionString:
      "postgresql://can_desk.xihiswgdwiardhexgbva:Kv7%23pR2mXw9!tLz4@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?schema=can_desk",
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const proj = await c.query(`SELECT id, "clientId" FROM can_desk."Project" WHERE id='project-1'`);
  const owner = await c.query(`SELECT id FROM can_desk."User" WHERE role='ADMIN' LIMIT 1`);
  if (!proj.rowCount || !owner.rowCount) { console.log("missing project/owner"); process.exit(1); }
  const clientId = proj.rows[0].clientId;
  const ownerId = owner.rows[0].id;

  await c.query(`DELETE FROM can_desk."BudgetLine" WHERE "budgetDocumentId"='demo-budget-1'`);
  await c.query(`DELETE FROM can_desk."BudgetDocument" WHERE id='demo-budget-1'`);
  await c.query(`DELETE FROM can_desk."Invoice" WHERE "projectId"='project-1'`);

  const now = new Date().toISOString();
  await c.query(
    `INSERT INTO can_desk."BudgetDocument" (id, "documentNumber", title, type, "clientId", "projectId", date, currency, "ownerId", status, "clientStatus", version, "discountPercent", "discountAmount", "createdAt", "updatedAt")
     VALUES ('demo-budget-1','N-2026-0002','Jarní kampaň - rozpočet','NABIDKA',$1,$2,$3,'CZK',$4,'SCHVALENO','SCHVALENO',1,0,0,$3,$3)`,
    [clientId, "project-1", now, ownerId]
  );

  const lines = [
    ["INTERNI_PRACE", "Kreativní práce", 120, "h", 750, 90000, 1500, 1500, 750, 120, 180000],
    ["INTERNI_PRACE", "Produkce a account", 80, "h", 600, 48000, 1200, 1200, 600, 80, 96000],
    ["EXTERNI_NAKLAD", "TV spot - produkce", 1, "ks", 200000, 200000, 250000, 0, 0, 0, 250000],
    ["EXTERNI_NAKLAD", "OOH média", 1, "ks", 180000, 180000, 200000, 0, 0, 0, 200000],
    ["PAUSAL", "Agenturní paušál", 1, "ks", 0, 0, 60000, 0, 0, 0, 60000],
  ];

  for (const [i, l] of lines.entries()) {
    const [type, subject, qty, unit, unitCost, totalCost, unitPrice, hourlyRate, internalCost, plannedHours, totalExcl] = l;
    const vat = Math.round(totalExcl * 0.21);
    const margin = totalExcl - totalCost - plannedHours * internalCost;
    const marginPct = totalExcl > 0 ? Math.round((margin / totalExcl) * 100) : 0;
    await c.query(
      `INSERT INTO can_desk."BudgetLine" (id, "budgetDocumentId", type, subject, quantity, unit, "unitCost", "totalCost", "unitPrice", "hourlyRate", "internalHourlyCost", "plannedHours", "totalExclVat", "vatRate", "vatAmount", "totalInclVat", "discountPercent", "discountAmount", "plannedMargin", "plannedMarginPercent", "isPrintable", "isInternalOnly", "sortOrder", "createdAt", "updatedAt")
       VALUES ($1,'demo-budget-1',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,21,$13,$14,0,0,$15,$16,true,false,$17,$18,$18)`,
      [`demo-line-${i + 1}`, type, subject, qty, unit, unitCost, totalCost, unitPrice, hourlyRate, internalCost, plannedHours, totalExcl, vat, totalExcl + vat, margin, marginPct, i, now]
    );
  }

  await c.query(
    `INSERT INTO can_desk."Invoice" (id, "projectId", type, number, amount, date, note, "createdAt") VALUES ('demo-inv-1','project-1','ISSUED','F-2026-118',300000,$1,$2,$3)`,
    [new Date("2026-04-20").toISOString(), "Zálohová faktura - 1. etapa", now]
  );
  await c.query(
    `INSERT INTO can_desk."Invoice" (id, "projectId", type, number, amount, date, note, "createdAt") VALUES ('demo-inv-2','project-1','RECEIVED','PF-8841',200000,$1,$2,$3)`,
    [new Date("2026-04-28").toISOString(), "Produkce TV spotu", now]
  );

  console.log("demo budget + invoices copied to Supabase");
  await c.end();
})().catch((e) => { console.log("FAIL", e.message.slice(0, 120)); process.exit(1); });
