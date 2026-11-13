"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveDashboardLayout(layout: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const userId = (session.user as any).id;

  // Basic sanity check — must be a JSON array of widgets
  const parsed = JSON.parse(layout);
  if (!Array.isArray(parsed)) throw new Error("Invalid layout");

  await prisma.user.update({
    where: { id: userId },
    data: { dashboardLayout: layout },
  });
  revalidatePath("/");
}

export async function resetDashboardLayout() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const userId = (session.user as any).id;

  await prisma.user.update({
    where: { id: userId },
    data: { dashboardLayout: null },
  });
  revalidatePath("/");
}
