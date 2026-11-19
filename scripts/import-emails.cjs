/* Import parsed .msg dataset into Email table + learn client domains */
const fs = require("fs");
const { Client } = require("pg");

const DOMAINS = {
  "Mercedes-Benz Česká republika s.r.o.": "mercedes-benz.com,mercedes-benz.cz,mercedes-benz.de",
  "Daimler Truck Česká republika s.r.o.": "daimlertruck.com,daimlertruck.cz,daimler.com",
  "Daimler Buses Česká republika s.r.o.": "daimlerbuses.com,daimler-buses.com",
  "DHL Solutions, k. s.": "dhl.com,dhl.cz",
  "SAGA PRAHA s.r.o.": "sagapraha.cz",
  "LOCOMOTION, spol. s r.o.": "madeta.cz,locomotion.cz",
  "Brandcomm Polska Sp. z o.o. Sp. K.": "brandcomm.agency,brandcomm.pl",
  "Arkády Pankrác s.r.o.": "arkady.cz,arkadypankrac.cz",
  "WTT s.r.o.": "wtt.cz",
  "Commode s.r.o.": "commode.cz",
};

const emails = JSON.parse(fs.readFileSync("scripts/emails.json", "utf-8"));
const OUR = "canagency.cz";

(async () => {
  const c = new Client({
    connectionString:
      "postgresql://can_desk.xihiswgdwiardhexgbva:Kv7%23pR2mXw9!tLz4@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?schema=can_desk",
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  // learn domains
  for (const [name, doms] of Object.entries(DOMAINS)) {
    await c.query('UPDATE can_desk."Client" SET "emailDomains"=$1 WHERE name=$2', [doms, name]);
  }

  const admin = (await c.query(`SELECT id FROM can_desk."User" WHERE email='admin@canagency.cz'`)).rows[0];
  const account = (
    await c.query(
      `INSERT INTO can_desk."EmailAccount"(id,"userId",provider,email,"accessToken","refreshToken","expiresAt","createdAt")
       VALUES ('acc-import',$1,'import','import@local','','',now(),now())
       ON CONFLICT ("userId") DO UPDATE SET provider='import' RETURNING id`,
      [admin.id]
    )
  ).rows[0];

  const projects = (await c.query(
    `SELECT p.id, p."jobNumber", p.name, p."clientId", cl.name AS client, cl."emailDomains" AS domains
     FROM can_desk."Project" p JOIN can_desk."Client" cl ON cl.id=p."clientId"
     WHERE p.status NOT IN ('UZAVRENO','ZRUSENO')`
  )).rows;

  function match(from, subject, body) {
    const text = `${subject}\n${body}`.toLowerCase();
    const job = text.match(/job[-\s]?0*(\d{4,5})/i);
    if (job) {
      const want = `job-${job[1].padStart(5, "0")}`.toLowerCase();
      const p = projects.find((x) => (x.jobNumber || "").toLowerCase() === want);
      if (p) return { projectId: p.id, clientId: p.clientId, reason: `číslo zakázky ${p.jobNumber}`, conf: 1 };
    }
    const dom = (from.split("@")[1] || "").toLowerCase();
    const cl = projects.find((p) =>
      (p.domains || "").split(",").some((d) => d && dom.endsWith(d.trim()))
    );
    if (cl) {
      const sameClient = projects.filter((p) => p.clientId === cl.clientId);
      if (sameClient.length === 1)
        return { projectId: sameClient[0].id, clientId: cl.clientId, reason: `doména klienta ${cl.client}`, conf: 0.9 };
      const words = cl.name.toLowerCase().match(/[a-z0-9á-ž]{4,}/g) || [];
      let best = null,
        score = 0;
      for (const p of sameClient) {
        const hits = (p.name.toLowerCase().match(/[a-z0-9á-ž]{4,}/g) || []).filter((w) => text.includes(w)).length;
        if (hits > score) (best = p), (score = hits);
      }
      if (best && score > 0)
        return { projectId: best.id, clientId: cl.clientId, reason: `klíčová slova (${cl.client})`, conf: 0.75 };
      return { projectId: null, clientId: cl.clientId, reason: `klient ${cl.client}, více zakázek`, conf: 0.45 };
    }
    return { projectId: null, clientId: null, reason: "nepodařilo se přiřadit", conf: 0 };
  }

  let added = 0;
  for (const e of emails) {
    if (!e.date) continue;
    const gmailId = e.message_id || `file:${e.file}`;
    const m = match(e.from_addr, e.subject, e.body);
    const dir = e.from_addr.endsWith(OUR) ? "OUT" : "IN";
    const r = await c.query(
      `INSERT INTO can_desk."Email"(id,"accountId","gmailId","threadId",direction,"fromAddress","fromName","toAddress",subject,snippet,"bodyText","receivedAt",unread,"projectId","clientId","matchReason","matchConfidence","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false,$13,$14,$15,$16,now())
       ON CONFLICT ("gmailId") DO NOTHING`,
      [
        `mail-${added}-${Date.now()}`,
        account.id,
        gmailId,
        e.in_reply_to || e.subject,
        dir,
        e.from_addr,
        e.from_name || null,
        e.to || null,
        e.subject || "(bez předmětu)",
        (e.body || "").slice(0, 200),
        e.body || "",
        e.date,
        m.projectId,
        m.clientId,
        m.reason,
        m.conf,
      ]
    );
    added += r.rowCount;
  }

  const stats = await c.query(
    `SELECT count(*) total, count("projectId") matched, count(*)-count("projectId") unassigned FROM can_desk."Email"`
  );
  console.log("imported:", added, JSON.stringify(stats.rows[0]));
  await c.end();
})().catch((e) => {
  console.log("FAIL", e.message.slice(0, 180));
  process.exit(1);
});
