import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getMyTasks } from "@/server/actions/tasks";
import { ProjectStatusBadge, TaskStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import Link from "next/link";
import { format, isAfter, isBefore } from "date-fns";
import { cs } from "date-fns/locale";
import { Plus, ArrowRight, AlertTriangle, Clock, CheckSquare, FolderKanban } from "lucide-react";
import { NewProjectDialog } from "./new-project-dialog";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  const [myTasks, projects, statusCounts, users, recentProjects] = await Promise.all([
    getMyTasks(user.id),
    prisma.project.findMany({
      include: { client: { select: { name: true } }, account: { select: { name: true } } },
      orderBy: { deadline: "asc" },
    }),
    prisma.project.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true } }),
    prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    }),
  ]);

  const today = new Date();
  const overdueProjects = projects.filter(
    (p) => p.deadline && isBefore(p.deadline, today) && p.status !== "DOKONCENO" && p.status !== "ARCHIVOVANO" && p.status !== "FAKTUROVANO"
  );
  const atRiskProjects = projects.filter(
    (p) =>
      p.deadline &&
      isAfter(p.deadline, today) &&
      isBefore(p.deadline, new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) &&
      p.status !== "DOKONCENO" &&
      p.status !== "ARCHIVOVANO"
  );

  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1C1917]">Dashboard</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            Vítej zpět, {user.name} •{" "}
            {format(today, "EEEE d. MMMM yyyy", { locale: cs })}
          </p>
        </div>
        <NewProjectDialog users={users} />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#78716C]">Moje úkoly</p>
            <CheckSquare className="w-4 h-4 text-[#6366F1]" />
          </div>
          <p className="text-2xl font-semibold text-[#1C1917] mt-1">
            {myTasks.length}
          </p>
          <p className="text-xs text-[#78716C] mt-1">nehotových úkolů</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#78716C]">Aktivní zakázky</p>
            <FolderKanban className="w-4 h-4 text-[#6366F1]" />
          </div>
          <p className="text-2xl font-semibold text-[#1C1917] mt-1">
            {projects.filter((p) => p.status === "BEZI").length}
          </p>
          <p className="text-xs text-[#78716C] mt-1">
            z {projects.length} celkem
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#78716C]">Po deadline</p>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-semibold text-[#1C1917] mt-1">
            {overdueProjects.length}
          </p>
          <p className="text-xs text-rose-500 mt-1">vyžaduje pozornost</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#78716C]">V riziku</p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-semibold text-[#1C1917] mt-1">
            {atRiskProjects.length}
          </p>
          <p className="text-xs text-amber-600 mt-1">deadline do 7 dnů</p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My tasks */}
        <div className="glass rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
            <h2 className="text-sm font-semibold text-[#1C1917]">Moje úkoly</h2>
            <Link
              href="/tasks"
              className="text-xs text-[#6366F1] hover:underline flex items-center gap-1"
            >
              Všechny úkoly <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-black/5">
            {myTasks.length === 0 && (
              <p className="px-5 py-8 text-sm text-[#78716C] text-center">
                Žádné nehotové úkoly. Skvělá práce! 🎉
              </p>
            )}
            {myTasks.slice(0, 8).map((task) => (
              <Link
                key={task.id}
                href={`/projects/${task.projectId}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-white/40 transition-colors"
              >
                <TaskStatusBadge status={task.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1C1917] truncate">{task.title}</p>
                  <p className="text-xs text-[#78716C] truncate">
                    {task.project.name}
                    {task.project.client && ` • ${task.project.client.name}`}
                  </p>
                </div>
                {task.priority > 0 && <PriorityBadge priority={task.priority} />}
                {task.deadline && (
                  <span
                    className={`text-xs shrink-0 ${
                      isBefore(task.deadline, today)
                        ? "text-rose-500"
                        : "text-[#78716C]"
                    }`}
                  >
                    {format(task.deadline, "d.M.")}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Projects Overview */}
        <div className="glass rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
            <h2 className="text-sm font-semibold text-[#1C1917]">
              Projekty přehled
            </h2>
            <Link
              href="/projects"
              className="text-xs text-[#6366F1] hover:underline flex items-center gap-1"
            >
              Všechny zakázky <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                ["BEZI", "Běží", "emerald"],
                ["V_PRIPRAVE", "V přípravě", "amber"],
                ["CEKA_NA_KLIENTA", "Čeká na klienta", "purple"],
              ].map(([key, label]) => (
                <div key={key} className="text-center">
                  <p className="text-2xl font-semibold text-[#1C1917]">
                    {statusMap[key] || 0}
                  </p>
                  <p className="text-xs text-[#78716C]">{label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {overdueProjects.slice(0, 3).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1C1917] truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-[#78716C]">
                      {project.client.name}
                    </p>
                  </div>
                  <span className="text-xs text-rose-600 shrink-0">
                    {project.deadline && format(project.deadline, "d.M.")}
                  </span>
                </Link>
              ))}
              {overdueProjects.length === 0 && (
                <p className="text-sm text-[#78716C] text-center py-4">
                  Žádné zakázky po deadline ✓
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recent projects */}
        <div className="glass rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
            <h2 className="text-sm font-semibold text-[#1C1917]">
              Naposledy přidané
            </h2>
          </div>
          <div className="divide-y divide-black/5">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1C1917] truncate">
                    {project.name}
                  </p>
                  <p className="text-xs text-[#78716C]">{project.client.name}</p>
                </div>
                <ProjectStatusBadge status={project.status} />
              </Link>
            ))}
          </div>
        </div>

        {/* Status distribution */}
        <div className="glass rounded-xl">
          <div className="px-5 py-4 border-b border-black/5">
            <h2 className="text-sm font-semibold text-[#1C1917]">
              Stav zakázek
            </h2>
          </div>
          <div className="p-5 space-y-3">
            {[
              ["NOVY", "Nový", "bar-sky"],
              ["V_PRIPRAVE", "V přípravě", "bar-amber"],
              ["CEKA_NA_KLIENTA", "Čeká na klienta", "bar-violet"],
              ["BEZI", "Běží", "bar-emerald"],
              ["V_INTERNI_KONTROLE", "Interní kontrola", "bar-indigo"],
              ["V_KLIENTSKE_KONTROLE", "Klientská kontrola", "bar-violet"],
              ["DOKONCENO", "Dokončeno", "bar-teal"],
              ["FAKTUROVANO", "Fakturováno", "bar-stone"],
              ["ARCHIVOVANO", "Archivováno", "bar-stone"],
            ].map(([key, label, color]) => {
              const count = statusMap[key] || 0;
              const maxCount = Math.max(...Object.values(statusMap), 1);
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-[#78716C] w-28 shrink-0">
                    {label}
                  </span>
                  <div className="flex-1 h-5 bg-white/35 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${color}`}
                      style={{
                        width: `${(count / maxCount) * 100}%`,
                        minWidth: count > 0 ? "16px" : "0",
                      }}
                    />
                  </div>
                  <span className="text-xs text-[#78716C] w-6 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
