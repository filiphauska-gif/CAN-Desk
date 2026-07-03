"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function getTasks(filters?: {
  status?: string;
  projectId?: string;
  assigneeId?: string;
  search?: string;
}) {
  const where: any = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.projectId) where.projectId = filters.projectId;
  if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters?.search) {
    where.OR = [{ title: { contains: filters.search } }, { description: { contains: filters.search } }];
  }

  return prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, client: { select: { name: true } } } },
      assignee: { select: { id: true, name: true } },
      assignments: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: [{ priority: "desc" }, { deadline: "asc" }],
  });
}

export async function createTask(data: {
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  deadline?: Date;
  priority?: number;
  estimatedHours?: number;
  assigneeIds?: string[];
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { assigneeIds, ...taskData } = data;
  const cleanData = { ...taskData } as any;
  Object.keys(cleanData).forEach((key) => {
    if (cleanData[key] === undefined) delete cleanData[key];
  });

  const task = await prisma.task.create({
    data: {
      ...cleanData,
      assignments: assigneeIds?.length
        ? { create: assigneeIds.map((userId) => ({ userId })) }
        : undefined,
    },
  });
  revalidatePath("/tasks");
  revalidatePath(`/projects/${data.projectId}`);
  return task;
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: number;
    assigneeId?: string | null;
    deadline?: Date | null;
    estimatedHours?: number | null;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const cleanData = { ...data } as any;
  Object.keys(cleanData).forEach((key) => {
    if (cleanData[key] === undefined) delete cleanData[key];
  });

  const task = await prisma.task.update({ where: { id }, data: cleanData });
  revalidatePath("/tasks");
  revalidatePath(`/projects/${task.projectId}`);
  return task;
}

export async function updateTaskAssignments(
  taskId: string,
  userIds: string[]
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // Remove existing assignments, add new ones
  await prisma.taskAssignment.deleteMany({ where: { taskId } });
  if (userIds.length > 0) {
    await prisma.taskAssignment.createMany({
      data: userIds.map((userId) => ({ taskId, userId })),
    });
  }

  revalidatePath("/tasks");
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (task) revalidatePath(`/projects/${task.projectId}`);
}

export async function getMyTasks(userId: string) {
  return prisma.task.findMany({
    where: {
      OR: [
        { assigneeId: userId },
        { assignments: { some: { userId } } },
      ],
      status: { notIn: ["DONE"] },
    },
    include: {
      project: { select: { id: true, name: true, client: { select: { name: true } } } },
      assignee: { select: { id: true, name: true } },
      assignments: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: [{ priority: "desc" }, { deadline: "asc" }],
    take: 20,
  });
}

export async function getTasksByStatus() {
  const statuses = await prisma.task.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  return Object.fromEntries(statuses.map((s) => [s.status, s._count.id]));
}
