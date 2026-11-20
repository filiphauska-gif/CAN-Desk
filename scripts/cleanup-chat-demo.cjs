const { Client } = require("pg");
(async () => {
  const c = new Client({
    connectionString:
      "postgresql://can_desk.xihiswgdwiardhexgbva:Kv7%23pR2mXw9!tLz4@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?schema=can_desk",
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const tasks = await c.query(
    `SELECT id, title, description, "createdAt" FROM can_desk."Task"
     WHERE description LIKE '%[[chat:%' ORDER BY "createdAt" DESC`
  );
  // keep newest (correct one for Filip), delete the older demo tasks
  const toDelete = tasks.rows.slice(1).map((r) => r.id);
  for (const id of toDelete) {
    await c.query('DELETE FROM can_desk."TaskAssignment" WHERE "taskId"=$1', [id]);
    await c.query('DELETE FROM can_desk."Task" WHERE id=$1', [id]);
  }
  // remove old system messages that reference deleted tasks
  const r = await c.query(
    `DELETE FROM can_desk."ChatMessage" WHERE kind='SYSTEM' AND body LIKE '%pro: Jana Nováková%' OR kind='SYSTEM' AND body LIKE '%pro: Lucie Vandrášiková%'`
  );
  console.log("deleted tasks:", toDelete.length, "| system msgs:", r.rowCount);
  await c.end();
})();
