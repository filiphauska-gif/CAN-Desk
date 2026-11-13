const fs = require("fs");
const https = require("https");

const TOKEN = fs.readFileSync(process.env.USERPROFILE + "/.hermes-secrets/vercel-token.txt", "utf-8").trim();
const PROJECT = "can-desk";
const BASE = "postgresql://can_desk.xihiswgdwiardhexgbva:Kv7%23pR2mXw9!tLz4@aws-0-eu-west-1.pooler.supabase.com";
const RUNTIME_URL = `${BASE}:6543/postgres?schema=can_desk`; // transaction pooler (IPv4, many clients)
const DIRECT_URL = `${BASE}:5432/postgres?schema=can_desk`; // session pooler (migrations only)

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
  for (const [key, value] of [
    ["DATABASE_URL", RUNTIME_URL],
    ["DIRECT_URL", DIRECT_URL],
  ]) {
    const r = await api("POST", `/v10/projects/${PROJECT}/env?upsert=true`, {
      key,
      value,
      type: "encrypted",
      target: ["production", "preview", "development"],
    });
    console.log(key, "upsert:", r.status);
  }
})();
