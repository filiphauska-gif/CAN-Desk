const { Client } = require("pg");
(async () => {
  const c = new Client({
    connectionString:
      "postgresql://can_desk.xihiswgdwiardhexgbva:Kv7%23pR2mXw9!tLz4@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?schema=can_desk",
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  await c.query(`WITH numbered AS (
      SELECT id, row_number() OVER (ORDER BY "createdAt") rn
      FROM can_desk."Project" WHERE "jobNumber" IS NULL
    )
    UPDATE can_desk."Project" p
    SET "jobNumber" = 'JOB-' || lpad(n.rn::text, 5, '0')
    FROM numbered n WHERE p.id = n.id`);
  await c.query(`INSERT INTO can_desk."Counter"(key, value)
    VALUES ('JOB', (SELECT count(*) FROM can_desk."Project"))
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);
  const r = await c.query(`SELECT id, "jobNumber" FROM can_desk."Project" ORDER BY "jobNumber"`);
  console.log("prod jobs:", JSON.stringify(r.rows));
  await c.end();
})().catch((e) => {
  console.log("FAIL", e.message.slice(0, 160));
  process.exit(1);
});
