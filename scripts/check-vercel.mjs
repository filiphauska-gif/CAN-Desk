const https = require("https");
const token = "***n";
const req = https.get("https://api.vercel.com/v9/projects", { headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } }, (res) => {
  let d = "";
  res.on("data", (c) => d += c);
  res.on("end", () => {
    const r = JSON.parse(d);
    if (r.projects) {
      r.projects.forEach(p => {
        if (p.name && (p.name.includes("can-desk") || p.name.includes("CAN"))) {
          console.log("Project:", p.name, "| Envs:", p.env?.length || 0);
        }
      });
    } else {
      console.log("Error:", JSON.stringify(r).slice(0, 300));
    }
  });
});
req.end();
