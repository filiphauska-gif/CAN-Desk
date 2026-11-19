"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  FolderKanban,
  ChevronDown,
  ArrowRight,
  Loader2,
  Building2,
  Calendar,
  Clock,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectStatusBadge, TaskStatusBadge } from "@/components/shared/status-badges";
import { BudgetBarsCard } from "@/components/shared/budget-bars";
import { getProjectQuickView, type QuickView } from "@/server/actions/finance-overview";

export type ProjectListItem = {
  id: string;
  jobNumber?: string | null;
  name: string;
  status: string;
  clientName: string;
  accountName: string | null;
  deadline: string | null;
  budgetAmount: number | null;
  description: string | null;
  tasksCount: number;
  timeCount: number;
  healthLabel?: string;
  healthLevel?: "ok" | "warn" | "risk";
  healthDetail?: string;
};

/* ---------------- expanded panel ---------------- */
function PeekPanel({
  projectId,
  data,
  onToggle,
}: {
  projectId: string;
  data: QuickView | undefined;
  onToggle: () => void;
}) {
  if (!data) {
    return (
      <div className="flex items-center justify-center py-10 text-[#78716C]">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4">
      {/* Finance */}
      <BudgetBarsCard projectId={projectId} overview={data.finance} canEdit={false} compact />

      {/* Tasks */}
      <div className="glass rounded-xl flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
          <h3 className="text-sm font-semibold text-[#1C1917] flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-[#A8A29E]" /> Úkoly
          </h3>
          <p className="text-xs text-[#78716C]">
            {data.tasks.done}/{data.tasks.total} hotovo
            {data.tasks.overdue > 0 && (
              <span className="text-rose-600 font-medium"> · {data.tasks.overdue} po termínu</span>
            )}
          </p>
        </div>
        <div className="divide-y divide-black/5 max-h-56 overflow-y-auto">
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

      {/* Time + CTA */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-[#A8A29E] flex items-center gap-1">
              <Clock className="w-3 h-3" /> Odpracováno
            </p>
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
        <div className="glass rounded-xl px-4 py-3 text-xs text-[#78716C] space-y-1 flex-1">
          <p className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3" /> {data.project.clientName}
          </p>
          {data.project.deadline && (
            <p className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Deadline: {format(new Date(data.project.deadline), "d.M.yyyy")}
            </p>
          )}
          {data.project.accountName && <p>Account: {data.project.accountName}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/projects/${projectId}`}
            className="btn-glass-primary flex-1 text-white text-sm font-medium rounded-xl px-4 py-2.5 flex items-center justify-center gap-2"
          >
            Otevřít zakázku <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={onToggle}
            title="Sbalit náhled"
            className="glass rounded-xl px-3 flex items-center justify-center text-[#78716C] hover:text-[#6366F1] hover:bg-white/70 transition-all"
          >
            <ChevronDown className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- list ---------------- */
export function ProjectsList({ projects }: { projects: ProjectListItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, QuickView | null>>({});

  function toggle(id: string) {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next && !(next in cache)) {
      getProjectQuickView(next).then((d) => setCache((c) => ({ ...c, [next]: d })));
    }
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => {
        const open = openId === project.id;
        return (
          <div key={project.id} className="glass rounded-xl relative">
            <Link href={`/projects/${project.id}`} className="block p-5 pr-14">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    {project.jobNumber && (
                      <span className="text-[10px] font-semibold text-[#6366F1] bg-[#6366F1]/10 rounded px-1.5 py-0.5 shrink-0">
                        {project.jobNumber}
                      </span>
                    )}
                    <h3 className="font-medium text-[#1C1917] truncate">{project.name}</h3>
                    <ProjectStatusBadge status={project.status} />
                    {project.healthLevel && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] text-[#78716C]"
                        title={project.healthDetail || project.healthLabel}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            project.healthLevel === "risk"
                              ? "bg-rose-500"
                              : project.healthLevel === "warn"
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          )}
                        />
                        {project.healthLabel}
                      </span>
                    )}
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

            {/* Expand toggle - bottom right (only when collapsed) */}
            {!open && (
              <button
                onClick={() => toggle(project.id)}
                title="Rozbalit náhled"
                className="absolute bottom-3 right-3 p-2 rounded-lg text-[#A8A29E] hover:text-[#6366F1] hover:bg-white/70 transition-all"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}

            {/* Expandable panel */}
            <div
              className={cn(
                "peek-panel grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 border-t border-black/5">
                  <PeekPanel
                    projectId={project.id}
                    data={cache[project.id]}
                    onToggle={() => toggle(project.id)}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {projects.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <FolderKanban className="w-12 h-12 text-[#D6D3D1] mx-auto mb-3" />
          <p className="text-[#78716C]">Žádné projekty neodpovídají filtrům</p>
        </div>
      )}
    </div>
  );
}
