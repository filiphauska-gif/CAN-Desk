"use server";

import { prisma } from "@/lib/db";
import { notifyProjectComment } from "@/server/actions/notifications";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function addComment(projectId: string, content: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.comment.create({
    data: {
      content,
      projectId,
      authorId: (session.user as any).id,
    },
  });
  await notifyProjectComment(projectId, (session.user as any).id, content);
  revalidatePath(`/projects/${projectId}`);
}
