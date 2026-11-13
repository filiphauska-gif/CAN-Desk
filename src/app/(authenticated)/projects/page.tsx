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
  const projects = await getProjects(filters);
  const clients = await getClients();
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
  });

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
        projects={projects.map((p: any) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          clientName: p.client.name,
          accountName: p.account?.name ?? null,
          deadline: p.deadline ? new Date(p.deadline).toISOString() : null,
          budgetAmount: p.budgetAmount ?? null,
          description: p.description ?? null,
          tasksCount: p._count.tasks,
          timeCount: p._count.timeEntries,
        }))}
      />
    </div>
  );
}
