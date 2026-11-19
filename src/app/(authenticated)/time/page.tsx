import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { TimeCalendar } from "./time-calendar";
import { getTimeByUser } from "@/server/actions/time";
import { Clock, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export default async function TimePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [myEntries, teamSummary, projects] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { userId: user.id, date: { gte: startOfMonth, lte: endOfMonth } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    }),
    getTimeByUser(startOfMonth, endOfMonth),
    prisma.project.findMany({
      where: { status: { notIn: ["UZAVRENO", "ZRUSENO"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const myHours = myEntries.reduce((s, e) => s + e.hours, 0);
  const myBillable = myEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1C1917]">Čas</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {format(now, "MMMM yyyy", { locale: cs })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#78716C]">Můj čas</p>
            <Clock className="w-4 h-4 text-[#6366F1]" />
          </div>
          <p className="text-2xl font-semibold text-[#1C1917] mt-1">{myHours}h</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#78716C]">Fakturovatelný</p>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-semibold text-emerald-600 mt-1">{myBillable}h</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#78716C]">Režie</p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-semibold text-[#78716C] mt-1">{(myHours - myBillable).toFixed(1)}h</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#78716C]">Dnů v měsíci</p>
            <Users className="w-4 h-4 text-[#6366F1]" />
          </div>
          <p className="text-2xl font-semibold text-[#1C1917] mt-1">{new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}</p>
        </div>
      </div>

      {/* Calendar */}
      <TimeCalendar
        year={now.getFullYear()}
        month={now.getMonth() + 1}
        userId={user.id}
        projects={projects}
      />

      {/* Team overview */}
      <div className="glass rounded-xl">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-black/5">
          <Users className="w-4 h-4 text-[#78716C]" />
          <h2 className="text-sm font-semibold text-[#1C1917]">Tým tento měsíc</h2>
        </div>
        <div className="divide-y divide-black/5">
          {teamSummary.map((member: any) => (
            <div key={member.id} className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-[#1C1917]">{member.name}</span>
              <div className="flex items-center gap-4">
                <span className={cn("text-xs", member.total > 0 ? "text-emerald-600" : "text-[#78716C]")}>
                  fakt.: {member.billable.toFixed(1)}h
                </span>
                <span className="text-sm font-medium">{member.total.toFixed(1)}h</span>
              </div>
            </div>
          ))}
          {teamSummary.length === 0 && (
            <p className="px-5 py-8 text-sm text-[#78716C] text-center">Žádné záznamy týmu</p>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
