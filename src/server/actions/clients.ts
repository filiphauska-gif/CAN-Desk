"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function getClients() {
  return prisma.client.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { projects: true } },
      projects: {
        select: { id: true, name: true, status: true, deadline: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getClient(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      projects: {
        include: { account: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createClient(data: {
  name: string;
  email?: string;
  phone?: string;
  contactName?: string;
  note?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const client = await prisma.client.create({ data });
  revalidatePath("/clients");
  return client;
}

export async function updateClient(
  id: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    contactName?: string;
    note?: string;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const client = await prisma.client.update({ where: { id }, data });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return client;
}

export async function deleteClient(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.client.update({
    where: { id },
    data: { active: false },
  });
  revalidatePath("/clients");
}
