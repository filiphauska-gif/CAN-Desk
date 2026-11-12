import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FinanceProjectList } from "./finance-project-list";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

export default async function FinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  if (!["ADMIN", "FINANCE", "ACCOUNT_MANAGER"].includes(user.role)) {
    redirect("/");
  }

  const projects = await prisma.project.findMany({
    where: { status: { notIn: ["ARCHIVOVANO"] } },
    include: {
      client: { select: { name: true } },
      costs: true,
      timeEntries: { include: { user: true } },
      budgetItems: { orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate finance data per project
  const projectFinance = projects.map((p) => {
    const totalCosts = p.costs.reduce((s, c) => s + c.amount, 0);
    const totalRevenueBudget = p.budgetItems
      .filter((i) => i.type === "REVENUE")
      .reduce((s, i) => s + i.total, 0);
    const totalCostBudget = p.budgetItems
      .filter((i) => i.type === "COST")
      .reduce((s, i) => s + i.total, 0);
    const totalHours = p.timeEntries.reduce((s, e) => s + e.hours, 0);
    const laborCost = p.timeEntries.reduce(
      (s, e) => s + e.hours * (e.user.hourlyRate || 900),
      0
    );
    const totalExpenses = totalCosts + totalCostBudget + laborCost;
    const budget = p.budgetAmount || 0;
    const margin =
      budget > 0
        ? Math.round(((budget - totalExpenses) / budget) * 100)
        : totalRevenueBudget > 0
        ? Math.round(
            ((totalRevenueBudget - totalCostBudget - laborCost) / totalRevenueBudget) * 100
          )
        : 0;

    return {
      id: p.id,
      name: p.name,
      client: p.client.name,
      status: p.status,
      budgetAmount: p.budgetAmount,
      discountPercent: p.discountPercent,
      vatRate: p.vatRate,
      budgetItems: p.budgetItems,
      totalRevenueBudget,
      totalCostBudget,
      totalCosts,
      laborCost,
      totalExpenses,
      totalHours,
      margin,
    };
  });

  const totalRevenue = projectFinance.reduce((s, p) => s + p.totalRevenueBudget, 0);
  const totalExpenses = projectFinance.reduce((s, p) => s + p.totalExpenses, 0);
  const totalMargin =
    totalRevenue > 0
      ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1C1917]">Finance</h1>
        <p className="text-sm text-[#78716C] mt-0.5">
          Přehled rozpočtů a nákladů napříč zakázkami
        </p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-[#78716C]">Celkové výnosy (bez DPH)</p>
          <p className="text-xl font-semibold text-emerald-600 mt-1">
            {totalRevenue.toLocaleString("cs-CZ")} Kč
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-[#78716C]">Celkové náklady</p>
          <p className="text-xl font-semibold text-rose-500 mt-1">
            {totalExpenses.toLocaleString("cs-CZ")} Kč
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-[#78716C]">Celková marže</p>
          <div className="flex items-center gap-2 mt-1">
            {totalMargin >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-500" />
            )}
            <p
              className={`text-xl font-semibold ${
                totalMargin >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {totalMargin}%
            </p>
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-[#78716C]">Aktivních zakázek</p>
          <p className="text-xl font-semibold text-[#1C1917] mt-1">
            {projectFinance.length}
          </p>
        </div>
      </div>

      {/* Project list with expandable budget */}
      <FinanceProjectList projects={projectFinance} />
    </div>
  );
}
