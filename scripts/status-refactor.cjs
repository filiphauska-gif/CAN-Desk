/* Project statuses: CEKA / OTEVRENO / HOTOVO / UZAVRENO / ZRUSENO */
const fs = require("fs");
const W = (f, fn) => fs.writeFileSync(f, fn(fs.readFileSync(f, "utf-8")));
const rep = (from, to) => (c) => c.split(from).join(to);

// --- schemas ---
for (const f of ["prisma/schema.prisma", "prisma/postgres-schema.prisma"]) {
  W(f, (c) => {
    c = c.replace(/enum ProjectStatus \{[^}]*\}/, `enum ProjectStatus {
  CEKA
  OTEVRENO
  HOTOVO
  UZAVRENO
  ZRUSENO
}`);
    c = c.replace(/status\s+ProjectStatus\s+@default\(NOVY\)/, "status      ProjectStatus @default(CEKA)");
    return c;
  });
}

// --- badges ---
W("src/components/shared/status-badges.tsx", (c) => {
  c = c.replace(/const projectStatusStyles: Record<string, string> = \{[^}]*\};/, `const projectStatusStyles: Record<string, string> = {
  CEKA: "badge-amber",
  OTEVRENO: "badge-emerald",
  HOTOVO: "badge-teal",
  UZAVRENO: "badge-indigo",
  ZRUSENO: "badge-stone opacity-70",
};`);
  c = c.replace(/const projectStatusLabels: Record<string, string> = \{[^}]*\};/, `const projectStatusLabels: Record<string, string> = {
  CEKA: "Čeká",
  OTEVRENO: "Otevřeno",
  HOTOVO: "Hotovo",
  UZAVRENO: "Uzavřeno",
  ZRUSENO: "Zrušeno",
};`);
  return c;
});

// --- filters: default active + archiv option ---
W("src/app/(authenticated)/projects/project-filters.tsx", (c) => {
  c = c.replace(
    /<option value="">Všechny statusy<\/option>/,
    `<option value="">Aktivní (Čeká, Otevřeno, Hotovo)</option>`
  );
  c = c.replace(
    /<\/select>\n\n        \{\/\* Client filter \*\/\}/,
    `  <option value="ALL">Všechny včetně archivu</option>
        </select>

        {/* Client filter */}`
  );
  return c;
});

// --- projects page: default excludes archived ---
W("src/app/(authenticated)/projects/page.tsx", (c) =>
  c.replace(
    "  const projects = await getProjects(filters);",
    `  const allProjects = await getProjects(filters);
  const projects =
    filters.status === "ALL"
      ? allProjects
      : filters.status
        ? allProjects.filter((p: any) => p.status === filters.status)
        : allProjects.filter((p: any) => !["UZAVRENO", "ZRUSENO"].includes(p.status));`
  )
);

// --- dashboard status widget ---
W("src/app/(authenticated)/dashboard-grid.tsx", (c) => {
  c = c.replace(/\["NOVY", "Nový", "bar-sky"\],[\s\S]*?\["ARCHIVOVANO", "Archivováno", "bar-stone"\],/, `["CEKA", "Čeká", "bar-amber"],
  ["OTEVRENO", "Otevřeno", "bar-emerald"],
  ["HOTOVO", "Hotovo", "bar-teal"],
  ["UZAVRENO", "Uzavřeno", "bar-indigo"],
  ["ZRUSENO", "Zrušeno", "bar-stone"],`);
  c = c.replace(/\["BEZI", "Běží"\],[\s\S]*?\["CEKA_NA_KLIENTA", "Čeká na klienta"\],/, `["OTEVRENO", "Otevřeno"],\n    ["CEKA", "Čeká"],`);
  return c;
});

// --- dashboard page closed check ---
W("src/app/(authenticated)/page.tsx", (c) =>
  c.replace(/\["DOKONCENO", "ARCHIVOVANO", "FAKTUROVANO"\]/, `["UZAVRENO", "ZRUSENO"]`)
);

// --- clients list active check ---
W("src/app/(authenticated)/clients/clients-list.tsx", (c) =>
  c
    .replace(/\["DOKONCENO", "FAKTUROVANO", "ARCHIVOVANO"\]/g, `["UZAVRENO", "ZRUSENO"]`)
    .replace(/\["DOKONCENO", "ARCHIVOVANO"\]/g, `["UZAVRENO", "ZRUSENO"]`)
);

// --- health ---
W("src/lib/project-health.ts", (c) =>
  c.replace(/\["DOKONCENO", "FAKTUROVANO", "ARCHIVOVANO"\]/, `["HOTOVO", "UZAVRENO", "ZRUSENO"]`)
);

// --- create project default ---
W("src/server/actions/projects.ts", (c) => c.replace(/status: "NOVY",/, `status: "CEKA",`));

// --- finance + time exclude archived ---
for (const f of [
  "src/app/(authenticated)/finance/page.tsx",
  "src/app/(authenticated)/time/page.tsx",
  "src/app/(authenticated)/projects/page.tsx",
]) {
  W(f, (c) => c.replace(/notIn: \["ARCHIVOVANO"\]/g, `notIn: ["UZAVRENO", "ZRUSENO"]`));
}

// --- projects server action: default filter also excludes archive ---
W("src/server/actions/projects.ts", (c) => c.replace(/status: filters\.status as any,/, `status: filters.status === "ALL" ? undefined : (filters.status as any),`));

console.log("code patched");
