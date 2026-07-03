import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProject } from "@/server/actions/projects";
import { ProjectStatusBadge } from "@/components/shared/status-badges";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Building2, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { ProjectDetailTabs } from "./project-detail-tabs";
import { ProjectStatusSwitcher } from "@/components/shared/project-status-switcher";
import { getBudgetByProject } from "@/server/actions/budget-new";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  const project = await getProject(id);
  if (!project) notFound();

  const activeTab = (await searchParams).tab || "prehled";
  const canEdit = ["ADMIN", "FINANCE", "ACCOUNT_MANAGER", "PROJECT_MANAGER"].includes(user.role);

  // Calculate time summary
  const totalHours = project.timeEntries.reduce((s, e) => s + e.hours, 0);
  const billableHours = project.timeEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);

  const projectUsers = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const budget = await getBudgetByProject(id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="p-2 rounded-lg hover:bg-[#F5F5F4] text-[#78716C] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-[#1C1917] truncate">
              {project.name}
            </h1>
            <ProjectStatusSwitcher
              projectId={id}
              currentStatus={project.status}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-[#78716C]">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {project.client.name}
            </span>
            {(project.account as any)?.name && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {(project.account as any).name}
              </span>
            )}
            {project.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Deadline: {format(project.deadline, "d.M.yyyy")}
              </span>
            )}
            {project.budgetAmount && (
              <span className="flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                Rozpočet: {project.budgetAmount.toLocaleString("cs-CZ")} Kč
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description / Brief */}
      {project.description && (
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4">
          <p className="text-sm text-[#1C1917] whitespace-pre-wrap">{project.description}</p>
        </div>
      )}

      {/* Tab navigation */}
      <ProjectDetailTabs
        projectId={id}
        activeTab={activeTab}
        project={project}
        user={user}
        canEdit={canEdit}
        totalHours={totalHours}
        billableHours={billableHours}
        projectUsers={projectUsers}
        budget={budget}
      />
    </div>
  );
}
