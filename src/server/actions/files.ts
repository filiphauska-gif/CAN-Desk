"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const MAX_SIZE = 4 * 1024 * 1024; // 4 MB per file (server action limit)

export async function uploadFiles(projectId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  const files = formData.getAll("files") as File[];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (file.size > MAX_SIZE) throw new Error(`Soubor ${file.name} je větší než 4 MB`);
    const buf = Buffer.from(await file.arrayBuffer());
    await prisma.attachment.create({
      data: {
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        data: buf,
        projectId,
        uploadedById: user.id,
      },
    });
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteAttachment(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const att = await prisma.attachment.delete({ where: { id } });
  if (att.projectId) revalidatePath(`/projects/${att.projectId}`);
  return att;
}
