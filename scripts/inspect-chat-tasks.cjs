const { Client } = require("pg");
(async () => {
  const c = new Client({
    connectionString:
      "postgresql://can_desk.xihiswgdwiardhexgbva:Kv7%23pR2mXw9!tLz4@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?schema=can_desk",
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const t = await c.query(
    `SELECT t.id, t.title, t.description, t."createdAt" FROM can_desk."Task" t
     WHERE t.description LIKE '%[[chat:%' ORDER BY t."createdAt" DESC LIMIT 3`
  );
  for (const row of t.rows) {
    const m = (row.description || "").match(/\[\[chat:([^\]]+)\]\]/);
    const msgId = m ? m[1] : null;
    const msg = msgId
      ? await c.query('SELECT body, kind, "createdAt" FROM can_desk."ChatMessage" WHERE id=$1', [msgId])
      : { rows: [] };
    const a = await c.query(
      'SELECT u.name FROM can_desk."TaskAssignment" ta JOIN can_desk."User" u ON u.id=ta."userId" WHERE ta."taskId"=$1',
      [row.id]
    );
    console.log({
      title: row.title,
      created: row.createdAt,
      msgAt: msg.rows[0]?.createdAt,
      msg: (msg.rows[0]?.body || "").slice(0, 80),
      assignees: a.rows.map((x) => x.name),
    });
  }
  await c.end();
})();
