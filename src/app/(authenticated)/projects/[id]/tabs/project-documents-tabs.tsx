"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileText, Plus, Trash2, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createInvoiceFromBudget,
  createOrderFromBudget,
  setInvoiceStatus,
  setOrderStatus,
} from "@/server/actions/documents";
import { deleteInvoice } from "@/server/actions/finance-overview";
import { cn } from "@/lib/utils";

const czk = (n: number) => n.toLocaleString("cs-CZ") + " Kč";

const INVOICE_STATUSES: Record<string, string> = {
  VYSTAVENA: "Vystavena",
  UHRAZENA: "Uhrazena",
  PO_SPLATNOSTI: "Po splatnosti",
  STORNO: "Storno",
};

const ORDER_STATUSES: Record<string, string> = {
  VYSTAVENA: "Vystavena",
  POTVRZENA: "Potvrzena",
  DODANO: "Dodáno",
  STORNO: "Storno",
};

export function ProjectInvoicesTab({
  projectId,
  invoices,
  canEdit,
  hasBudget,
}: {
  projectId: string;
  invoices: any[];
  canEdit: boolean;
  hasBudget: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      const inv = await createInvoiceFromBudget(projectId);
      window.open(`/api/invoice-print/${inv.id}`, "_blank");
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Nepodařilo se vytvořit fakturu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#78716C]">{invoices.length} faktur</p>
        {canEdit && (
          <Button
            size="sm"
            className="gap-2 btn-glass-primary text-white"
            onClick={create}
            disabled={loading || !hasBudget}
            title={hasBudget ? "Vytvořit fakturu z rozpočtu" : "Zakázka nemá rozpočet"}
          >
            <Plus className="w-4 h-4" />
            {loading ? "Vytvářím..." : "Nová faktura z rozpočtu"}
          </Button>
        )}
      </div>

      <div className="glass rounded-xl divide-y divide-black/5">
        {invoices.map((inv) => (
          <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
            <FileText className="w-4 h-4 text-[#6366F1] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#1C1917] font-medium">{inv.number || "(bez čísla)"}</p>
              <p className="text-xs text-[#78716C]">
                {format(new Date(inv.date), "d.M.yyyy")}
                {inv.dueDate && ` • splatnost ${format(new Date(inv.dueDate), "d.M.yyyy")}`}
                {inv.note && ` • ${inv.note}`}
              </p>
            </div>
            <select
              value={inv.status || "VYSTAVENA"}
              onChange={async (e) => {
                await setInvoiceStatus(inv.id, e.target.value);
                router.refresh();
              }}
              className="text-xs px-2 py-1 rounded-lg border border-white/40 bg-white/70"
            >
              {Object.entries(INVOICE_STATUSES).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <span className="text-sm font-medium text-[#1C1917] w-28 text-right">
              {czk(inv.amount)}
            </span>
            <a
              href={`/api/invoice-print/${inv.id}`}
              target="_blank"
              className="px-2 py-1 rounded-lg text-xs text-[#6366F1] hover:bg-white/60"
            >
              PDF
            </a>
            {canEdit && (
              <button
                onClick={async () => {
                  await deleteInvoice(inv.id);
                  router.refresh();
                }}
                className="p-1.5 rounded-lg text-[#A8A29E] hover:text-rose-500 hover:bg-white/70"
                title="Smazat fakturu"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {invoices.length === 0 && (
          <p className="px-5 py-10 text-sm text-[#78716C] text-center">
            Zatím žádné faktury. {hasBudget ? "Vytvořte první z rozpočtu." : "Nejdřív vytvořte rozpočet."}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProjectOrdersTab({
  projectId,
  orders,
  canEdit,
}: {
  projectId: string;
  orders: any[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      const order = await createOrderFromBudget(projectId);
      window.open(`/api/order-print/${order.id}`, "_blank");
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Nepodařilo se vytvořit objednávku");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#78716C]">{orders.length} objednávek</p>
        {canEdit && (
          <Button
            size="sm"
            className="gap-2 btn-glass-primary text-white"
            onClick={create}
            disabled={loading}
            title="Vytvořit objednávku z externích nákladů rozpočtu"
          >
            <Plus className="w-4 h-4" />
            {loading ? "Vytvářím..." : "Nová objednávka z rozpočtu"}
          </Button>
        )}
      </div>

      <div className="glass rounded-xl divide-y divide-black/5">
        {orders.map((o) => {
          const total = (o.items || []).reduce((s: number, i: any) => s + i.total, 0);
          return (
            <div key={o.id} className="flex items-center gap-3 px-5 py-3">
              <PackageOpen className="w-4 h-4 text-[#6366F1] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1C1917] font-medium">
                  {o.orderNumber} <span className="text-[#78716C] font-normal">- {o.supplier}</span>
                </p>
                <p className="text-xs text-[#78716C]">
                  {format(new Date(o.date), "d.M.yyyy")} • {o.items?.length || 0} položek
                </p>
              </div>
              <select
                value={o.status || "VYSTAVENA"}
                onChange={async (e) => {
                  await setOrderStatus(o.id, e.target.value);
                  router.refresh();
                }}
                className="text-xs px-2 py-1 rounded-lg border border-white/40 bg-white/70"
              >
                {Object.entries(ORDER_STATUSES).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
              <span className="text-sm font-medium text-[#1C1917] w-28 text-right">
                {czk(total)}
              </span>
              <a
                href={`/api/order-print/${o.id}`}
                target="_blank"
                className="px-2 py-1 rounded-lg text-xs text-[#6366F1] hover:bg-white/60"
              >
                PDF
              </a>
            </div>
          );
        })}
        {orders.length === 0 && (
          <p className="px-5 py-10 text-sm text-[#78716C] text-center">
            Zatím žádné objednávky. Vytvoří se z externích nákladů rozpočtu.
          </p>
        )}
      </div>
    </div>
  );
}
