"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

// GENERATE DOCUMENT NUMBER
async function generateDocumentNumber(): Promise<string> {
  const count = await prisma.budgetDocument.count();
  const year = new Date().getFullYear();
  return `N-${year}-${String(count + 1).padStart(4, "0")}`;
}

// CALCULATE LINE
function calcLine(line: {
  type: string;
  quantity: number;
  unitCost: number;
  markupUnit: number;
  markupPercent: number;
  plannedHours: number;
  hourlyRate: number;
  internalHourlyCost: number;
  vatRate: number;
  discountPercent: number;
  discountAmount: number;
}) {
  let totalCost = 0;
  let unitPrice = 0;
  let totalExclVat = 0;
  let plannedMargin = 0;
  let plannedMarginPercent = 0;

  switch (line.type) {
    case "INTERNI_PRACE": {
      totalCost = line.plannedHours * line.internalHourlyCost;
      unitPrice = line.hourlyRate;
      totalExclVat = line.plannedHours * line.hourlyRate;
      break;
    }
    case "EXTERNI_NAKLAD": {
      totalCost = line.quantity * line.unitCost;
      unitPrice = line.unitCost + line.markupUnit;
      if (line.markupPercent > 0) {
        unitPrice = line.unitCost * (1 + line.markupPercent / 100);
      }
      totalExclVat = line.quantity * unitPrice;
      break;
    }
    case "PREFAKTURACE": {
      totalCost = line.quantity * line.unitCost;
      unitPrice = line.unitCost;
      totalExclVat = line.quantity * unitPrice;
      break;
    }
    case "PAUSAL": {
      totalCost = line.unitCost;
      unitPrice = 0;
      totalExclVat = line.unitCost;
      break;
    }
    case "SLEVA": {
      totalCost = 0;
      unitPrice = 0;
      totalExclVat = -(line.discountAmount || (line.quantity * line.unitCost * line.discountPercent) / 100);
      break;
    }
    default: {
      totalCost = 0;
      totalExclVat = 0;
    }
  }

  // Apply item-level discount
  if (line.discountPercent > 0 && line.type !== "SLEVA") {
    const discount = (totalExclVat * line.discountPercent) / 100;
    totalExclVat -= discount;
  }
  if (line.discountAmount > 0 && line.type !== "SLEVA") {
    totalExclVat -= line.discountAmount;
  }

  plannedMargin = totalExclVat - totalCost;
  plannedMarginPercent = totalExclVat > 0 ? Math.round((plannedMargin / totalExclVat) * 100) : 0;
  const vatAmount = totalExclVat > 0 ? (totalExclVat * line.vatRate) / 100 : 0;
  const totalInclVat = totalExclVat + vatAmount;

  return { totalCost, unitPrice, totalExclVat, vatAmount, totalInclVat, plannedMargin, plannedMarginPercent };
}

// RECALCULATE ENTIRE BUDGET
export async function recalculateBudget(documentId: string) {
  const lines = await prisma.budgetLine.findMany({ where: { budgetDocumentId: documentId, parentLineId: null } });
  let totalExcl = 0, totalVat = 0, totalInc = 0, totalCost = 0, totalMargin = 0;

  for (const line of lines) {
    if (line.type === "SKUPINA") continue;
    const calc = calcLine(line as any);
    totalExcl += calc.totalExclVat;
    totalVat += calc.vatAmount;
    totalInc += calc.totalInclVat;
    totalCost += calc.totalCost;
    totalMargin += calc.plannedMargin;
  }

  const doc = await prisma.budgetDocument.findUnique({ where: { id: documentId } });
  const docDiscount = ((doc?.discountPercent || 0) / 100) * totalExcl + (doc?.discountAmount || 0);
  totalExcl -= docDiscount;
  totalVat = totalExcl > 0 ? (totalExcl * (21 / 100)) : 0;
  totalInc = totalExcl + totalVat;

  return { totalExcl, totalVat, totalInc, totalCost, totalMargin, totalMarginPercent: totalExcl > 0 ? Math.round((totalMargin / totalExcl) * 100) : 0 };
}

