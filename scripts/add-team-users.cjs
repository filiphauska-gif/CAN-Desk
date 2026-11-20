const bcrypt = require("bcryptjs");
const { Client } = require("pg");
(async () => {
  const c = new Client({
    connectionString:
      "postgresql://can_desk.xihiswgdwiardhexgbva:Kv7%23pR2mXw9!tLz4@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?schema=can_desk",
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const hash = await bcrypt.hash("admin123", 12);
  const users = [
    ["lucie@canagency.cz", "Lucie Vandrášiková", "ACCOUNT_MANAGER"],
    ["petr@canagency.cz", "Petr Král", "PROJECT_MANAGER"],
    ["jana@canagency.cz", "Jana Nováková", "FINANCE"],
  ];
  for (const [email, name, role] of users) {
    await c.query(
      `INSERT INTO can_desk."User"(id,email,"passwordHash",name,role,active,"createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,true,now(),now())
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role`,
      [`usr-${email.split("@")[0]}`, email, hash, name, role]
    );
  }
  const r = await c.query('SELECT email,name,role FROM can_desk."User" ORDER BY name');
  console.log(JSON.stringify(r.rows));
  await c.end();
})();
