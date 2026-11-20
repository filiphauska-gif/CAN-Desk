"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import "gridstack/dist/gridstack.min.css";
import { format } from "date-fns";
import {
  ArrowRight,
  AlertTriangle,
  Check,
  CheckSquare,
  Clock,
  FolderKanban,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectStatusBadge, TaskStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { completeTask } from "@/server/actions/tasks";
import { useRouter } from "next/navigation";
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
    note?: string | null;
    projectName: string;
    clientName: string | null;
    projectId: string;
  }[];
  overdueProjects: { id: string; name: string; clientName: string; deadline: string | null }[];
  recentProjects: { id: string; name: string; clientName: string; status: string }[];
  today: string;
};

const GRID_EDIT_CSS = `
  /* Custom cursors with dark outline — visible on white glass */
  .dashboard-grid .widget-titlebar {
    cursor: grab;
  }
  .dashboard-grid .widget-titlebar:active {
    cursor: grabbing;
  }

  /* Smooth movement + resize */
  .dashboard-grid .grid-stack-item > .grid-stack-item-content {
    overflow: hidden;
    border-radius: .75rem;
    background: transparent;
    transition: box-shadow .25s ease;
  }
  .dashboard-grid.grid-stack-animate .grid-stack-item {
    transition: left .28s cubic-bezier(.22,.82,.28,1), top .28s cubic-bezier(.22,.82,.28,1),
                width .28s cubic-bezier(.22,.82,.28,1), height .28s cubic-bezier(.22,.82,.28,1);
  }
  .dashboard-grid .grid-stack-item:hover > .grid-stack-item-content {
    box-shadow: 0 14px 34px -14px rgba(76,71,106,.22);
  }

  /* Drop placeholder + dragged widget: rounded, matching widget corners */
  .dashboard-grid .grid-stack-placeholder > .placeholder-content {
    border-radius: .75rem !important;
    background: rgba(99, 102, 241, 0.06) !important;
    border: 1px dashed rgba(99, 102, 241, 0.28) !important;
    box-shadow: none !important;
  }
  .dashboard-grid .ui-draggable-dragging > .grid-stack-item-content {
    border-radius: .75rem !important;
    box-shadow: 0 18px 44px -16px rgba(28, 25, 23, 0.28) !important;
  }

  /* Invisible resize hit-zones — custom outlined cursors on hover */
  .dashboard-grid .ui-resizable-handle {
    opacity: 0 !important;
    background: none !important;
    background-image: none !important;
  }
  .dashboard-grid .ui-resizable-e  { width: 10px;  right: 0;  top: 6px; bottom: 6px; }
  .dashboard-grid .ui-resizable-w  { width: 10px;  left: 0;   top: 6px; bottom: 6px; }
  .dashboard-grid .ui-resizable-s  { height: 10px; bottom: 0; left: 6px; right: 6px; }
  .dashboard-grid .ui-resizable-se { width: 18px;  height: 18px; right: 0; bottom: 0; }
  .dashboard-grid .ui-resizable-sw { width: 18px;  height: 18px; left: 0;  bottom: 0; }
  .dashboard-grid .ui-resizable-e, .dashboard-grid .ui-resizable-w {
    cursor: ew-resize;
  }
  .dashboard-grid .ui-resizable-s {
    cursor: ns-resize;
  }
  .dashboard-grid .ui-resizable-se {
    cursor: nwse-resize;
  }
  .dashboard-grid .ui-resizable-sw {
    cursor: nesw-resize;
  }
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
      <div className="widget-titlebar flex items-center justify-between px-4 py-2.5 border-b border-black/5 shrink-0 select-none">
        <h2 className="text-sm font-semibold text-[#1C1917]">{title}</h2>
        {action}
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
      <div className="widget-titlebar absolute top-0 left-0 right-0 h-4" />
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
  const router = useRouter();
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
          <div key={t.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/40 transition-colors">
            <Link
              href={t.projectId ? `/projects/${t.projectId}` : "/tasks"}
              className="flex-1 min-w-0 text-sm text-[#1C1917] truncate"
            >
              {t.title}
            </Link>
            {t.priority > 0 && <PriorityBadge priority={t.priority} />}
            {t.deadline && (
              <span className={cn("text-xs shrink-0", t.overdue ? "text-rose-500" : "text-[#78716C]")}>
                {format(new Date(t.deadline), "d.M.")}
              </span>
            )}
            <button
              onClick={async () => {
                await completeTask(t.id);
                router.refresh();
              }}
              title="Označit jako hotové"
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function ProjectsWidget({ d }: { d: DashboardData }) {
  const counts: [string, string][] = [
    ["OTEVRENO", "Otevřeno"],
    ["CEKA", "Čeká"],
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
  ["CEKA", "Čeká", "bar-amber"],
  ["OTEVRENO", "Otevřeno", "bar-emerald"],
  ["HOTOVO", "Hotovo", "bar-teal"],
  ["UZAVRENO", "Uzavřeno", "bar-indigo"],
  ["ZRUSENO", "Zrušeno", "bar-stone"],
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
        <div className="grid-stack-item" gs-id="recent" gs-x="0" gs-y="10" gs-w="6" gs-h="7" gs-min-w="3" gs-min-h="3">
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
          columnOpts: {
            breakpointForWindow: true,
            breakpoints: [{ w: 768, c: 1 }],
          },
          handle: ".widget-titlebar",
          draggable: { cancel: "a, button, input, select, textarea" },
          resizable: { handles: "e, w, s, se, sw" },
          animate: true,
        },
        elRef.current
      );
      gridRef.current = grid;

      // Restore saved layout — only if every entry is complete & valid
      if (initialLayout) {
        try {
          const saved = JSON.parse(initialLayout);
          const valid =
            Array.isArray(saved) &&
            saved.length > 0 &&
            saved.every(
              (n: any) =>
                typeof n?.id === "string" &&
                [n.x, n.y, n.w, n.h].every((v) => typeof v === "number" && Number.isFinite(v))
            );
          if (valid) grid.load(saved, false);
        } catch {}
      }

      grid.on("change", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          // Never persist a mobile (single column) layout over the desktop one
          if ((grid.getColumn?.() ?? 12) !== 12) return;
          // Read authoritative state from the engine (always complete values)
          const layout = (grid.engine?.nodes || [])
            .filter((n: any) => n.id && [n.x, n.y, n.w, n.h].every((v: any) => typeof v === "number" && Number.isFinite(v)))
            .map((n: any) => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h }));
          if (layout.length !== 5) return; // never persist incomplete layouts
          saveDashboardLayout(JSON.stringify(layout)).catch(() => {});
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
        </div>
        <div className="flex items-center gap-2">
          {newProjectSlot}
        </div>
      </div>

      <div className="dashboard-grid grid-stack" ref={elRef}>
        {widgets}
      </div>
    </div>
  );
}
