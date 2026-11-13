"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { nextNumber } from "@/lib/numbering";
import { revalidatePath } from "next/cache";
import { COMPANY } from "@/lib/company";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as any;
}

/* ------------------------------------------------------------------ */
/* Invoices                                                            */
/* ------------------------------------------------------------------ */

/**
 * Create an invoice from the latest budget document.
 * Client-facing amounts per budget line (hour lines are flattened to their total).
 */
export async function createInvoiceFromBudget(projectId: string) {
  await requireUser();

  const [project, doc] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, include: { client: true } }),
    prisma.budgetDocument.findFirst({
      where: { projectId, status: { notIn: ["ARCHIVOVANO"] } },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!project) throw new Error("Zakázka nenalezena");
  if (!doc || doc.lines.length === 0) throw new Error("Zakázka nemá rozpočet");

  const billable = doc.lines.filter((l) => !l.isInternalOnly && (l.totalExclVat || 0) > 0);
  const netTotal = billable.reduce((s, l) => s + (l.totalExclVat || 0), 0);
  const vatTotal = Math.round(netTotal * 0.21);

  const number = await nextNumber("I");
  const client = project.client;

  const invoice = await prisma.invoice.create({
    data: {
      projectId,
      type: "ISSUED",
      number,
      amount: netTotal + vatTotal,
      dueDate: new Date(Date.now() + 14 * 86_400_000),
      status: "VYSTAVENA",
      note: `Fakturace dle rozpočtu ${doc.documentNumber}`,
      clientSnapshot: JSON.stringify({
        supplier: COMPANY,
        client: {
          name: client.name,
          address: client.billingAddress || "",
          ico: client.companyId || "",
          dic: client.vatId || "",
          email: client.email || "",
          phone: client.phone || "",
          contact: client.contactName || "",
        },
        vatRate: 21,
      }),
      items: {
        create: billable.map((l, i) => ({
          description: l.subject,
          quantity: 1,
          unit: "ks",
          unitPrice: l.totalExclVat || 0,
          total: l.totalExclVat || 0,
          vatRate: 21,
          sortOrder: i,
        })),
      },
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/finance");
  return invoice;
}

export async function setInvoiceStatus(id: string, status: string) {
  await requireUser();
  const inv = await prisma.invoice.update({ where: { id }, data: { status } });
  revalidatePath(`/projects/${inv.projectId}`);
  revalidatePath("/finance");
  return inv;
}

/* ------------------------------------------------------------------ */
/* Orders (purchase orders to suppliers)                               */
/* ------------------------------------------------------------------ */

/** Create a purchase order from the budget's external cost lines. */
export async function createOrderFromBudget(projectId: string, supplier?: string) {
  await requireUser();

  const doc = await prisma.budgetDocument.findFirst({
    where: { projectId, status: { notIn: ["ARCHIVOVANO"] } },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  if (!doc) throw new Error("Zakázka nemá rozpočet");

  const external = doc.lines.filter(
    (l) => l.type === "EXTERNI_NAKLAD" && (l.totalCost || 0) > 0
  );
  if (external.length === 0) throw new Error("Rozpočet nemá externí náklady");

  const orderNumber = await nextNumber("PO");
  const inferredSupplier =
    supplier || external.find((l) => l.supplier)?.supplier || "Dodavatel";

  const order = await prisma.order.create({
    data: {
      orderNumber,
      projectId,
      supplier: inferredSupplier,
      status: "VYSTAVENA",
      items: {
        create: external.map((l, i) => ({
          description: l.subject,
          quantity: l.quantity || 1,
          unit: l.unit || "ks",
          unitPrice: l.totalCost || 0,
          total: l.totalCost || 0,
          sortOrder: i,
        })),
      },
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return order;
}

export async function setOrderStatus(id: string, status: string) {
  await requireUser();
  const order = await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath(`/projects/${order.projectId}`);
  return order;
}
