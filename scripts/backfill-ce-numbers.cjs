const { Client } = require("pg");
const Database = require("better-sqlite3");

(async () => {
  // Supabase
  const c = new Client({
    connectionString:
      "postgresql://can_desk.xihiswgdwiardhexgbva:Kv7%23pR2mXw9!tLz4@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?schema=can_desk",
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  await c.query(`WITH numbered AS (
      SELECT id, row_number() OVER (ORDER BY "createdAt") rn
      FROM can_desk."BudgetDocument"
    )
    UPDATE can_desk."BudgetDocument" d
    SET "documentNumber" = 'CE-' || lpad(n.rn::text, 5, '0')
    FROM numbered n WHERE d.id = n.id`);
  await c.query(`INSERT INTO can_desk."Counter"(key, value)
    VALUES ('CE', (SELECT count(*) FROM can_desk."BudgetDocument"))
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);
  const r = await c.query(`SELECT "documentNumber" FROM can_desk."BudgetDocument" ORDER BY "documentNumber"`);
  console.log("prod CE:", r.rows.map((x) => x.documentNumber).join(", "));
  await c.end();

  // local sqlite
  const db = new Database("./prisma/can-desk.db");
  db.prepare(`UPDATE BudgetDocument
    SET documentNumber = 'CE-' || printf('%05d',
      (SELECT COUNT(*) FROM BudgetDocument b2 WHERE b2.createdAt <= BudgetDocument.createdAt))
  `).run();
  db.prepare(
    "INSERT INTO Counter(key,value) VALUES('CE',(SELECT COUNT(*) FROM BudgetDocument)) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).run();
  console.log("sqlite CE ok");
})().catch((e) => {
  console.log("FAIL", e.message.slice(0, 160));
  process.exit(1);
});
