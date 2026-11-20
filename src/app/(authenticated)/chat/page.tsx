import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ChatPageClient } from "./chat-page-client";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const me = session.user as any;

  const people = await prisma.user.findMany({
    where: { active: true, id: { not: me.id } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <ChatPageClient meId={me.id} people={people} />;
}
