/* Task statuses + project card tweaks + font size setting */
const fs = require("fs");
const W = (f, fn) => fs.writeFileSync(f, fn(fs.readFileSync(f, "utf-8")));

// ---------- A. TaskStatus enum ----------
for (const f of ["prisma/schema.prisma", "prisma/postgres-schema.prisma"]) {
  W(f, (c) =>
    c
      .replace(
        /enum TaskStatus \{[^}]*\}/,
        `enum TaskStatus {
  PRIPRAVA
  OTEVRENO
  V_PROCESU
  U_KLIENTA
  HOTOVO
  UZAVRENO
}`
      )
      .replace(/status\s+TaskStatus\s+@default\(TODO\)/, "status      TaskStatus @default(OTEVRENO)")
  );
}

// ---------- B. badges ----------
W("src/components/shared/status-badges.tsx", (c) =>
  c
    .replace(
      /const taskStatusStyles: Record<string, string> = \{[^}]*\};/,
      `const taskStatusStyles: Record<string, string> = {
  PRIPRAVA: "badge-sky",
  OTEVRENO: "badge-emerald",
  V_PROCESU: "badge-indigo",
  U_KLIENTA: "badge-amber",
  HOTOVO: "badge-teal",
  UZAVRENO: "badge-stone opacity-70",
};`
    )
    .replace(
      /const taskStatusLabels: Record<string, string> = \{[^}]*\};/,
      `const taskStatusLabels: Record<string, string> = {
  PRIPRAVA: "V přípravě",
  OTEVRENO: "Otevřeno",
  V_PROCESU: "V procesu",
  U_KLIENTA: "U klienta",
  HOTOVO: "Hotovo",
  UZAVRENO: "Uzavřeno",
};`
    )
);

// ---------- C. tasks-list ----------
W("src/app/(authenticated)/tasks/tasks-list.tsx", (c) => {
  c = c.replace(
    'const boardColumns = ["BACKLOG", "TODO", "IN_PROGRESS", "WAITING", "REVIEW", "DONE"];',
    'const boardColumns = ["PRIPRAVA", "OTEVRENO", "V_PROCESU", "U_KLIENTA", "HOTOVO"];'
  );
  c = c.split('"DONE"').join('"HOTOVO"');
  // hide archived (UZAVRENO) everywhere in the list
  c = c.replace("const visible = tasks.filter((t: TaskRow) => {", "const visible = tasks.filter((t: TaskRow) => {\n    if (t.status === \"UZAVRENO\") return false;");
  return c;
});

// ---------- D. project tasks tab ----------
W("src/app/(authenticated)/projects/[id]/tabs/project-tasks-tab.tsx", (c) =>
  c.replace(
    /\{ key: "BACKLOG", label: "Backlog" \},[\s\S]*?\{ key: "DONE", label: "Hotovo" \},/,
    `{ key: "PRIPRAVA", label: "V přípravě" },
    { key: "OTEVRENO", label: "Otevřeno" },
    { key: "V_PROCESU", label: "V procesu" },
    { key: "U_KLIENTA", label: "U klienta" },
    { key: "HOTOVO", label: "Hotovo" },`
  )
);

