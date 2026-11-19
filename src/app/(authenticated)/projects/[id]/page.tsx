import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProject } from "@/server/actions/projects";
import { ProjectStatusBadge } from "@/components/shared/status-badges";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Building2, Wallet, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { ProjectDetailTabs } from "./project-detail-tabs";
import { ProjectStatusSwitcher } from "@/components/shared/project-status-switcher";
import { getBudgetByProject } from "@/server/actions/budget-new";
import { getProjectFinanceOverview } from "@/server/actions/finance-overview";
import { ProjectEditDialog } from "./project-edit-dialog";
import { DuplicateProjectButton } from "./duplicate-project-button";
import { projectHealth } from "@/lib/project-health";

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
  const financeOverview = await getProjectFinanceOverview(id);

  const [invoices, orders] = await Promise.all([
    prisma.invoice.findMany({
      where: { projectId: id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { date: "desc" },
    }),
    prisma.order.findMany({
      where: { projectId: id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { date: "desc" },
    }),
  ]);

  const attachments = await prisma.attachment.findMany({
    where: { projectId: id },
    select: { id: true, name: true, mime: true, size: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const clients = await prisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Show only the true budget from the Rozpočet tab (budget document)
  const headerBudget = financeOverview.hasBudget ? financeOverview.totalBudget : null;

  const health = projectHealth({
    status: project.status,
    deadline: project.deadline,
    overdueTasks: project.tasks.filter(
      (t: any) => t.deadline && t.deadline < new Date() && t.status !== "HOTOVO"
    ).length,
    workedHours: financeOverview.workedHours,
    plannedHours: financeOverview.plannedHours,
  });

  // Money / time burn warnings + invoicing nudge
  const warnings: { text: string; level: "warn" | "risk" }[] = [];
  const hoursPct =
    financeOverview.plannedHours > 0
      ? (financeOverview.workedHours / financeOverview.plannedHours) * 100
      : 0;
  if (hoursPct >= 100) {
    warnings.push({
      text: `Plánované hodiny vyčerpány na ${Math.round(hoursPct)} % (${financeOverview.workedHours} z ${financeOverview.plannedHours} h).`,
      level: "risk",
    });
  } else if (hoursPct >= 80) {
    warnings.push({
      text: `Blíží se vyčerpání hodin: ${Math.round(hoursPct)} % (${financeOverview.workedHours} z ${financeOverview.plannedHours} h).`,
      level: "warn",
    });
  }
  const invoicedPct =
    financeOverview.totalBudget > 0
      ? (financeOverview.invoiced / financeOverview.totalBudget) * 100
      : 0;
  if (hoursPct >= 70 && invoicedPct < 40) {
    warnings.push({
      text: `Odpracováno ${Math.round(hoursPct)} % hodin, ale vyfakturováno jen ${Math.round(
        invoicedPct
      )} % rozpočtu. Zvažte vystavení faktury.`,
      level: "warn",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="p-2 rounded-lg hover:bg-white/40 text-[#78716C] transition-colors"
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
            {canEdit && (
              <>
                <ProjectEditDialog
                  project={project}
                  clients={clients}
                  users={projectUsers}
                />
                <DuplicateProjectButton projectId={id} />
              </>
            )}
            <span
              title={health.detail || health.label}
              className="inline-flex items-center gap-1 text-[11px] text-[#78716C]"
            >
              <span
                className={
                  "w-1.5 h-1.5 rounded-full " +
                  (health.level === "risk"
                    ? "bg-rose-500"
                    : health.level === "warn"
                    ? "bg-amber-400"
                    : "bg-emerald-400")
                }
              />
              {health.label}
            </span>
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
            {headerBudget ? (
              <span className="flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                Rozpočet: {headerBudget.toLocaleString("cs-CZ")} Kč
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Burn / invoicing warnings */}
      {warnings.length > 0 && (
        <div
          className={
            "glass rounded-xl p-4 space-y-1.5 border-l-4 " +
            (warnings.some((w) => w.level === "risk")
              ? "border-l-rose-500"
              : "border-l-amber-400")
          }
        >
          {warnings.map((w, i) => (
            <p
              key={i}
              className={
                "text-sm flex items-start gap-2 " +
                (w.level === "risk" ? "text-rose-600" : "text-amber-700")
              }
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {w.text}
            </p>
          ))}
        </div>
      )}

      {/* Description / Brief */}
      {project.description && (
        <div className="glass rounded-xl p-4">
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
        financeOverview={financeOverview}
        invoices={invoices.map((i) => ({
          ...i,
          date: i.date.toISOString(),
          dueDate: i.dueDate ? i.dueDate.toISOString() : null,
        }))}
        files={attachments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))}
        orders={orders.map((o) => ({
          ...o,
          date: o.date.toISOString(),
          dueDate: o.dueDate ? o.dueDate.toISOString() : null,
        }))}
      />
    </div>
  );
}
