import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjects } from "@/server/actions/projects";
import { getClients } from "@/server/actions/clients";
import { prisma } from "@/lib/db";
import { ProjectStatusBadge } from "@/components/shared/status-badges";
import { ProjectFilters } from "./project-filters";
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

      {/* Project list */}
      <div className="space-y-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="bg-white rounded-xl border border-[#E7E5E4] p-5 hover:border-[#6366F1]/30 hover:shadow-sm transition-all block"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-[#1C1917] truncate">
                    {project.name}
                  </h3>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  <span className="text-xs text-[#78716C]">
                    {project.client.name}
                  </span>
                  {(project as any).account?.name && (
                    <span className="text-xs text-[#78716C]">
                      {(project as any).account.name}
                    </span>
                  )}
                  {project.deadline && (
                    <span className="text-xs text-[#78716C]">
                      Deadline: {format(project.deadline, "d.M.yyyy")}
                    </span>
                  )}
                  {project.budgetAmount && (
                    <span className="text-xs text-[#78716C]">
                      Rozpočet: {project.budgetAmount.toLocaleString("cs-CZ")} Kč
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-xs text-[#A8A29E] mt-2 line-clamp-1">
                    {project.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-sm font-medium text-[#1C1917]">
                    {project._count.tasks}
                  </p>
                  <p className="text-xs text-[#78716C]">úkolů</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-[#1C1917]">
                    {project._count.timeEntries}
                  </p>
                  <p className="text-xs text-[#78716C]">časů</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="bg-white rounded-xl border border-[#E7E5E4] p-12 text-center">
            <FolderKanban className="w-12 h-12 text-[#D6D3D1] mx-auto mb-3" />
            <p className="text-[#78716C]">Žádné projekty neodpovídají filtrům</p>
          </div>
        )}
      </div>
    </div>
  );
}
