import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjects } from "@/server/actions/projects";
import { getClients } from "@/server/actions/clients";
import { prisma } from "@/lib/db";
import { ProjectStatusBadge } from "@/components/shared/status-badges";
import { ProjectFilters } from "./project-filters";
import { ProjectsList } from "./projects-list";
import Link from "next/link";
import { format } from "date-fns";
import { FolderKanban } from "lucide-react";
import { NewProjectDialog } from "@/app/(authenticated)/new-project-dialog";
import { projectHealth } from "@/lib/project-health";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const filters = {
    status: params.status,
    clientId: params.clientId,
    accountId: params.accountId,
    search: params.search,
  };
  const [allProjects, clients] = await Promise.all([getProjects(filters), getClients()]);
  const projects =
    filters.status === "ALL"
      ? allProjects
      : filters.status
        ? allProjects.filter((p: any) => p.status === filters.status)
        : allProjects.filter((p: any) => !["UZAVRENO", "ZRUSENO"].includes(p.status));
  const [users, overdueGroup, hoursGroup, budgetDocs] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
    }),
    prisma.task.groupBy({
      by: ["projectId"],
      where: { deadline: { lt: new Date() }, status: { not: "HOTOVO" } },
      _count: { id: true },
    }),
    prisma.timeEntry.groupBy({
      by: ["projectId"],
      where: { entryType: "WORK" },
      _sum: { hours: true },
    }),
    prisma.budgetDocument.findMany({
      where: { projectId: { not: null }, status: { notIn: ["UZAVRENO", "ZRUSENO"] } },
      select: { projectId: true, discountAmount: true, lines: { select: { totalExclVat: true } } },
    }),
  ]);
  const overdueByProject = Object.fromEntries(overdueGroup.map((g) => [g.projectId, g._count.id]));
  const hoursByProject = Object.fromEntries(hoursGroup.map((g) => [g.projectId, g._sum.hours || 0]));
  // true budget = sum of budget document lines (source of truth), not the legacy project field
  const budgetByProject: Record<string, number> = {};
  for (const doc of budgetDocs) {
    if (!doc.projectId) continue;
    const net =
      doc.lines.reduce((s, l) => s + (l.totalExclVat || 0), 0) - (doc.discountAmount || 0);
    budgetByProject[doc.projectId] = Math.max(0, net);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1C1917]">Zakázky</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {projects.length} zakázek
          </p>
        </div>
        <NewProjectDialog users={users} />
      </div>

      <ProjectFilters clients={clients} />

      {/* Project list with quick peek */}
      <ProjectsList
        projects={projects.map((p: any) => {
          const health = projectHealth({
            status: p.status,
            deadline: p.deadline ? new Date(p.deadline) : null,
            overdueTasks: overdueByProject[p.id] || 0,
            workedHours: hoursByProject[p.id] || 0,
            plannedHours: p.budgetHours || 0,
          });
          return {
            id: p.id,
            name: p.name,
            status: p.status,
            clientName: p.client.name,
            accountName: p.account?.name ?? null,
            deadline: p.deadline ? new Date(p.deadline).toISOString() : null,
            budgetAmount: budgetByProject[p.id] ?? null,
            description: p.description ?? null,
            tasksCount: p._count.tasks,
            timeCount: p._count.timeEntries,
            healthLabel: health.label,
            healthLevel: health.level,
            healthDetail: health.detail,
          };
        })}
      />
    </div>
  );
}
