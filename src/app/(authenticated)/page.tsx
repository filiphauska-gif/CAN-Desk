import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getMyTasks } from "@/server/actions/tasks";
import { DashboardGrid, type DashboardData } from "./dashboard-grid";
import { NewProjectDialog } from "./new-project-dialog";
import { format, isAfter, isBefore } from "date-fns";
import { cs } from "date-fns/locale";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  const [myTasks, projects, statusCounts, users, recentProjects, me] = await Promise.all([
    getMyTasks(user.id),
    prisma.project.findMany({
      include: { client: { select: { name: true } } },
      orderBy: { deadline: "asc" },
    }),
    prisma.project.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true } }),
    prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { dashboardLayout: true } }),
  ]);

  const today = new Date();
  const isClosed = (s: string) => ["DOKONCENO", "ARCHIVOVANO", "FAKTUROVANO"].includes(s);

  const overdueProjects = projects.filter(
    (p) => p.deadline && isBefore(p.deadline, today) && !isClosed(p.status)
  );
  const atRiskProjects = projects.filter(
    (p) =>
      p.deadline &&
      isAfter(p.deadline, today) &&
      isBefore(p.deadline, new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) &&
      !isClosed(p.status)
  );

  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id]));

  const data: DashboardData = {
    userName: user.name,
    dateStr: format(today, "EEEE d. MMMM yyyy", { locale: cs }),
    overdueCount: overdueProjects.length,
    atRiskCount: atRiskProjects.length,
    activeCount: projects.filter((p) => p.status === "BEZI").length,
    totalProjects: projects.length,
    statusMap,
    tasks: myTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
      overdue: t.deadline ? isBefore(new Date(t.deadline), today) : false,
      projectName: t.project.name,
      clientName: t.project.client?.name ?? null,
      projectId: t.projectId,
    })),
    overdueProjects: overdueProjects.slice(0, 5).map((p) => ({
      id: p.id,
      name: p.name,
      clientName: p.client.name,
      deadline: p.deadline ? new Date(p.deadline).toISOString() : null,
    })),
    recentProjects: recentProjects.map((p) => ({
      id: p.id,
      name: p.name,
      clientName: p.client.name,
      status: p.status,
    })),
    today: today.toISOString(),
  };

  return (
    <DashboardGrid
      data={data}
      initialLayout={me?.dashboardLayout ?? null}
      newProjectSlot={<NewProjectDialog users={users} />}
    />
  );
}
