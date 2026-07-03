"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCost } from "@/server/actions/finance";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";

export function ProjectFinanceTab({
  projectId,
  costs,
  budgetAmount,
  budgetHours,
  totalHours,
  canEdit,
}: {
  projectId: string;
  costs: any[];
  budgetAmount: number | null;
  budgetHours: number | null;
  totalHours: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalCosts = costs.reduce((s: number, c: any) => s + c.amount, 0);
  const externalCosts = costs.filter((c: any) => c.type === "EXTERNAL").reduce((s: number, c: any) => s + c.amount, 0);
  const internalCosts = costs.filter((c: any) => c.type === "INTERNAL").reduce((s: number, c: any) => s + c.amount, 0);

  const budget = budgetAmount || 0;
  const remaining = budget - totalCosts;
  const budgetUtilization = budget > 0 ? Math.round((totalCosts / budget) * 100) : 0;

  const laborAverageRate = 900; // approximate average hourly rate
  const estimatedLaborCost = totalHours * laborAverageRate;
  const totalProjectCost = totalCosts + estimatedLaborCost;
  const margin = budget > 0 ? Math.round(((budget - totalProjectCost) / budget) * 100) : 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await createCost({
        description: form.get("description") as string,
        amount: Number(form.get("amount")),
        type: form.get("type") as "INTERNAL" | "EXTERNAL",
        projectId,
      });
      setShowForm(false);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Financial overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4">
          <p className="text-xs text-[#78716C]">Rozpočet</p>
          <p className="text-xl font-semibold text-[#1C1917] mt-1">
            {budget.toLocaleString("cs-CZ")} Kč
          </p>
          {budgetHours && (
            <p className="text-xs text-[#78716C] mt-0.5">{budgetHours} alokovaných hodin</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4">
          <p className="text-xs text-[#78716C]">Náklady celkem</p>
          <p className="text-xl font-semibold text-[#1C1917] mt-1">
            {totalCosts.toLocaleString("cs-CZ")} Kč
          </p>
          <p className="text-xs text-[#78716C] mt-0.5">
            Interní: {internalCosts.toLocaleString("cs-CZ")} Kč • Externí: {externalCosts.toLocaleString("cs-CZ")} Kč
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4">
          <p className="text-xs text-[#78716C]">Odpracováno</p>
          <p className="text-xl font-semibold text-[#1C1917] mt-1">{totalHours}h</p>
          <p className="text-xs text-[#78716C] mt-0.5">
            Práce: {estimatedLaborCost.toLocaleString("cs-CZ")} Kč
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4">
          <p className="text-xs text-[#78716C]">Marže</p>
          <div className="flex items-center gap-2 mt-1">
            {margin >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
            <p className={`text-xl font-semibold ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>
              {margin}%
            </p>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            Zbývá: {remaining.toLocaleString("cs-CZ")} Kč
          </p>
        </div>
      </div>

      {/* Budget utilization */}
      {budget > 0 && (
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#78716C]">Vytížení rozpočtu</span>
            <span className="text-sm font-medium">{budgetUtilization}%</span>
          </div>
          <div className="h-3 bg-[#F5F5F4] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetUtilization > 90
                  ? "bg-red-500"
                  : budgetUtilization > 70
                  ? "bg-amber-500"
                  : "bg-[#6366F1]"
              }`}
              style={{ width: `${Math.min(100, budgetUtilization)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#78716C] mt-1">
            <span>0 Kč</span>
            <span>{budget.toLocaleString("cs-CZ")} Kč</span>
          </div>
        </div>
      )}

      {/* Add cost */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1917]">Náklady</h3>
        {canEdit && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" />
            Přidat náklad
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#E7E5E4] p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <input
                name="description"
                required
                placeholder="Popis nákladu"
                className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm"
              />
            </div>
            <div>
              <input
                name="amount"
                type="number"
                required
                placeholder="Částka"
                className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select name="type" className="px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm bg-white">
              <option value="EXTERNAL">Externí náklad</option>
              <option value="INTERNAL">Interní náklad</option>
            </select>
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Zrušit
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="bg-[#6366F1] text-white">
                {loading ? "..." : "Uložit"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Costs list */}
      <div className="bg-white rounded-xl border border-[#E7E5E4]">
        <div className="divide-y divide-[#E7E5E4]">
          {costs.map((cost: any) => (
            <div key={cost.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#1C1917]">{cost.description}</p>
                <p className="text-xs text-[#78716C]">
                  {cost.type === "EXTERNAL" ? "Externí" : "Interní"}
                </p>
              </div>
              <span className="text-sm font-medium text-[#1C1917]">
                {cost.amount.toLocaleString("cs-CZ")} Kč
              </span>
            </div>
          ))}
          {costs.length === 0 && (
            <p className="px-5 py-8 text-sm text-[#78716C] text-center">
              Žádné náklady
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
