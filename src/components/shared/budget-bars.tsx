"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Plus, Trash2, Receipt, TrendingUp, TrendingDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addInvoice,
  deleteInvoice,
  type FinanceOverview,
} from "@/server/actions/finance-overview";

/* ---------------- formatting ---------------- */
function czk(n: number) {
  return `${Math.round(n).toLocaleString("cs-CZ")} Kč`;
}
function hours(n: number) {
  return `${n % 1 === 0 ? n : n.toFixed(1)} h`;
}

const TONES = {
  emerald: {
    track: "bg-emerald-500/10",
    fill: "bg-gradient-to-r from-emerald-400/80 to-emerald-500/80",
    text: "text-emerald-700",
  },
  sky: {
    track: "bg-sky-500/10",
    fill: "bg-gradient-to-r from-sky-400/80 to-sky-500/70",
    text: "text-sky-700",
  },
  amber: {
    track: "bg-amber-500/10",
    fill: "bg-gradient-to-r from-amber-400/80 to-amber-500/70",
    text: "text-amber-700",
  },
} as const;

/* ---------------- bar row ---------------- */
function BarRow({ bar }: { bar: FinanceOverview["bars"][number] }) {
  const tone = TONES[bar.tone];
  const over = bar.pct > 100;
  const fmt = bar.unit === "CZK" ? czk : hours;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xs font-medium text-[#57534E]">{bar.label}</p>
        <p className="text-xs text-[#78716C]">
          <span className={cn("font-semibold", tone.text)}>{fmt(bar.actual)}</span>
          {" / "}
          {fmt(bar.planned)}
          <span className={cn("ml-1.5", over ? "text-rose-600 font-semibold" : "text-[#A8A29E]")}>
            {Math.round(bar.pct)} %
          </span>
        </p>
      </div>
      <div className={cn("h-2.5 rounded-full overflow-hidden", tone.track)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", over ? "bg-gradient-to-r from-rose-400/80 to-rose-500/80" : tone.fill)}
          style={{ width: `${Math.min(100, Math.max(bar.actual > 0 ? 2 : 0, bar.pct))}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------- invoice dialog ---------------- */
function InvoiceDialog({
  projectId,
  invoices,
  onClose,
}: {
  projectId: string;
  invoices: FinanceOverview["invoices"];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState("ISSUED");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) return;
    startTransition(async () => {
      await addInvoice({ projectId, type, amount: value, note: note || undefined });
      setAmount("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-2xl w-full max-w-md p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#1C1917]">
            Fakturace
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/50">
            <X className="w-4 h-4 text-[#78716C]" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="glass-input rounded-lg px-3 py-2 text-sm text-[#1C1917]"
            >
              <option value="ISSUED">Vydaná klientovi</option>
              <option value="RECEIVED">Přijatá nákladová</option>
            </select>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Částka Kč"
              inputMode="decimal"
              className="glass-input rounded-lg px-3 py-2 text-sm text-[#1C1917]"
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Poznámka (nepovinné)"
            className="glass-input rounded-lg px-3 py-2 text-sm text-[#1C1917] w-full"
          />
          <button
            type="submit"
            disabled={pending}
            className="btn-glass-primary w-full text-white text-sm font-medium rounded-lg px-3 py-2 disabled:opacity-60"
          >
            {pending ? "Ukládám..." : "Přidat fakturu"}
          </button>
        </form>

        <div className="max-h-56 overflow-auto divide-y divide-black/5 rounded-lg bg-white/30">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 px-3 py-2">
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", inv.type === "ISSUED" ? "badge-emerald border" : "badge-sky border")}>
                {inv.type === "ISSUED" ? "Vydaná" : "Přijatá"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#1C1917] truncate">
                  {inv.note || inv.number || "Bez popisu"}
                </p>
                <p className="text-[10px] text-[#78716C]">{format(new Date(inv.date), "d.M.yyyy")}</p>
              </div>
              <span className="text-xs font-medium text-[#1C1917]">{czk(inv.amount)}</span>
              <button
                onClick={() =>
                  startTransition(async () => {
                    await deleteInvoice(inv.id);
                    router.refresh();
                  })
                }
                className="p-1 rounded hover:bg-rose-500/10 text-[#A8A29E] hover:text-rose-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {invoices.length === 0 && (
            <p className="px-3 py-6 text-xs text-[#78716C] text-center">Zatím žádné faktury</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- main card ---------------- */
export function BudgetBarsCard({
  projectId,
  overview,
  canEdit = true,
  compact = false,
}: {
  projectId: string;
  overview: FinanceOverview;
  canEdit?: boolean;
  compact?: boolean;
}) {
  const [showInvoices, setShowInvoices] = useState(false);
  const earnedPositive = overview.estimatedEarnings >= 0;

  if (!overview.hasBudget) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1C1917]">Rozpočet v kostce</h3>
        </div>
        <p className="text-xs text-[#78716C] mt-2">Zatím není vytvořený rozpočet.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1C1917]">Rozpočet v kostce</h3>
        {canEdit && (
          <button
            onClick={() => setShowInvoices(true)}
            className="inline-flex items-center gap-1 text-xs text-[#6366F1] hover:underline"
          >
            <Receipt className="w-3.5 h-3.5" /> Faktury ({overview.invoices.length})
          </button>
        )}
      </div>

      <div className={cn("space-y-3", compact && "space-y-2.5")}>
        {overview.bars.map((bar) => (
          <BarRow key={bar.key} bar={bar} />
        ))}
        {overview.bars.length === 0 && (
          <p className="text-xs text-[#78716C]">Rozpočet neobsahuje žádné položky.</p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-black/5 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#A8A29E]">Odhad výdělku</p>
          <p className={cn("text-lg font-semibold", earnedPositive ? "text-emerald-600" : "text-rose-600")}>
            {czk(overview.estimatedEarnings)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-[#A8A29E]">Plánovaná marže</p>
          <p className="text-sm font-medium text-[#57534E] flex items-center gap-1 justify-end">
            {overview.plannedMargin >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            )}
            {czk(overview.plannedMargin)}
            {overview.totalBudget > 0 && (
              <span className="text-xs text-[#78716C]">
                ({Math.round((overview.plannedMargin / overview.totalBudget) * 100)} %)
              </span>
            )}
          </p>
        </div>
      </div>

      {showInvoices && (
        <InvoiceDialog
          projectId={projectId}
          invoices={overview.invoices}
          onClose={() => setShowInvoices(false)}
        />
      )}
    </div>
  );
}