// ---------- E. project card ----------
W("src/app/(authenticated)/projects/projects-list.tsx", (c) => {
  // remove health dot block
  c = c.replace(/\s*\{project\.healthLevel && \([\s\S]*?<\/span>\n\s*\)\}/, "");
  // title: 2 lines, no truncate; remove title-row status badge
  c = c.replace(
    '<h3 className="font-medium text-[#1C1917] truncate">{project.name}</h3>\n                    <ProjectStatusBadge status={project.status} />',
    '<h3 className="font-medium text-[#1C1917] line-clamp-2">{project.name}</h3>'
  );
  // deadline color by urgency
  c = c.replace(
    /\{project\.deadline && \(\n\s*<span className="text-xs text-\[#78716C\]">\n\s*Deadline: \{format\(new Date\(project\.deadline\), "d\.M\.yyyy"\)\}\n\s*<\/span>\n\s*\)\}/,
    `{project.deadline && (() => {
                      const days = Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000);
                      const cls = days < 0 ? "text-rose-600 font-medium" : days <= 2 ? "text-amber-600 font-medium" : "text-[#78716C]";
                      return (
                        <span className={"text-xs " + cls}>
                          Deadline: {format(new Date(project.deadline), "d.M.yyyy")}
                        </span>
                      );
                    })()}`
  );
  // remove description preview line
  c = c.replace(/\s*\{project\.description && \(\n\s*<p className="text-xs text-\[#A8A29E\] mt-2 line-clamp-1">\{project\.description\}<\/p>\n\s*\)\}/, "");
  // right side: task count + status badge instead of time count
  c = c.replace(
    /\s*<div className="text-center">\n\s*<p className="text-sm font-medium text-\[#1C1917\]">\{project\.timeCount\}<\/p>\n\s*<p className="text-xs text-\[#78716C\]">časů<\/p>\n\s*<\/div>/,
    '\n                  <ProjectStatusBadge status={project.status} />'
  );
  return c;
});

// ---------- F. filter label ----------
W("src/app/(authenticated)/projects/project-filters.tsx", (c) =>
  c.replace("Aktivní (Čeká, Otevřeno, Hotovo)", "Aktivní")
);

// ---------- G. font size ----------
fs.writeFileSync(
  "src/app/(authenticated)/font-size-card.tsx",
  `"use client";

import { useEffect, useState } from "react";
import { Type } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES: { key: string; label: string; px: string }[] = [
  { key: "small", label: "Malé", px: "14 px" },
  { key: "medium", label: "Střední", px: "16 px" },
  { key: "large", label: "Velké", px: "18 px" },
];

export function FontSizeCard() {
  const [size, setSize] = useState("medium");

  useEffect(() => {
    setSize(localStorage.getItem("can-font-size") || "medium");
  }, []);

  function apply(key: string) {
    setSize(key);
    localStorage.setItem("can-font-size", key);
    document.documentElement.dataset.fontSize = key;
  }

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Type className="w-4 h-4 text-[#6366F1]" />
        <h2 className="text-sm font-semibold text-[#1C1917]">Velikost písma</h2>
      </div>
      <p className="text-xs text-[#78716C] mb-4">Základní je střední.</p>
      <div className="flex gap-2">
        {SIZES.map((s) => (
          <button
            key={s.key}
            onClick={() => apply(s.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm border transition-colors",
              size === s.key
                ? "bg-[#6366F1] text-white border-[#6366F1]"
                : "bg-white text-[#1C1917] border-black/10 hover:border-[#6366F1]/50"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
`
);

W("src/app/(authenticated)/settings/page.tsx", (c) => {
  if (!c.includes("FontSizeCard")) {
    c = c.replace(
      'import { Settings, Shield, DollarSign, Tag } from "lucide-react";',
      'import { Settings, Shield, DollarSign, Tag } from "lucide-react";\nimport { FontSizeCard } from "../font-size-card";'
    );
    c = c.replace('<div className="space-y-6">', '<div className="space-y-6">\n      <FontSizeCard />');
  }
  return c;
});

// root layout: apply saved size before paint
try {
  W("src/app/layout.tsx", (c) => {
    if (c.includes("can-font-size")) return c;
    return c.replace(
      /<html lang="cs">/,
      `<html lang="cs">
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.fontSize=localStorage.getItem('can-font-size')||'medium'}catch(e){}" }} />
      </head>`
    );
  });
} catch (e) {
  console.log("layout skip");
}

W("src/app/globals.css", (c) => {
  if (c.includes("data-font-size")) return c;
  return (
    c +
    `
html[data-font-size="small"] { font-size: 14px; }
html[data-font-size="large"] { font-size: 18px; }
`
  );
});

console.log("all patched");
