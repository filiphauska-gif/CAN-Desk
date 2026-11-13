"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "gridstack/dist/gridstack.min.css";
import { format } from "date-fns";
import {
  ArrowRight,
  AlertTriangle,
  CheckSquare,
  Clock,
  FolderKanban,
  GripVertical,
  Pencil,
  RotateCcw,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectStatusBadge, TaskStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { saveDashboardLayout, resetDashboardLayout } from "@/server/actions/dashboard";

/* ---------------- types ---------------- */
export type DashboardData = {
  userName: string;
  dateStr: string;
  overdueCount: number;
  atRiskCount: number;
  activeCount: number;
  totalProjects: number;
  statusMap: Record<string, number>;
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: number;
    deadline: string | null;
    overdue: boolean;
    projectName: string;
    clientName: string | null;
    projectId: string;
  }[];
  overdueProjects: { id: string; name: string; clientName: string; deadline: string | null }[];
  recentProjects: { id: string; name: string; clientName: string; status: string }[];
  today: string;
};

const GRID_EDIT_CSS = `
  .dashboard-grid .widget-drag-handle { opacity: 0; pointer-events: none; transition: opacity .15s; }
  .dashboard-grid.grid--edit .widget-drag-handle { opacity: 1; pointer-events: auto; cursor: grab; }
  .dashboard-grid.grid--edit .grid-stack-item > .grid-stack-item-content { outline: 2px dashed rgba(99,102,241,.4); outline-offset: -2px; }
  .dashboard-grid .grid-stack-item-content { overflow: hidden; border-radius: 0.75rem; background: transparent; }
`;

/* ---------------- reusable widget shell ---------------- */
function Shell({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/5 shrink-0">
        <h2 className="text-sm font-semibold text-[#1C1917]">{title}</h2>
        <div className="flex items-center gap-1.5">
          {action}
          <span className="widget-drag-handle p-1 rounded hover:bg-white/50 text-[#A8A29E]">
            <GripVertical className="w-4 h-4" />
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  );
}

