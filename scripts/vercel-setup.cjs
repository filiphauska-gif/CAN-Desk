const fs = require("fs");
const https = require("https");

const TOKEN = fs.readFileSync(process.env.USERPROFILE + "/.hermes-secrets/vercel-token.txt", "utf-8").trim();
const PROJECT = "can-desk";
const DB_URL = "postgresql://can_desk.xihiswgdwiardhexgbva:Kv7%23pR2mXw9!tLz4@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?schema=can_desk";

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: "api.vercel.com",
        path,
        method,
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve({ status: res.statusCode, body: d }));
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // 1) Upsert DATABASE_URL for all targets
  const up = await api("POST", `/v10/projects/${PROJECT}/env?upsert=true`, {
    key: "DATABASE_URL",
    value: DB_URL,
    type: "encrypted",
    target: ["production", "preview", "development"],
  });
  console.log("DATABASE_URL upsert:", up.status, up.status < 300 ? "OK" : up.body.slice(0, 200));

  // 2) Clean up obsolete Neon storage vars (CAN_DESK_* prefix)
  const list = await api("GET", `/v9/projects/${PROJECT}/env`);
  const envs = JSON.parse(list.body).envs || [];
  const stale = envs.filter((e) => e.key.startsWith("CAN_DESK_"));

  for (const e of stale) {
    const del = await api("DELETE", `/v9/projects/${PROJECT}/env/${e.id}`);
    console.log("deleted", e.key, del.status);
  }
})();
