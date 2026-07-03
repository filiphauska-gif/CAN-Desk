"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectStatusBadge } from "@/components/shared/status-badges";

type BudgetItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  type: string;
  order: number;
};

type ProjectFinance = {
  id: string;
  name: string;
  client: string;
  status: string;
  budgetAmount: number | null;
  discountPercent: number | null;
  vatRate: number | null;
  budgetItems: BudgetItem[];
  totalRevenueBudget: number;
  totalCostBudget: number;
  totalCosts: number;
  laborCost: number;
  totalExpenses: number;
  totalHours: number;
  margin: number;
};

export function FinanceProjectList({
  projects,
}: {
  projects: ProjectFinance[];
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="bg-white rounded-xl border border-[#E7E5E4] divide-y divide-[#E7E5E4]">
      {/* Header */}
      <div className="hidden lg:grid lg:grid-cols-12 px-5 py-3 text-xs font-medium text-[#78716C]">
        <div className="col-span-1"></div>
        <div className="col-span-3">Zakázka</div>
        <div className="col-span-2">Klient</div>
        <div className="col-span-1 text-right">Výnosy</div>
        <div className="col-span-1 text-right">Náklady</div>
        <div className="col-span-1 text-right">Hodiny</div>
        <div className="col-span-1 text-right">Marže</div>
        <div className="col-span-2">Status</div>
      </div>

      {projects.map((p) => {
        const isExpanded = expanded[p.id];
        return (
          <div key={p.id}>
            {/* Row */}
            <div
              className="grid grid-cols-1 lg:grid-cols-12 px-5 py-3 hover:bg-[#F5F5F4] transition-colors cursor-pointer items-center gap-2"
              onClick={() => toggle(p.id)}
            >
              <div className="lg:col-span-1 flex items-center">
                <button className="p-1 rounded hover:bg-[#E7E5E4] transition-colors">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[#78716C]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#78716C]" />
                  )}
                </button>
              </div>
              <div className="lg:col-span-3">
                <Link
                  href={`/projects/${p.id}?tab=rozpocet`}
                  className="text-sm font-medium text-[#6366F1] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {p.name}
                </Link>
              </div>
              <div className="lg:col-span-2 text-sm text-[#78716C]">{p.client}</div>
              <div className="lg:col-span-1 text-sm text-right font-medium text-emerald-600">
                {(p.totalRevenueBudget || p.budgetAmount || 0).toLocaleString("cs-CZ")}
              </div>
              <div className="lg:col-span-1 text-sm text-right text-red-500">
                {p.totalExpenses.toLocaleString("cs-CZ")}
              </div>
              <div className="lg:col-span-1 text-sm text-right text-[#78716C]">
                {p.totalHours}h
              </div>
              <div className="lg:col-span-1 text-sm text-right">
                <span
                  className={cn(
                    "font-medium",
                    p.margin >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {p.margin}%
                </span>
              </div>
              <div className="lg:col-span-2">
                <ProjectStatusBadge status={p.status} />
              </div>
            </div>

            {/* Expanded budget items */}
            {isExpanded && (
              <div className="bg-[#FAF8F5] border-t border-[#E7E5E4]">
                <div className="px-5 py-3">
                  <div className="text-xs font-medium text-[#78716C] mb-3">
                    Položky rozpočtu
                  </div>
                  {p.budgetItems.length === 0 && (
                    <p className="text-sm text-[#A8A29E] py-2">Žádné položky</p>
                  )}
                  {p.budgetItems.length > 0 && (
                    <div className="space-y-1">
                      {p.budgetItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-3 py-1.5 rounded bg-white text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full",
                                item.type === "REVENUE"
                                  ? "bg-emerald-500"
                                  : "bg-red-400"
                              )}
                            />
                            <span className="text-[#1C1917]">{item.name}</span>
                            <span className="text-xs text-[#A8A29E]">
                              {item.quantity} {item.unit} x {item.unitPrice.toLocaleString("cs-CZ")} Kč
                            </span>
                          </div>
                          <span
                            className={cn(
                              "font-medium",
                              item.type === "REVENUE"
                                ? "text-emerald-600"
                                : "text-red-500"
                            )}
                          >
                            {item.total.toLocaleString("cs-CZ")} Kč
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  <div className="flex items-center gap-6 mt-3 pt-3 border-t border-[#E7E5E4] text-sm">
                    <span className="text-emerald-600 font-medium">
                      Výnosy: {p.totalRevenueBudget.toLocaleString("cs-CZ")} Kč
                    </span>
                    <span className="text-red-500 font-medium">
                      Náklady: {p.totalCostBudget.toLocaleString("cs-CZ")} Kč
                    </span>
                    {p.discountPercent ? (
                      <span className="text-amber-600">
                        Sleva: {p.discountPercent}%
                      </span>
                    ) : null}
                    {p.vatRate ? (
                      <span className="text-[#78716C]">
                        DPH: {p.vatRate}%
                      </span>
                    ) : null}
                    <span className="text-[#78716C]">
                      Odpracováno: {p.totalHours}h
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {projects.length === 0 && (
        <div className="px-5 py-12 text-center text-sm text-[#78716C]">
          Žádné zakázky
        </div>
      )}
    </div>
  );
}