/* ---------------- widgets ---------------- */
function StatsWidget({ d }: { d: DashboardData }) {
  const tiles = [
    { label: "Moje úkoly", value: d.tasks.length, sub: "nehotových", icon: CheckSquare, tone: "text-[#6366F1]" },
    { label: "Aktivní zakázky", value: d.activeCount, sub: `z ${d.totalProjects} celkem`, icon: FolderKanban, tone: "text-[#6366F1]" },
    { label: "Po deadline", value: d.overdueCount, sub: "vyžaduje pozornost", icon: AlertTriangle, tone: "text-rose-500" },
    { label: "V riziku", value: d.atRiskCount, sub: "deadline do 7 dnů", icon: Clock, tone: "text-amber-500" },
  ];
  return (
    <div className="relative h-full">
      <span className="widget-drag-handle absolute top-2 right-2 z-10 p-1 rounded hover:bg-white/50 text-[#A8A29E]">
        <GripVertical className="w-4 h-4" />
      </span>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full content-center p-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-white/40 border border-white/50 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#78716C]">{t.label}</p>
              <t.icon className={cn("w-3.5 h-3.5", t.tone)} />
            </div>
            <p className="text-xl font-semibold text-[#1C1917] mt-0.5">{t.value}</p>
            <p className="text-[10px] text-[#78716C]">{t.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksWidget({ d }: { d: DashboardData }) {
  return (
    <Shell
      title="Moje úkoly"
      action={
        <Link href="/tasks" className="text-xs text-[#6366F1] hover:underline flex items-center gap-1">
          Všechny <ArrowRight className="w-3 h-3" />
        </Link>
      }
    >
      {d.tasks.length === 0 && (
        <p className="px-4 py-8 text-sm text-[#78716C] text-center">Žádné nehotové úkoly. Skvělá práce! 🎉</p>
      )}
      <div className="divide-y divide-black/5">
        {d.tasks.slice(0, 12).map((t) => (
          <Link key={t.id} href={`/projects/${t.projectId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/40 transition-colors">
            <TaskStatusBadge status={t.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#1C1917] truncate">{t.title}</p>
              <p className="text-xs text-[#78716C] truncate">
                {t.projectName}
                {t.clientName && ` • ${t.clientName}`}
              </p>
            </div>
            {t.priority > 0 && <PriorityBadge priority={t.priority} />}
            {t.deadline && (
              <span className={cn("text-xs shrink-0", t.overdue ? "text-rose-500" : "text-[#78716C]")}>
                {format(new Date(t.deadline), "d.M.")}
              </span>
            )}
          </Link>
        ))}
      </div>
    </Shell>
  );
}

function ProjectsWidget({ d }: { d: DashboardData }) {
  const counts: [string, string][] = [
    ["BEZI", "Běží"],
    ["V_PRIPRAVE", "V přípravě"],
    ["CEKA_NA_KLIENTA", "Čeká na klienta"],
  ];
  return (
    <Shell
      title="Projekty přehled"
      action={
        <Link href="/projects" className="text-xs text-[#6366F1] hover:underline flex items-center gap-1">
          Všechny <ArrowRight className="w-3 h-3" />
        </Link>
      }
    >
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {counts.map(([key, label]) => (
            <div key={key} className="text-center rounded-lg bg-white/40 border border-white/50 py-2">
              <p className="text-xl font-semibold text-[#1C1917]">{d.statusMap[key] || 0}</p>
              <p className="text-[10px] text-[#78716C]">{label}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {d.overdueProjects.slice(0, 5).map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1C1917] truncate">{p.name}</p>
                <p className="text-xs text-[#78716C]">{p.clientName}</p>
              </div>
              {p.deadline && <span className="text-xs text-rose-600 shrink-0">{format(new Date(p.deadline), "d.M.")}</span>}
            </Link>
          ))}
          {d.overdueProjects.length === 0 && <p className="text-sm text-[#78716C] text-center py-3">Žádné zakázky po deadline ✓</p>}
        </div>
      </div>
    </Shell>
  );
}

function RecentWidget({ d }: { d: DashboardData }) {
  return (
    <Shell title="Naposledy přidané">
      <div className="divide-y divide-black/5">
        {d.recentProjects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/40 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#1C1917] truncate">{p.name}</p>
              <p className="text-xs text-[#78716C]">{p.clientName}</p>
            </div>
            <ProjectStatusBadge status={p.status} />
          </Link>
        ))}
      </div>
    </Shell>
  );
}

const STATUS_ROWS: [string, string, string][] = [
  ["NOVY", "Nový", "bar-sky"],
  ["V_PRIPRAVE", "V přípravě", "bar-amber"],
  ["CEKA_NA_KLIENTA", "Čeká na klienta", "bar-violet"],
  ["BEZI", "Běží", "bar-emerald"],
  ["V_INTERNI_KONTROLE", "Interní kontrola", "bar-indigo"],
  ["V_KLIENTSKE_KONTROLE", "Klientská kontrola", "bar-violet"],
  ["DOKONCENO", "Dokončeno", "bar-teal"],
  ["FAKTUROVANO", "Fakturováno", "bar-stone"],
  ["ARCHIVOVANO", "Archivováno", "bar-stone"],
];

function StatusWidget({ d }: { d: DashboardData }) {
  const maxCount = Math.max(...Object.values(d.statusMap), 1);
  return (
    <Shell title="Stav zakázek">
      <div className="p-4 space-y-2.5">
        {STATUS_ROWS.map(([key, label, color]) => {
          const count = d.statusMap[key] || 0;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-[#78716C] w-28 shrink-0">{label}</span>
              <div className="flex-1 h-4 bg-white/40 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? "14px" : "0" }} />
              </div>
              <span className="text-xs text-[#78716C] w-5 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

/* ---------------- grid ---------------- */
export function DashboardGrid({
  data,
  initialLayout,
  newProjectSlot,
}: {
  data: DashboardData;
  initialLayout: string | null;
  newProjectSlot?: React.ReactNode;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);
  const editRef = useRef(false);
  const [editMode, setEditMode] = useState(false);

  // Widgets are rendered once — React never re-touches the grid DOM afterwards.
  const widgets = useMemo(
    () => (
      <>
        <div className="grid-stack-item" gs-id="stats" gs-x="0" gs-y="0" gs-w="12" gs-h="3" gs-min-w="6" gs-min-h="2">
          <div className="grid-stack-item-content">
            <div className="glass rounded-xl h-full"><StatsWidget d={data} /></div>
          </div>
        </div>
        <div className="grid-stack-item" gs-id="tasks" gs-x="0" gs-y="3" gs-w="6" gs-h="7" gs-min-w="3" gs-min-h="3">
          <div className="grid-stack-item-content"><TasksWidget d={data} /></div>
        </div>
        <div className="grid-stack-item" gs-id="projects" gs-x="6" gs-y="3" gs-w="6" gs-h="7" gs-min-w="3" gs-min-h="3">
          <div className="grid-stack-item-content"><ProjectsWidget d={data} /></div>
        </div>
        <div className="grid-stack-item" gs-id="recent" gs-x="0" gs-y="10" gs-w="6" gs-h="6" gs-min-w="3" gs-min-h="3">
          <div className="grid-stack-item-content"><RecentWidget d={data} /></div>
        </div>
        <div className="grid-stack-item" gs-id="status" gs-x="6" gs-y="10" gs-w="6" gs-h="7" gs-min-w="3" gs-min-h="3">
          <div className="grid-stack-item-content"><StatusWidget d={data} /></div>
        </div>
      </>
    ),
    [data]
  );

  useEffect(() => {
    if (!elRef.current) return;
    let grid: any;
    let cancelled = false;

    (async () => {
      const { GridStack } = await import("gridstack");
      if (cancelled || !elRef.current) return;
      grid = GridStack.init(
        {
          column: 12,
          cellHeight: 44,
          margin: 6,
          handle: ".widget-drag-handle",
          disableDrag: true,
          disableResize: true,
        },
        elRef.current
      );
      gridRef.current = grid;

      // Restore saved layout
      if (initialLayout) {
        try {
          const saved = JSON.parse(initialLayout);
          if (Array.isArray(saved) && saved.length) grid.load(saved, false);
        } catch {}
      }

      grid.on("change", () => {
        if (!editRef.current) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          const layout = grid.save(false) as any[];
          saveDashboardLayout(
            JSON.stringify(layout.map((n) => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h })))
          ).catch(() => {});
        }, 600);
      });
    })();

    let timer: ReturnType<typeof setTimeout>;
    return () => {
      cancelled = true;
      clearTimeout(timer);
      grid?.destroy(false);
      gridRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleEdit() {
    const next = !editMode;
    setEditMode(next);
    editRef.current = next;
    gridRef.current?.enableMove(next);
    gridRef.current?.enableResize(next);
  }

  async function handleReset() {
    await resetDashboardLayout();
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: GRID_EDIT_CSS }} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1C1917]">Dashboard</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            Vítej zpět, {data.userName} • {data.dateStr}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editMode && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-[#78716C] glass hover:bg-white/60"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Obnovit výchozí
            </button>
          )}
          <button
            onClick={toggleEdit}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
              editMode ? "btn-glass-primary text-white" : "glass text-[#57534E] hover:bg-white/60"
            )}
          >
            {editMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {editMode ? "Hotovo" : "Přizpůsobit"}
          </button>
          {newProjectSlot}
        </div>
      </div>

      {editMode && (
        <p className="text-xs text-[#78716C] -mt-1">
          Přetahuj okna za úchyt <GripVertical className="w-3 h-3 inline" /> v hlavičce, velikost měň tažením za pravý dolní roh. Rozložení se ukládá automaticky.
        </p>
      )}

      <div className={cn("dashboard-grid grid-stack", editMode && "grid--edit")} ref={elRef}>
        {widgets}
      </div>
    </div>
  );
}
