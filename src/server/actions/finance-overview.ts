"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type BudgetBar = {
  key: "budget" | "costs" | "hours";
  label: string;
  /** planned amount (budget) */
  planned: number;
  /** actual amount (invoiced / received / worked) */
  actual: number;
  /** 0..N percent (can exceed 100) */
  pct: number;
  unit: "CZK" | "h";
  tone: "emerald" | "sky" | "amber";
};

export type InvoiceItem = {
  id: string;
  type: string;
  number: string | null;
  amount: number;
  date: string;
  note: string | null;
};

export type FinanceOverview = {
  hasBudget: boolean;
  totalBudget: number;
  invoiced: number;
  plannedExternalCosts: number;
  receivedCosts: number;
  plannedHours: number;
  workedHours: number;
  internalHourlyCost: number;
  estimatedEarnings: number;
  plannedMargin: number;
  bars: BudgetBar[];
  invoices: InvoiceItem[];
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as any;
}

function num(v: any) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Core math: budget vs reality for one project */
export async function getProjectFinanceOverview(projectId: string): Promise<FinanceOverview> {
  const [doc, timeAgg, costs, invoices, project] = await Promise.all([
    prisma.budgetDocument.findFirst({
      where: { projectId, status: { notIn: ["ARCHIVOVANO"] } },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.timeEntry.aggregate({
      where: { projectId, entryType: "WORK" },
      _sum: { hours: true },
    }),
    prisma.cost.aggregate({ where: { projectId }, _sum: { amount: true } }),
    prisma.invoice.findMany({ where: { projectId }, orderBy: { date: "desc" } }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        budgetAmount: true,
        budgetHours: true,
        tasks: {
          select: {
            assignments: { select: { user: { select: { hourlyRate: true } } } },
          },
        },
      },
    }),
  ]);

  // Flatten lines (children too)
  const lines: any[] = doc ? [...doc.lines] : [];

  let totalBudget = 0; // planned revenue excl. VAT
  let plannedExternalCosts = 0;
  let plannedHours = 0;
  let internalCostWeighted = 0; // sum of internalHourlyCost * plannedHours

  for (const l of lines) {
    totalBudget += num(l.totalExclVat);
    if (l.type === "EXTERNI_NAKLAD" || l.type === "PREFAKTURACE") {
      plannedExternalCosts += num(l.totalCost);
    }
    if (l.type === "INTERNI_PRACE") {
      const h = num(l.plannedHours) || (l.unit === "h" ? num(l.quantity) : 0);
      plannedHours += h;
      const rate = num(l.internalHourlyCost) || num(l.hourlyRate) * 0.5;
      internalCostWeighted += rate * h;
    }
  }
  totalBudget -= num(doc?.discountAmount);
  if (totalBudget < 0) totalBudget = 0;

  // Fallback when the project has no budget document yet: use project-level budget
  if (lines.length === 0) {
    totalBudget = num(project?.budgetAmount);
    plannedHours = num(project?.budgetHours);
  }

  let internalHourlyCost = plannedHours > 0 ? internalCostWeighted / plannedHours : 0;
  if (internalHourlyCost === 0) {
    // derive from assigned team: internal cost = 50% of client hourly rate
    const rates = (project?.tasks || [])
      .flatMap((t) => t.assignments.map((a) => num(a.user.hourlyRate)))
      .filter((r) => r > 0);
    if (rates.length > 0) {
      internalHourlyCost = (rates.reduce((s, r) => s + r, 0) / rates.length) * 0.5;
    }
  }

  const workedHours = num(timeAgg._sum.hours);
  const receivedCosts = num(costs._sum.amount);
  const invoiced = invoices.filter((i) => i.type === "ISSUED").reduce((s, i) => s + num(i.amount), 0);

  // Estimated earnings: revenue - real costs (fallback planned) - internal labor at cost rate
  const costsForEstimate = receivedCosts > 0 ? receivedCosts : plannedExternalCosts;
  const laborCost = workedHours * internalHourlyCost;
  const estimatedEarnings = totalBudget - costsForEstimate - laborCost;

  const plannedMargin = totalBudget - plannedExternalCosts - plannedHours * internalHourlyCost;

  const bars: BudgetBar[] = [];
  if (totalBudget > 0) {
    bars.push({
      key: "budget",
      label: "Rozpočet",
      planned: totalBudget,
      actual: invoiced,
      pct: (invoiced / totalBudget) * 100,
      unit: "CZK",
      tone: "emerald",
    });
  }
  if (plannedExternalCosts > 0 || receivedCosts > 0) {
    const base = plannedExternalCosts > 0 ? plannedExternalCosts : receivedCosts;
    bars.push({
      key: "costs",
      label: "Náklady",
      planned: plannedExternalCosts,
      actual: receivedCosts,
      pct: base > 0 ? (receivedCosts / base) * 100 : 0,
      unit: "CZK",
      tone: "sky",
    });
  }
  if (plannedHours > 0) {
    bars.push({
      key: "hours",
      label: "Hodiny",
      planned: plannedHours,
      actual: workedHours,
      pct: (workedHours / plannedHours) * 100,
      unit: "h",
      tone: "amber",
    });
  }

  return {
    hasBudget: !!doc,
    totalBudget,
    invoiced,
    plannedExternalCosts,
    receivedCosts,
    plannedHours,
    workedHours,
    internalHourlyCost,
    estimatedEarnings,
    plannedMargin,
    bars,
    invoices: invoices.map((i) => ({
      id: i.id,
      type: i.type,
      number: i.number,
      amount: num(i.amount),
      date: i.date.toISOString(),
      note: i.note,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Invoices CRUD                                                       */
/* ------------------------------------------------------------------ */

export async function addInvoice(data: {
  projectId: string;
  type?: string;
  number?: string;
  amount: number;
  date?: string;
  note?: string;
}) {
  await requireUser();
  if (!data.amount || data.amount <= 0) throw new Error("Neplatná částka");

  const inv = await prisma.invoice.create({
    data: {
      projectId: data.projectId,
      type: data.type || "ISSUED",
      number: data.number || null,
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
      note: data.note || null,
    },
  });

  revalidatePath(`/projects/${data.projectId}`);
  revalidatePath("/finance");
  return inv;
}

export async function deleteInvoice(id: string) {
  await requireUser();
  const inv = await prisma.invoice.delete({ where: { id } });
  revalidatePath(`/projects/${inv.projectId}`);
  revalidatePath("/finance");
  return inv;
}

/* ------------------------------------------------------------------ */
/* Quick view for the projects list drawer                             */
/* ------------------------------------------------------------------ */

export type QuickView = {
  project: {
    id: string;
    name: string;
    clientName: string;
    status: string;
    deadline: string | null;
    accountName: string | null;
  };
  tasks: {
    total: number;
    done: number;
    inProgress: number;
    overdue: number;
    recent: { id: string; title: string; status: string; deadline: string | null }[];
  };
  time: { totalHours: number; billableHours: number; monthHours: number };
  finance: FinanceOverview;
};

export async function getProjectQuickView(projectId: string): Promise<QuickView | null> {
  await requireUser();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: { select: { name: true } },
      account: { select: { name: true } },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return null;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [allTime, monthly, finance] = await Promise.all([
    prisma.timeEntry.aggregate({
      where: { projectId, entryType: "WORK" },
      _sum: { hours: true },
    }),
    prisma.timeEntry.aggregate({
      where: { projectId, entryType: "WORK", date: { gte: monthStart } },
      _sum: { hours: true },
    }),
    getProjectFinanceOverview(projectId),
  ]);

  const billable = project.tasks.length;
  const now = new Date();

  return {
    project: {
      id: project.id,
      name: project.name,
      clientName: project.client.name,
      status: project.status,
      deadline: project.deadline ? project.deadline.toISOString() : null,
      accountName: project.account?.name ?? null,
    },
    tasks: {
      total: project.tasks.length,
      done: project.tasks.filter((t) => t.status === "HOTOVO").length,
      inProgress: project.tasks.filter((t) => t.status === "V_PROCESU").length,
      overdue: project.tasks.filter(
        (t) => t.deadline && t.deadline < now && t.status !== "HOTOVO"
      ).length,
      recent: project.tasks.slice(0, 5).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        deadline: t.deadline ? t.deadline.toISOString() : null,
      })),
    },
    time: {
      totalHours: num(allTime._sum.hours),
      billableHours: num(allTime._sum.hours),
      monthHours: num(monthly._sum.hours),
    },
    finance,
  };
}
