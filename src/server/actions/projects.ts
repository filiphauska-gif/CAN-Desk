"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function getProjects(filters?: {
  status?: string;
  clientId?: string;
  accountId?: string;
  search?: string;
}) {
  const where: any = {};

  if (filters?.status) where.status = filters.status;
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

export async function getProjectStatusCounts() {
  const statuses = await prisma.project.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  return Object.fromEntries(statuses.map((s) => [s.status, s._count.id]));
}
