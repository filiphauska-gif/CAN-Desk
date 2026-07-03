"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function getTimeEntries(filters?: {
  projectId?: string;
  userId?: string;
  from?: Date;
  to?: Date;
}) {
  const where: any = {};
  if (filters?.projectId) where.projectId = filters.projectId;
  if (filters?.userId) where.userId = filters.userId;
  if (filters?.from || filters?.to) {
    where.date = {};
    if (filters.from) where.date.gte = filters.from;
    if (filters.to) where.date.lte = filters.to;
  }

  return prisma.timeEntry.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, client: { select: { name: true } } } },
      user: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function createTimeEntry(data: {
  hours: number;
  date: Date;
  description?: string;
  billable?: boolean;
  entryType?: string;
  projectId?: string;
  taskId?: string;
  userId: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const cleanData = { ...data } as any;
  Object.keys(cleanData).forEach((key) => {
    if (cleanData[key] === undefined) delete cleanData[key];
  });
  const entry = await prisma.timeEntry.create({ data: cleanData });
  revalidatePath("/time");
  if (data.projectId) revalidatePath(`/projects/${data.projectId}`);
  return entry;
}

export async function getTimeSummary(projectId?: string) {
  const where: any = {};
  if (projectId) where.projectId = projectId;

  const entries = await prisma.timeEntry.findMany({ where });
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const billableHours = entries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.hours, 0);

  return { totalHours, billableHours, nonBillableHours: totalHours - billableHours, count: entries.length };
}

export async function getTimeByUser(from?: Date, to?: Date) {
  const where: any = {};
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = from;
    if (to) where.date.lte = to;
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
  });

  const byUser: Record<string, { name: string; total: number; billable: number }> = {};
  for (const e of entries) {
    if (!byUser[e.userId]) {
      byUser[e.userId] = { name: e.user.name, total: 0, billable: 0 };
    }
    byUser[e.userId].total += e.hours;
    if (e.billable) byUser[e.userId].billable += e.hours;
  }

  return Object.entries(byUser).map(([id, data]) => ({ id, ...data }));
}
