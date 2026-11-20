const D = require("better-sqlite3");
const { Client } = require("pg");

(async () => {
  const db = new D("./prisma/can-desk.db");
  const sq = db
    .prepare("SELECT name FROM sqlite_master WHERE name IN ('ChatRoom','ChatMessage','ChatMember')")
    .all()
    .map((r) => r.name);
  console.log("sqlite:", sq.join(",") || "MISSING");

  const c = new Client({
    connectionString:
      "postgresql://can_desk.xihiswgdwiardhexgbva:Kv7%23pR2mXw9!tLz4@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?schema=can_desk",
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='can_desk' AND tablename IN ('ChatRoom','ChatMessage','ChatMember')`
  );
  console.log("postgres:", r.rows.map((x) => x.tablename).join(",") || "MISSING");
  await c.end();
})();
