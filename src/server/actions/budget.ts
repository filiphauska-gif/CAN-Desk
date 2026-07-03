"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function getBudgetItems(projectId: string) {
  return prisma.budgetItem.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
}

export async function createBudgetItem(data: {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  type: "REVENUE" | "COST";
  projectId: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const total = data.quantity * data.unitPrice;
  const maxOrder = await prisma.budgetItem.findFirst({
    where: { projectId: data.projectId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const item = await prisma.budgetItem.create({
    data: {
      ...data,
      total,
      order: (maxOrder?.order ?? -1) + 1,
    },
  });
  revalidatePath(`/projects/${data.projectId}`);
  return item;
}

export async function updateBudgetItem(
  id: string,
  data: {
    name?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    type?: "REVENUE" | "COST";
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const updateData: any = { ...data };
  // Recompute total if quantity or unitPrice changed
  const existing = await prisma.budgetItem.findUnique({ where: { id } });
  if (existing) {
    const qty = data.quantity ?? existing.quantity;
    const price = data.unitPrice ?? existing.unitPrice;
    updateData.total = qty * price;
  }

  const item = await prisma.budgetItem.update({ where: { id }, data: updateData });
  revalidatePath(`/projects/${item.projectId}`);
  return item;
}

export async function deleteBudgetItem(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const item = await prisma.budgetItem.delete({ where: { id } });
  revalidatePath(`/projects/${item.projectId}`);
}

export async function updateProjectFinanceSettings(
  projectId: string,
  data: {
    budgetAmount?: number;
    budgetHours?: number;
    discountPercent?: number;
    vatRate?: number;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const project = await prisma.project.update({ where: { id: projectId }, data });
  revalidatePath(`/projects/${projectId}`);
  return project;
}
