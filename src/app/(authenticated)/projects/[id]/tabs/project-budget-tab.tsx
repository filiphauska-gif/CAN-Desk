"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createBudgetItem,
  deleteBudgetItem,
} from "@/server/actions/budget";
import { format } from "date-fns";
import { Plus, Trash2, TrendingUp, TrendingDown, GripVertical } from "lucide-react";

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

type Props = {
  projectId: string;
  budgetAmount: number | null;
  discountPercent: number | null;
  vatRate: number | null;
  canEdit: boolean;
};

export function ProjectBudgetTab({
  projectId,
  budgetAmount,
  discountPercent,
  vatRate,
  canEdit,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const mod = await import("@/server/actions/budget");
        const data = await mod.getBudgetItems(projectId);
        setItems(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  const revenueItems = items.filter((i) => i.type === "REVENUE");
  const costItems = items.filter((i) => i.type === "COST");
  const totalRevenue = revenueItems.reduce((s, i) => s + i.total, 0);
  const totalCosts = costItems.reduce((s, i) => s + i.total, 0);
  const discount = (totalRevenue * (discountPercent || 0)) / 100;
  const netRevenue = totalRevenue - discount;
  const vatAmount = (netRevenue * (vatRate || 21)) / 100;
  const totalWithVat = netRevenue + vatAmount;
  const grossMargin = netRevenue - totalCosts;
  const marginPercent = netRevenue > 0 ? Math.round((grossMargin / netRevenue) * 100) : 0;

  async function handleAddItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const qty = Number(form.get("quantity")) || 1;
      const price = Number(form.get("unitPrice")) || 0;
      await createBudgetItem({
        name: form.get("name") as string,
        quantity: qty,
        unit: (form.get("unit") as string) || "ks",
        unitPrice: price,
        type: form.get("type") as "REVENUE" | "COST",
        projectId,
      });
      setShowForm(false);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteBudgetItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-[#78716C]">Výnosy (bez DPH)</p>
          <p className="text-xl font-semibold text-emerald-600 mt-1">
            {totalRevenue.toLocaleString("cs-CZ")} Kč
          </p>
          {discount > 0 && (
            <p className="text-xs text-red-500 mt-0.5">
              Sleva: -{discount.toLocaleString("cs-CZ")} Kč ({discountPercent}%)
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 border-l-4 border-l-red-400">
          <p className="text-xs text-[#78716C]">Náklady</p>
          <p className="text-xl font-semibold text-red-500 mt-1">
            {totalCosts.toLocaleString("cs-CZ")} Kč
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 border-l-4 border-l-blue-400">
          <p className="text-xs text-[#78716C]">Marže</p>
          <div className="flex items-center gap-2 mt-1">
            {grossMargin >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
            <p
              className={`text-xl font-semibold ${
                grossMargin >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {grossMargin.toLocaleString("cs-CZ")} Kč
            </p>
          </div>
          <p
            className={`text-xs mt-0.5 ${
              marginPercent >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {marginPercent}% marže
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 border-l-4 border-l-purple-400">
          <p className="text-xs text-[#78716C]">S DPH ({vatRate}%)</p>
          <p className="text-xl font-semibold text-[#1C1917] mt-1">
            {totalWithVat.toLocaleString("cs-CZ")} Kč
          </p>
          <p className="text-xs text-[#78716C] mt-0.5">
            DPH: +{vatAmount.toLocaleString("cs-CZ")} Kč
          </p>
        </div>
      </div>

      {/* Budget Items */}
      <div className="bg-white rounded-xl border border-[#E7E5E4]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E5E4]">
          <h3 className="text-sm font-semibold text-[#1C1917]">Položky rozpočtu</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setExporting(true);
                window.open(`/api/budget-print/${projectId}`, '_blank');
                setTimeout(() => setExporting(false), 1000);
              }}
              disabled={exporting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E7E5E4] text-xs font-medium text-[#78716C] hover:bg-[#F5F5F4] transition-colors disabled:opacity-50"
            >
              {exporting ? "..." : "PDF"}
            </button>
            {canEdit && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#6366F1] text-white text-xs font-medium hover:bg-[#4F46E5] transition-colors"
              >
                <Plus className="w-3 h-3" /> Přidat položku
              </button>
            )}
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAddItem} className="px-5 py-4 border-b border-[#E7E5E4] bg-[#FAF8F5] space-y-3">
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2">
                <input name="name" required placeholder="Název položky" className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm" />
              </div>
              <div>
                <input name="quantity" type="number" step="0.01" defaultValue="1" className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm" />
              </div>
              <div>
                <input name="unit" defaultValue="ks" className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm" />
              </div>
              <div>
                <input name="unitPrice" type="number" step="0.01" required placeholder="Cena/jedn." className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select name="type" className="px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm bg-white">
                <option value="REVENUE">Výnos</option>
                <option value="COST">Náklad</option>
              </select>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#6366F1] text-white text-sm font-medium hover:bg-[#4F46E5] disabled:opacity-50">
                {saving ? "..." : "Přidat"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-[#78716C] hover:text-[#1C1917]">
                Zrušit
              </button>
            </div>
          </form>
        )}

        {/* Items table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E7E5E4] text-xs text-[#78716C]">
                <th className="text-left px-5 py-3 font-medium w-8"></th>
                <th className="text-left px-5 py-3 font-medium">Položka</th>
                <th className="text-right px-5 py-3 font-medium">Množství</th>
                <th className="text-right px-5 py-3 font-medium">Cena/jedn.</th>
                <th className="text-right px-5 py-3 font-medium">Celkem</th>
                <th className="text-right px-5 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[#F5F5F4] transition-colors">
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        item.type === "REVENUE" ? "bg-emerald-500" : "bg-red-400"
                      }`}
                      title={item.type === "REVENUE" ? "Výnos" : "Náklad"}
                    />
                  </td>
                  <td className="px-5 py-3 font-medium text-[#1C1917]">
                    {item.name}
                    <span className="text-xs text-[#A8A29E] ml-1">/{item.unit}</span>
                  </td>
                  <td className="px-5 py-3 text-right text-[#78716C]">
                    {item.quantity}
                  </td>
                  <td className="px-5 py-3 text-right text-[#78716C]">
                    {item.unitPrice.toLocaleString("cs-CZ")} Kč
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-medium ${
                      item.type === "REVENUE" ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {item.total.toLocaleString("cs-CZ")} Kč
                  </td>
                  <td className="px-5 py-3 text-right">
                    {canEdit && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded hover:bg-red-50 text-[#A8A29E] hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#E7E5E4] bg-[#FAF8F5] font-medium">
                <td colSpan={4} className="px-5 py-3 text-sm text-[#1C1917]">
                  {totalRevenue > 0 && (
                    <span className="text-emerald-600">
                      Výnosy celkem: {totalRevenue.toLocaleString("cs-CZ")} Kč
                    </span>
                  )}
                  {totalCosts > 0 && (
                    <span className="text-red-500 ml-4">
                      Náklady celkem: {totalCosts.toLocaleString("cs-CZ")} Kč
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-[#1C1917]">
                  {netRevenue.toLocaleString("cs-CZ")} Kč
                </td>
                <td></td>
              </tr>
              {discount > 0 && (
                <tr className="bg-red-50">
                  <td colSpan={4} className="px-5 py-2 text-xs text-red-600">
                    Sleva: {discountPercent}%
                  </td>
                  <td className="px-5 py-2 text-right text-xs text-red-600">
                    -{discount.toLocaleString("cs-CZ")} Kč
                  </td>
                  <td></td>
                </tr>
              )}
            </tfoot>
          </table>
          {items.length === 0 && !loading && (
            <div className="px-5 py-12 text-center text-sm text-[#78716C]">
              Žádné položky rozpočtu. Přidejte první položku výše.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
