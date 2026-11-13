import { prisma } from "@/lib/db";

/**
 * Atomic document numbering: JOB-00001, I-00001, PO-00001, ...
 * Counter row is incremented in a single upsert, so parallel requests never collide.
 */
export async function nextNumber(prefix: string, pad = 5): Promise<string> {
  const counter = await prisma.counter.upsert({
    where: { key: prefix },
    update: { value: { increment: 1 } },
    create: { key: prefix, value: 1 },
  });
  return `${prefix}-${String(counter.value).padStart(pad, "0")}`;
}
