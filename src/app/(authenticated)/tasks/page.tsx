import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTasks, getMyTasks } from "@/server/actions/tasks";
import { taskStatusLabels } from "@/components/shared/status-badges";
import { TasksList } from "./tasks-list";
import Link from "next/link";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  const params = await searchParams;
  const view = params.view || "mine";

  let tasks: any[];
  if (view === "all") {
    tasks = await getTasks({ status: params.status || undefined });
  } else {
    tasks = await getMyTasks(user.id);
  }

  const [statusCounts, projects, users] = await Promise.all([
    prisma.task.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id]));

  const rows = tasks.map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    estimatedHours: t.estimatedHours,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    projectId: t.projectId,
    projectName: t.project?.name || "",
    clientName: t.project?.client?.name || null,
    assignees: (t.assignments || []).map((a: any) => ({ id: a.user.id, name: a.user.name })),
    attachments: (t.attachments || []).map((a: any) => ({ id: a.id, name: a.name, size: a.size })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#1C1917]">Úkoly</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/tasks?view=mine"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              view === "mine" ? "btn-glass-primary text-white" : "bg-white border border-white/40 text-[#78716C] hover:text-[#1C1917]"
            }`}
          >
            Moje
          </Link>
          <Link
            href="/tasks?view=all"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              view === "all" ? "btn-glass-primary text-white" : "bg-white border border-white/40 text-[#78716C] hover:text-[#1C1917]"
            }`}
          >
            Všechny
          </Link>
        </div>
      </div>

      {/* Status counts */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(taskStatusLabels).map(([key, label]) => (
          <Link
            key={key}
            href={`/tasks?view=${view}&status=${key}`}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              params.status === key
                ? "btn-glass-primary text-white border-[#6366F1]"
                : "bg-white border-white/40 text-[#78716C] hover:border-[#6366F1]"
            }`}
          >
            {label} ({statusMap[key] || 0})
          </Link>
        ))}
        {params.status && (
          <Link href={`/tasks?view=${view}`} className="px-3 py-1.5 rounded-lg text-xs text-[#78716C] hover:text-[#1C1917]">
            ✕ Vymazat filtr
          </Link>
        )}
      </div>

      <TasksList tasks={rows} projects={projects} users={users} />
    </div>
  );
}
