"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { nextNumber } from "@/lib/numbering";
import { auth } from "@/lib/auth";

export async function getProjects(filters?: {
  status?: string;
  clientId?: string;
  accountId?: string;
  search?: string;
}) {
  const where: any = {};

  if (filters?.status && filters.status !== "ALL") where.status = filters.status;
  if (filters?.clientId) where.clientId = filters.clientId;
  if (filters?.accountId) where.accountId = filters.accountId;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { description: { contains: filters.search } },
    ];
  }

  return prisma.project.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
      _count: { select: { tasks: true, timeEntries: true, costs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      account: { select: { id: true, name: true } },
      tasks: {
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      timeEntries: {
        include: { user: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
        orderBy: { date: "desc" },
      },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      costs: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createProject(data: {
  name: string;
  description?: string;
  clientId: string;
  accountId?: string;
  deadline?: Date;
  budgetAmount?: number;
  budgetHours?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const project = await prisma.project.create({
    data: {
      jobNumber: await nextNumber("JOB"),
      name: data.name,
      description: data.description,
      clientId: data.clientId,
      accountId: data.accountId,
      deadline: data.deadline,
      budgetAmount: data.budgetAmount,
      budgetHours: data.budgetHours,
    },
  });
  revalidatePath("/projects");
  return project;
}

export async function updateProject(
  id: string,
  data: {
    name?: string;
    description?: string;
    status?: string;
    clientId?: string;
    accountId?: string;
    deadline?: Date | null;
    budgetAmount?: number | null;
    budgetHours?: number | null;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const cleanData = { ...data } as any;
  // Remove undefined fields
  Object.keys(cleanData).forEach((key) => {
    if (cleanData[key] === undefined) delete cleanData[key];
  });

  const project = await prisma.project.update({ where: { id }, data: cleanData });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return project;
}

export async function duplicateProject(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const source = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: { include: { assignments: true } },
      budgetDocuments: {
        where: { status: { notIn: ["ARCHIVOVANO"] } },
        include: { lines: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!source) throw new Error("Zakázka nenalezena");

  const copy = await prisma.project.create({
    data: {
      jobNumber: await nextNumber("JOB"),
      name: `${source.name} (kopie)`,
      description: source.description,
      status: "CEKA",
      clientId: source.clientId,
      accountId: source.accountId,
      deadline: source.deadline,
      budgetAmount: source.budgetAmount,
      budgetHours: source.budgetHours,
    },
  });

  for (const t of source.tasks) {
    await prisma.task.create({
      data: {
        title: `${t.title} (kopie)`,
        description: t.description,
        status: "TODO",
        priority: t.priority,
        projectId: copy.id,
        deadline: t.deadline,
        estimatedHours: t.estimatedHours,
        assignments: t.assignments.length
          ? { create: t.assignments.map((a) => ({ userId: a.userId })) }
          : undefined,
      },
    });
  }

  // copy the latest budget document with its lines
  const doc = source.budgetDocuments[0];
  if (doc) {
    await prisma.budgetDocument.create({
      data: {
        documentNumber: `${doc.documentNumber}-K${Date.now().toString().slice(-4)}`,
        title: `${doc.title} (kopie)`,
        type: doc.type,
        clientId: doc.clientId,
        projectId: copy.id,
        currency: doc.currency,
        ownerId: doc.ownerId,
        status: "ROZPRACOVANO",
        clientStatus: "ROZPRACOVANO",
        discountPercent: doc.discountPercent,
        discountAmount: doc.discountAmount,
        lines: {
          create: doc.lines.map((l) => ({
            type: l.type,
            code: l.code,
            subject: l.subject,
            clientDescription: l.clientDescription,
            internalDescription: l.internalDescription,
            quantity: l.quantity,
            unit: l.unit,
            unitCost: l.unitCost,
            totalCost: l.totalCost,
            markupUnit: l.markupUnit,
            markupPercent: l.markupPercent,
            unitPrice: l.unitPrice,
            hourlyRate: l.hourlyRate,
            internalHourlyCost: l.internalHourlyCost,
            plannedHours: l.plannedHours,
            totalExclVat: l.totalExclVat,
            vatRate: l.vatRate,
            vatAmount: l.vatAmount,
            totalInclVat: l.totalInclVat,
            discountPercent: l.discountPercent,
            discountAmount: l.discountAmount,
            plannedMargin: l.plannedMargin,
            plannedMarginPercent: l.plannedMarginPercent,
            supplier: l.supplier,
            deadline: l.deadline,
            isPrintable: l.isPrintable,
            isInternalOnly: l.isInternalOnly,
            sortOrder: l.sortOrder,
            category: l.category,
          })),
        },
      },
    });
  }

  revalidatePath("/projects");
  revalidatePath("/finance");
  return copy;
}

/** Create a brand new project from an existing one (project "template"). */
export async function createProjectFromTemplate(
  sourceId: string,
  data: { name: string; clientId: string; accountId?: string; deadline?: Date; description?: string }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const copy = await duplicateProject(sourceId);

  // template tasks should keep clean titles (no "(kopie)" suffix)
  const tasks = await prisma.task.findMany({ where: { projectId: copy.id } });
  await Promise.all(
    tasks.map((t) =>
      prisma.task.update({
        where: { id: t.id },
        data: { title: t.title.replace(/ \(kopie\)$/, "") },
      })
    )
  );

  const updated = await prisma.project.update({
    where: { id: copy.id },
    data: {
      name: data.name,
      clientId: data.clientId,
      accountId: data.accountId || copy.accountId,
      deadline: data.deadline ?? copy.deadline,
      description: data.description ?? copy.description,
    },
  });

  revalidatePath("/projects");
  return updated;
}

export async function getProjectStatusCounts() {
  const statuses = await prisma.project.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  return Object.fromEntries(statuses.map((s) => [s.status, s._count.id]));
}
