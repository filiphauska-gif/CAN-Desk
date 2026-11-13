"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { FolderKanban, Eye, X, ArrowRight, Loader2, Calendar, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectStatusBadge, TaskStatusBadge } from "@/components/shared/status-badges";
import { BudgetBarsCard } from "@/components/shared/budget-bars";
import {
  getProjectQuickView,
  type QuickView,
} from "@/server/actions/finance-overview";

export type ProjectListItem = {
  id: string;
  name: string;
  status: string;
  clientName: string;
  accountName: string | null;
  deadline: string | null;
  budgetAmount: number | null;
  description: string | null;
  tasksCount: number;
  timeCount: number;
};

/* ---------------- drawer ---------------- */
function QuickPeekDrawer({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<QuickView | null>(null);

  useEffect(() => {
    let alive = true;
    getProjectQuickView(projectId).then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] animate-[fadeIn_.2s_ease]" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[440px] max-w-[92vw] glass-strong border-l border-white/60 shadow-2xl overflow-y-auto animate-[slideIn_.25s_cubic-bezier(.22,.82,.28,1)]">
        <style>{`
          @keyframes slideIn { from { transform: translateX(24px); opacity: .4 } to { transform: none; opacity: 1 } }
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        `}</style>

        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-black/5 bg-white/40 backdrop-blur-xl">
          <p className="text-sm font-semibold text-[#1C1917]">Rychlý náhled</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/60 transition-colors">
            <X className="w-4 h-4 text-[#78716C]" />
          </button>
        </div>

        {!data ? (
          <div className="flex items-center justify-center py-24 text-[#78716C]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-[#1C1917]">{data.project.name}</h2>
                <ProjectStatusBadge status={data.project.status} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-[#78716C]">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {data.project.clientName}
                </span>
                {data.project.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(data.project.deadline), "d.M.yyyy")}
                  </span>
                )}
                {data.project.accountName && <span>{data.project.accountName}</span>}
              </div>
            </div>

            {/* Finance */}
            <BudgetBarsCard projectId={projectId} overview={data.finance} canEdit={false} compact />

            {/* Tasks */}
            <div className="glass rounded-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
                <h3 className="text-sm font-semibold text-[#1C1917]">Úkoly</h3>
                <p className="text-xs text-[#78716C]">
                  {data.tasks.done}/{data.tasks.total} hotovo
                  {data.tasks.overdue > 0 && (
                    <span className="text-rose-600 font-medium"> · {data.tasks.overdue} po termínu</span>
                  )}
                </p>
              </div>
              <div className="divide-y divide-black/5">
                {data.tasks.recent.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 px-4 py-2.5">
                    <TaskStatusBadge status={t.status} />
                    <p className="text-xs text-[#1C1917] flex-1 min-w-0 truncate">{t.title}</p>
                    {t.deadline && (
                      <span className="text-[10px] text-[#78716C] shrink-0">
                        {format(new Date(t.deadline), "d.M.")}
                      </span>
                    )}
                  </div>
                ))}
                {data.tasks.recent.length === 0 && (
                  <p className="px-4 py-6 text-xs text-[#78716C] text-center">Žádné úkoly</p>
                )}
              </div>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide text-[#A8A29E]">Odpracováno</p>
                <p className="text-lg font-semibold text-[#1C1917]">
                  {data.time.totalHours % 1 === 0 ? data.time.totalHours : data.time.totalHours.toFixed(1)} h
                </p>
              </div>
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide text-[#A8A29E]">Tento měsíc</p>
                <p className="text-lg font-semibold text-[#1C1917]">
                  {data.time.monthHours % 1 === 0 ? data.time.monthHours : data.time.monthHours.toFixed(1)} h
                </p>
              </div>
            </div>

            {/* CTA */}
            <Link
              href={`/projects/${projectId}`}
              className="btn-glass-primary w-full text-white text-sm font-medium rounded-xl px-4 py-2.5 flex items-center justify-center gap-2"
            >
              Otevřít zakázku <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ---------------- list ---------------- */
export function ProjectsList({ projects }: { projects: ProjectListItem[] }) {
  const [peekId, setPeekId] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="glass rounded-xl p-5 hover:border-[#6366F1]/30 hover:shadow-sm transition-all relative group"
          >
            <Link href={`/projects/${project.id}`} className="block">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-[#1C1917] truncate">{project.name}</h3>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                    <span className="text-xs text-[#78716C]">{project.clientName}</span>
                    {project.accountName && (
                      <span className="text-xs text-[#78716C]">{project.accountName}</span>
                    )}
                    {project.deadline && (
                      <span className="text-xs text-[#78716C]">
                        Deadline: {format(new Date(project.deadline), "d.M.yyyy")}
                      </span>
                    )}
                    {project.budgetAmount && (
                      <span className="text-xs text-[#78716C]">
                        Rozpočet: {project.budgetAmount.toLocaleString("cs-CZ")} Kč
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-xs text-[#A8A29E] mt-2 line-clamp-1">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#1C1917]">{project.tasksCount}</p>
                    <p className="text-xs text-[#78716C]">úkolů</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#1C1917]">{project.timeCount}</p>
                    <p className="text-xs text-[#78716C]">časů</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Quick peek button */}
            <button
              onClick={() => setPeekId(project.id)}
              title="Rychlý náhled"
              className={cn(
                "absolute top-3 right-3 p-2 rounded-lg glass text-[#78716C] hover:text-[#6366F1] hover:bg-white/70 transition-all",
                "opacity-0 group-hover:opacity-100"
              )}
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <FolderKanban className="w-12 h-12 text-[#D6D3D1] mx-auto mb-3" />
            <p className="text-[#78716C]">Žádné projekty neodpovídají filtrům</p>
          </div>
        )}
      </div>

      {peekId && <QuickPeekDrawer projectId={peekId} onClose={() => setPeekId(null)} />}
    </>
  );
}
