const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

async function main() {
  const pool = new Pool({
    connectionString: "postgresql://neondb_owner:***@ep-nameless-snow-ato7zhvg-pooler.c-9.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require",
  });

  // Check if users exist
  const { rows: existing } = await pool.query("SELECT COUNT(*) as cnt FROM \"User\"");
  if (parseInt(existing[0].cnt) > 0) {
    console.log("Users already exist:", existing[0].cnt);
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash("admin123", 12);
  const users = [
    ["admin@canagency.cz", hash, "Adam Admin", "ADMIN", 1500],
    ["finance@canagency.cz", hash, "František Finance", "FINANCE", 1200],
    ["account@canagency.cz", hash, "Filip Account", "ACCOUNT_MANAGER", 1300],
    ["pm@canagency.cz", hash, "Petra Projektová", "PROJECT_MANAGER", 1100],
    ["kreativec@canagency.cz", hash, "Karel Kreativní", "KREATIVEC", 900],
    ["produkcni@canagency.cz", hash, "Petr Produkční", "PRODUKCNI", 800],
  ];

  for (const u of users) {
    await pool.query(
      "INSERT INTO \"User\" (id, email, \"passwordHash\", name, role, \"hourlyRate\", active, \"createdAt\", \"updatedAt\") VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, true, NOW(), NOW()) ON CONFLICT (email) DO NOTHING",
      u
    );
  }

  console.log("✅ Seeded", users.length, "users");
  await pool.end();
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
