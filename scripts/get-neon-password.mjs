import fs from "fs";
import https from "https";
import crypto from "crypto";

const creds = JSON.parse(
  fs.readFileSync(
    "/c/Users/Hauska/.config/neonctl/credentials.json",
    "utf-8"
  )
);
const token = creds.access_token;
const projectId = "frosty-frog-28089840";
const roleName = "app_" + crypto.randomBytes(4).toString("hex");

const data = JSON.stringify({ role: { name: roleName } });

const req = https.request(
  {
    hostname: "console.neon.tech",
    path: `/api/v2/projects/${projectId}/roles`,
    method: "POST",
    headers: {
      "Authorization": `Bearer ***,
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      const resp = JSON.parse(body);
      if (resp.role?.password) {
        console.log("PASSWORD:", resp.role.password);
        console.log("USER:", resp.role.name);
      } else {
        console.log("ERROR:", JSON.stringify(resp));
      }
    });
  }
);
req.write(data);
req.end();
