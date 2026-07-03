"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function getProjectFinance(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { costs: true, timeEntries: { include: { user: true } } },
  });
  if (!project) return null;

  const totalCosts = project.costs.reduce((s, c) => s + c.amount, 0);
  const internalCosts = project.costs
    .filter((c) => c.type === "INTERNAL")
    .reduce((s, c) => s + c.amount, 0);
  const externalCosts = project.costs
    .filter((c) => c.type === "EXTERNAL")
    .reduce((s, c) => s + c.amount, 0);

  const loggedHours = project.timeEntries.reduce((s, e) => s + e.hours, 0);
  const laborCost = project.timeEntries.reduce(
    (s, e) => s + e.hours * (e.user.hourlyRate || 0),
    0
  );

  const totalExpenses = totalCosts + laborCost;
  const budgetAmount = project.budgetAmount || 0;
  const margin = budgetAmount > 0
    ? ((budgetAmount - totalExpenses) / budgetAmount) * 100
    : 0;

  return {
    budgetAmount,
    budgetHours: project.budgetHours || 0,
    loggedHours,
    laborCost,
    internalCosts,
    externalCosts,
    totalCosts,
    totalExpenses,
    margin,
    profit: budgetAmount - totalExpenses,
  };
}

export async function createCost(data: {
  description: string;
  amount: number;
  type: "INTERNAL" | "EXTERNAL";
  projectId: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const cost = await prisma.cost.create({ data });
  revalidatePath(`/projects/${data.projectId}`);
  revalidatePath("/finance");
  return cost;
}

export async function deleteCost(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.cost.delete({ where: { id } });
  revalidatePath("/finance");
}
