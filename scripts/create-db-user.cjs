const https = require("https");
const creds = JSON.parse(require("fs").readFileSync(require("os").homedir() + "/.config/neonctl/credentials.json", "utf-8"));
const token = creds.access_token;
const data = JSON.stringify({ role: { name: "canapp", password: "CanDesk2024" } });
const req = https.request({ hostname: "console.neon.tech", path: "/api/v2/projects/little-flower-68800296/roles", method: "POST", headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } }, (res) => {
  let d = ""; res.on("data", c => d += c); res.on("end", () => {
    const r = JSON.parse(d);
    if (r.role) console.log("OK - role created:", r.role.name);
    else console.log("Error:", JSON.stringify(r));
  });
});
req.write(data);
req.end();
