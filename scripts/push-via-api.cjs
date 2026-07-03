"use strict";
const https = require("https");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
if (!TOKEN) { console.error("No TOKEN"); process.exit(1); }

const REPO = "filiphauska-gif/CAN-Desk";

function api(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.github.com",
      path: "/repos/" + REPO + "/" + urlPath,
      method,
      headers: { "Authorization": "Bearer " + TOKEN, "User-Agent": "can-desk", "Accept": "application/vnd.github+json" },
    };
    if (body) opts.headers["Content-Type"] = "application/json";
    const req = https.request(opts, (res) => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const baseDir = path.resolve(__dirname, "..");
  const files = [
    { p: "package.json", l: path.join(baseDir, "package.json") },
    { p: "src/lib/auth.ts", l: path.join(baseDir, "src", "lib", "auth.ts") },
    { p: "prisma/schema.prisma", l: path.join(baseDir, "prisma", "schema.prisma") },
    { p: "prisma/postgres-schema.prisma", l: path.join(baseDir, "prisma", "postgres-schema.prisma") },
  ];

  const ref = await api("GET", "git/ref/heads/main");
  if (!ref.object) { console.error("Failed to get ref:", JSON.stringify(ref)); return; }
  const baseSha = ref.object.sha;
  console.log("Base commit:", baseSha);

  const treeItems = [];
  for (const f of files) {
    const content = fs.readFileSync(f.l, "utf-8");
    const blob = await api("POST", "git/blobs", { content, encoding: "utf-8" });
    if (!blob.sha) { console.error("Blob error:", f.p, JSON.stringify(blob)); return; }
    treeItems.push({ path: f.p, mode: "100644", type: "blob", sha: blob.sha });
    console.log("  Blob:", f.p);
  }

  const commitData = await api("GET", "git/commits/" + baseSha);
  const newTree = await api("POST", "git/trees", { tree: treeItems, base_tree: commitData.tree.sha });
  const newCommit = await api("POST", "git/commits", { message: "Auto-seed + db push on deploy", tree: newTree.sha, parents: [baseSha] });
  await api("PATCH", "git/refs/heads/main", { sha: newCommit.sha, force: true });
  console.log("Pushed successfully! ✅");
}
run().catch(e => console.error("Error:", e.message));
