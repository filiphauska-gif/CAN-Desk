import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTasks, getMyTasks } from "@/server/actions/tasks";
import { TaskStatusBadge, PriorityBadge, taskStatusLabels } from "@/components/shared/status-badges";
import Link from "next/link";
import { format, isBefore } from "date-fns";
import { CheckSquare, Filter } from "lucide-react";

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
  if (view === "mine") {
    tasks = await getMyTasks(user.id);
  } else if (view === "team") {
    tasks = await getTasks({ status: params.status || undefined });
  } else if (view === "all") {
    tasks = await getTasks({ status: params.status || undefined });
  } else {
    tasks = await getMyTasks(user.id);
  }

  const statusCounts = await prisma.task.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#1C1917]">Úkoly</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/tasks?view=mine"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              view === "mine" ? "bg-[#6366F1] text-white" : "bg-white border border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917]"
            }`}
          >
            Moje
          </Link>
          <Link
            href="/tasks?view=all"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              view === "all" ? "bg-[#6366F1] text-white" : "bg-white border border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917]"
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
                ? "bg-[#6366F1] text-white border-[#6366F1]"
                : "bg-white border-[#E7E5E4] text-[#78716C] hover:border-[#6366F1]"
            }`}
          >
            {label} ({statusMap[key] || 0})
          </Link>
        ))}
        {params.status && (
          <Link
            href={`/tasks?view=${view}`}
            className="px-3 py-1.5 rounded-lg text-xs text-[#78716C] hover:text-[#1C1917]"
          >
            ✕ Vymazat filtr
          </Link>
        )}
      </div>

      {/* Tasks list */}
      <div className="bg-white rounded-xl border border-[#E7E5E4]">
        <div className="divide-y divide-[#E7E5E4]">
          {tasks.map((task: any) => (
            <Link
              key={task.id}
              href={`/projects/${task.projectId}?tab=ukoly`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-[#F5F5F4] transition-colors"
            >
              <TaskStatusBadge status={task.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1C1917] truncate">{task.title}</p>
                <p className="text-xs text-[#78716C] truncate">
                  {task.project.name}
                  {task.project.client && ` • ${task.project.client.name}`}
                  {task.assignee && ` • ${task.assignee.name}`}
                </p>
              </div>
              {task.priority > 0 && <PriorityBadge priority={task.priority} />}
              {task.deadline && (
                <span
                  className={`text-xs shrink-0 ${
                    isBefore(new Date(task.deadline), new Date()) && task.status !== "DONE"
                      ? "text-red-500 font-medium"
                      : "text-[#78716C]"
                  }`}
                >
                  {format(new Date(task.deadline), "d.M.")}
                </span>
              )}
            </Link>
          ))}
          {tasks.length === 0 && (
            <div className="px-5 py-12 text-center">
              <CheckSquare className="w-12 h-12 text-[#D6D3D1] mx-auto mb-3" />
              <p className="text-[#78716C]">Žádné úkoly</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