// CREATE BUDGET DOCUMENT
export async function createBudgetDocument(data: {
  title: string;
  clientId: string;
  projectId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  const docNumber = await generateDocumentNumber();

  const doc = await prisma.budgetDocument.create({
    data: {
      documentNumber: docNumber,
      title: data.title,
      clientId: data.clientId,
      projectId: data.projectId,
      ownerId: user.id,
      currency: client?.defaultCurrency || "CZK",
      paymentTerms: client?.defaultPaymentTerms || "",
    },
  });
  revalidatePath("/projects");
  if (data.projectId) revalidatePath(`/projects/${data.projectId}`);
  return doc;
}

// GET BUDGET DOCUMENT
export async function getBudgetDocument(id: string) {
  return prisma.budgetDocument.findUnique({
    where: { id },
    include: {
      client: true,
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      lines: { orderBy: { sortOrder: "asc" }, include: { children: { orderBy: { sortOrder: "asc" } } } },
    },
  });
}

// GET BUDGET BY PROJECT
export async function getBudgetByProject(projectId: string) {
  return prisma.budgetDocument.findFirst({
    where: { projectId, status: { notIn: ["ARCHIVOVANO"] } },
    include: {
      client: true,
      owner: { select: { id: true, name: true } },
      lines: { orderBy: { sortOrder: "asc" }, include: { children: { orderBy: { sortOrder: "asc" } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// UPDATE BUDGET DOCUMENT
export async function updateBudgetDocument(id: string, data: any) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const cleanData = { ...data } as any;
  Object.keys(cleanData).forEach((k) => { if (cleanData[k] === undefined) delete cleanData[k]; });

  const doc = await prisma.budgetDocument.update({ where: { id }, data: cleanData });
  if (doc.projectId) revalidatePath(`/projects/${doc.projectId}`);
  return doc;
}

// UPDATE BUDGET STATUS
export async function updateBudgetStatus(id: string, status: string) {
  return updateBudgetDocument(id, { status });
}

// CREATE BUDGET LINE
export async function createBudgetLine(data: {
  budgetDocumentId: string;
  type: string;
  subject: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  markupUnit?: number;
  markupPercent?: number;
  hourlyRate?: number;
  internalHourlyCost?: number;
  plannedHours?: number;
  vatRate?: number;
  discountPercent?: number;
  isInternalOnly?: boolean;
  parentLineId?: string;
  category?: string;
  clientDescription?: string;
  internalDescription?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const maxOrder = await prisma.budgetLine.findFirst({
    where: { budgetDocumentId: data.budgetDocumentId, parentLineId: data.parentLineId || null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const defaults = {
    quantity: 1, unit: "ks", unitCost: 0, markupUnit: 0, markupPercent: 0,
    hourlyRate: 0, internalHourlyCost: 0, plannedHours: 0, vatRate: 21, discountPercent: 0,
    clientDescription: "", internalDescription: "",
  };
  const input = { ...defaults, ...data };
  const calc = calcLine(input as any);

  const line = await prisma.budgetLine.create({
    data: {
      budgetDocumentId: data.budgetDocumentId,
      type: input.type,
      subject: input.subject,
      clientDescription: input.clientDescription,
      internalDescription: input.internalDescription,
      quantity: input.quantity,
      unit: input.unit,
      unitCost: input.unitCost,
      markupUnit: input.markupUnit,
      markupPercent: input.markupPercent,
      hourlyRate: input.type === "INTERNI_PRACE" ? input.hourlyRate : 0,
      internalHourlyCost: input.internalHourlyCost,
      plannedHours: input.plannedHours,
      vatRate: input.vatRate,
      discountPercent: input.discountPercent,
      totalCost: calc.totalCost,
      unitPrice: calc.unitPrice,
      totalExclVat: calc.totalExclVat,
      vatAmount: calc.vatAmount,
      totalInclVat: calc.totalInclVat,
      plannedMargin: calc.plannedMargin,
      plannedMarginPercent: calc.plannedMarginPercent,
      isInternalOnly: data.isInternalOnly || false,
      isPrintable: input.type !== "SKUPINA" && input.type !== "TEXT",
      parentLineId: data.parentLineId,
      category: data.category,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath("/projects");
  return line;
}

// UPDATE BUDGET LINE
export async function updateBudgetLine(id: string, data: any) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const existing = await prisma.budgetLine.findUnique({ where: { id } });
  if (!existing) throw new Error("Line not found");

  const merged = { ...existing, ...data };
  const calc = calcLine(merged as any);

  const updateData: any = { ...data };
  updateData.totalCost = calc.totalCost;
  updateData.unitPrice = calc.unitPrice;
  updateData.totalExclVat = calc.totalExclVat;
  updateData.vatAmount = calc.vatAmount;
  updateData.totalInclVat = calc.totalInclVat;
  updateData.plannedMargin = calc.plannedMargin;
  updateData.plannedMarginPercent = calc.plannedMarginPercent;

  Object.keys(updateData).forEach((k) => { if (updateData[k] === undefined) delete updateData[k]; });

  const line = await prisma.budgetLine.update({ where: { id }, data: updateData });
  revalidatePath("/projects");
  return line;
}

// DELETE BUDGET LINE
export async function deleteBudgetLine(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  await prisma.budgetLine.delete({ where: { id } });
  revalidatePath("/projects");
}

// GET PROFITABILITY
export async function getProjectProfitability(projectId: string) {
  const doc = await prisma.budgetDocument.findFirst({
    where: { projectId, status: { notIn: ["ARCHIVOVANO", "ROZPRACOVANO"] } },
    include: { lines: { where: { parentLineId: null } } },
  });

  const [timeEntries, costs] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { projectId },
      include: { user: { select: { hourlyRate: true } } },
    }),
    prisma.cost.findMany({ where: { projectId } }),
  ]);

  const plannedHours = doc?.lines.filter((l) => l.type === "INTERNI_PRACE").reduce((s, l) => s + (l.plannedHours || 0), 0) || 0;
  const plannedCost = doc?.lines.filter((l) => l.type !== "INTERNI_PRACE").reduce((s, l) => s + (l.totalCost || 0), 0) || 0;
  const plannedRevenue = doc?.lines.reduce((s, l) => s + (l.totalExclVat || 0), 0) || 0;

  const actualHours = timeEntries.reduce((s, e) => s + e.hours, 0);
  const actualLaborCost = timeEntries.reduce((s, e) => s + e.hours * ((e.user.hourlyRate as any) || 900), 0);
  const actualExternalCosts = costs.reduce((s, c) => s + c.amount, 0);
  const actualTotal = actualLaborCost + actualExternalCosts;

  return {
    planned: { hours: plannedHours, costs: plannedCost, revenue: plannedRevenue, margin: plannedRevenue - plannedCost - plannedHours * 900 },
    actual: { hours: actualHours, laborCost: actualLaborCost, externalCosts: actualExternalCosts, total: actualTotal },
    diff: { hours: actualHours - plannedHours, costs: actualTotal - plannedCost },
    marginPercent: plannedRevenue > 0 ? Math.round(((plannedRevenue - actualTotal) / plannedRevenue) * 100) : 0,
  };
}
