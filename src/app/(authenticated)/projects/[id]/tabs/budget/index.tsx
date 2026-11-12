"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Plus, Eye, EyeOff, TrendingUp, TrendingDown, FileDown, Check, Send, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- TYPES ----------
type BudgetLine = {
  id: string;
  type: string;
  subject: string;
  clientDescription: string | null;
  internalDescription: string | null;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  unitPrice: number;
  hourlyRate: number;
  internalHourlyCost: number;
  plannedHours: number;
  totalExclVat: number;
  vatRate: number;
  vatAmount: number;
  totalInclVat: number;
  plannedMargin: number;
  plannedMarginPercent: number;
  isPrintable: boolean;
  isInternalOnly: boolean;
  sortOrder: number;
  category: string | null;
  supplier: string | null;
  children: BudgetLine[];
};

type BudgetDoc = {
  id: string;
  documentNumber: string;
  title: string;
  status: string;
  client: { id: string; name: string; billingAddress: string | null; companyId: string | null; vatId: string | null; contactName: string | null; email: string | null; phone: string | null; defaultCurrency: string | null; defaultPaymentTerms: string | null };
  owner: { id: string; name: string };
  lines: BudgetLine[];
  discountPercent: number | null;
  discountAmount: number | null;
  specificationHtml: string | null;
  currency: string;
  paymentTerms: string | null;
  date: string;
  validUntil: string | null;
  version: number;
};

type Props = {
  projectId: string;
  canEdit: boolean;
  users: { id: string; name: string }[];
  budget: BudgetDoc | null;
};

const STATUS_LABELS: Record<string, string> = {
  ROZPRACOVANO: "Rozpracováno", KE_KONTROLE: "Ke kontrole", SCHVALENO: "Schváleno",
  ODESLANO: "Odesláno klientovi", CEKA_NA_KLIENTA: "Čeká na klienta",
  SCHVALENO_KLIENTEM: "Schváleno klientem", ZAMITNUTO: "Zamítnuto",
  PREVEDENO: "Převedeno do zakázky", FAKTUROVANO: "Fakturováno", ARCHIVOVANO: "Archivováno",
};

const TYPE_LABELS: Record<string, string> = {
  INTERNI_PRACE: "Interní práce", EXTERNI_NAKLAD: "Externí náklad",
  PREFAKTURACE: "Přefakturace", PAUSAL: "Paušál", SLEVA: "Sleva",
  SKUPINA: "Skupina", TEXT: "Text",
};

export function ProjectBudgetNewTab({ projectId, canEdit, users, budget }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"internal" | "client">("internal");
  const [lines, setLines] = useState<BudgetLine[]>(budget?.lines || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingType, setAddingType] = useState("INTERNI_PRACE");

  // Compute totals
  const revenueLines = lines.filter((l) => l.type !== "SLEVA" && l.type !== "SKUPINA" && l.type !== "TEXT" && !l.isInternalOnly);
  const costLines = lines.filter((l) => l.type !== "SLEVA" && l.type !== "SKUPINA" && l.type !== "TEXT" && (l.totalCost || 0) > 0);
  const totalRevenue = revenueLines.reduce((s, l) => s + (l.totalExclVat || 0), 0);
  const totalCosts = costLines.reduce((s, l) => s + (l.totalCost || 0), 0);
  const totalHours = lines.filter((l) => l.type === "INTERNI_PRACE").reduce((s, l) => s + (l.plannedHours || 0), 0);
  const docDiscount = ((budget?.discountPercent || 0) / 100) * totalRevenue + (budget?.discountAmount || 0);
  const netRevenue = totalRevenue - docDiscount;
  const totalVat = netRevenue > 0 ? (netRevenue * 21) / 100 : 0;
  const totalWithVat = netRevenue + totalVat;
  const grossMargin = netRevenue - totalCosts;
  const marginPercent = netRevenue > 0 ? Math.round((grossMargin / netRevenue) * 100) : 0;

  const marginColor = marginPercent >= 30 ? "text-emerald-600" : marginPercent >= 15 ? "text-amber-600" : marginPercent >= 0 ? "text-rose-500" : "text-rose-600 font-bold";

  async function handleAddLine(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!budget) return;
    const form = new FormData(e.currentTarget);
    try {
      const mod = await import("@/server/actions/budget-new");
      await mod.createBudgetLine({
        budgetDocumentId: budget.id,
        type: form.get("type") as string,
        subject: form.get("subject") as string,
        quantity: Number(form.get("quantity")) || 1,
        unit: (form.get("unit") as string) || "ks",
        unitCost: Number(form.get("unitCost")) || 0,
        markupPercent: Number(form.get("markupPercent")) || 0,
        hourlyRate: Number(form.get("hourlyRate")) || 0,
        internalHourlyCost: Number(form.get("internalHourlyCost")) || 0,
        plannedHours: Number(form.get("plannedHours")) || 0,
        vatRate: Number(form.get("vatRate")) || 21,
        category: (form.get("category") as string) || undefined,
        clientDescription: (form.get("clientDescription") as string) || undefined,
      });
      setShowAddForm(false);
      router.refresh();
    } catch (e) { console.error(e); }
  }

  async function handleDeleteLine(id: string) {
    try {
      const mod = await import("@/server/actions/budget-new");
      await mod.deleteBudgetLine(id);
      router.refresh();
    } catch (e) { console.error(e); }
  }

  function getLineColor(line: BudgetLine) {
    if (viewMode === "client" && line.isInternalOnly) return "hidden";
    if (line.type === "SKUPINA") return "bg-white/35 font-semibold";
    if (line.type === "TEXT") return "italic text-[#78716C]";
    if (line.type === "SLEVA") return "text-rose-500";
    return "";
  }

  return (
    <div className="space-y-6">
      {/* Header tools */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {budget && (
            <span className="text-xs font-mono text-[#78716C] bg-white/35 px-2 py-1 rounded">
              {budget.documentNumber} | v{budget.version}
            </span>
          )}
          <span className={cn("text-xs px-2 py-1 rounded font-medium", STATUS_LABELS[budget?.status || ""] ? "badge-indigo" : "badge-stone")}>
            {STATUS_LABELS[budget?.status || ""] || "Nová nabídka"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-white/35 rounded-lg p-0.5">
            <button onClick={() => setViewMode("internal")} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", viewMode === "internal" ? "bg-white text-[#1C1917] shadow-sm" : "text-[#78716C]")}>
              <Eye className="w-3 h-3 inline mr-1" />Interní
            </button>
            <button onClick={() => setViewMode("client")} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", viewMode === "client" ? "bg-white text-[#1C1917] shadow-sm" : "text-[#78716C]")}>
              <EyeOff className="w-3 h-3 inline mr-1" />Klient
            </button>
          </div>
          {budget && (
            <button onClick={() => window.open(`/api/budget-print/${projectId}`, "_blank")} className="px-3 py-1.5 rounded-lg border border-white/40 text-xs text-[#78716C] hover:bg-white/40">
              <FileDown className="w-3 h-3 inline mr-1" />PDF
            </button>
          )}
        </div>
      </div>

      {/* No budget yet */}
      {!budget && (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-[#78716C] mb-3">Tato zakázka zatím nemá rozpočet</p>
          {canEdit && (
            <button onClick={async () => {
              try {
                const mod = await import("@/server/actions/budget-new");
                // We need a client - get from the project
                const projectsMod = await import("@/server/actions/projects");
                const project = await projectsMod.getProject(projectId);
                if (project?.clientId) {
                  await mod.createBudgetDocument({ title: `Rozpočet - ${project.name}`, clientId: project.clientId, projectId });
                  router.refresh();
                }
              } catch (e) { console.error(e); }
            }} className="px-4 py-2 btn-glass-primary text-white rounded-xl text-sm">
              Vytvořit rozpočet
            </button>
          )}
        </div>
      )}

      {/* Budget Document */}
      {budget && (
        <>
          {/* Client info card */}
          <div className="glass rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs text-[#78716C]">Klient</span>
              <p className="font-medium">{budget.client.name}</p>
              {budget.client.contactName && <p className="text-xs text-[#78716C]">{budget.client.contactName}</p>}
            </div>
            <div>
              <span className="text-xs text-[#78716C]">Kontakt</span>
              <p className="text-xs">{budget.client.email || "—"}</p>
              <p className="text-xs">{budget.client.phone || "—"}</p>
            </div>
            {viewMode === "internal" && (
              <>
                <div>
                  <span className="text-xs text-[#78716C]">IČ / DIČ</span>
                  <p className="text-xs">{budget.client.companyId || "—"} / {budget.client.vatId || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-[#78716C]">Adresa</span>
                  <p className="text-xs">{budget.client.billingAddress || "—"}</p>
                </div>
              </>
            )}
          </div>

          {/* Lines table */}
          <div className="glass rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
              <h3 className="text-sm font-semibold text-[#1C1917]">
                Položky rozpočtu ({lines.length})
                {totalHours > 0 && <span className="text-xs text-[#78716C] ml-2 font-normal">{totalHours}h plánováno</span>}
              </h3>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <select value={addingType} onChange={(e) => setAddingType(e.target.value)} className="text-xs px-2 py-1.5 rounded glass">
                    <option value="INTERNI_PRACE">Interní práce</option>
                    <option value="EXTERNI_NAKLAD">Externí náklad</option>
                    <option value="PREFAKTURACE">Přefakturace</option>
                    <option value="PAUSAL">Paušál</option>
                    <option value="SLEVA">Sleva</option>
                    <option value="SKUPINA">Skupina</option>
                    <option value="TEXT">Text</option>
                  </select>
                  <button onClick={() => setShowAddForm(!showAddForm)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg btn-glass-primary text-white text-xs font-medium hover:bg-[#4F46E5]">
                    <Plus className="w-3 h-3" /> Přidat
                  </button>
                </div>
              )}
            </div>

            {/* Add form */}
            {showAddForm && (
              <form onSubmit={handleAddLine} className="px-5 py-4 border-b bg-white/30 space-y-3">
                <input type="hidden" name="type" value={addingType} />
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-2">
                    <input name="subject" required placeholder="Název položky" className="w-full px-3 py-2 rounded-lg border text-sm" />
                  </div>
                  {addingType === "INTERNI_PRACE" && (
                    <>
                      <div><input name="plannedHours" type="number" step="0.5" placeholder="Hodiny" className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                      <div><input name="hourlyRate" type="number" placeholder="Prodejní sazba" className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                      <div><input name="internalHourlyCost" type="number" placeholder="Nákladová sazba" className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                      <div><input name="vatRate" type="number" defaultValue="21" className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                    </>
                  )}
                  {addingType === "EXTERNI_NAKLAD" && (
                    <>
                      <div><input name="quantity" type="number" step="0.01" defaultValue="1" className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                      <div><input name="unit" defaultValue="ks" className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                      <div><input name="unitCost" type="number" step="0.01" placeholder="Náklad/jedn." className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                      <div><input name="markupPercent" type="number" step="0.1" placeholder="Přirážka %" className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                    </>
                  )}
                  {addingType === "PREFAKTURACE" && (
                    <>
                      <div><input name="quantity" type="number" step="0.01" defaultValue="1" className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                      <div><input name="unit" defaultValue="ks" className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                      <div><input name="unitCost" type="number" step="0.01" placeholder="Cena" className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                    </>
                  )}
                  {addingType === "PAUSAL" && (
                    <div className="col-span-2"><input name="unitCost" type="number" step="0.01" placeholder="Fixní částka" className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
                  )}
                  {addingType === "SLEVA" && (
                    <div className="col-span-2 flex gap-3">
                      <input name="discountPercent" type="number" step="0.1" placeholder="Sleva %" className="w-full px-3 py-2 rounded-lg border text-sm" />
                      <input name="unitCost" type="number" step="0.01" placeholder="Nebo částka" className="w-full px-3 py-2 rounded-lg border text-sm" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input name="clientDescription" placeholder="Popis pro klienta (volitelný)" className="w-full px-3 py-2 rounded-lg border text-sm" />
                  {viewMode === "internal" && <input name="internalDescription" placeholder="Interní poznámka" className="w-full px-3 py-2 rounded-lg border text-sm" />}
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-xs text-[#78716C]">Zrušit</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg btn-glass-primary text-white text-xs">Přidat položku</button>
                </div>
              </form>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-xs text-[#78716C]">
                    <th className="text-left px-5 py-3 font-medium">Položka</th>
                    <th className="text-right px-5 py-3 font-medium">Počet</th>
                    {viewMode === "internal" && <th className="text-right px-5 py-3 font-medium">Náklad/jedn.</th>}
                    <th className="text-right px-5 py-3 font-medium">Cena/jedn.</th>
                    <th className="text-right px-5 py-3 font-medium">Celkem bez DPH</th>
                    {viewMode === "internal" && <th className="text-right px-5 py-3 font-medium">Marže</th>}
                    <th className="text-right px-5 py-3 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {lines.filter((l) => viewMode !== "client" || !l.isInternalOnly).map((line) => (
                    <tr key={line.id} className={cn("hover:bg-white/40 transition-colors", getLineColor(line))}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {line.type === "SKUPINA" && <span className="text-xs font-bold">{line.subject}</span>}
                          {line.type !== "SKUPINA" && (
                            <>
                              <span className={cn("w-2 h-2 rounded-full shrink-0", line.type === "INTERNI_PRACE" ? "bg-indigo-400" : line.type === "EXTERNI_NAKLAD" ? "bg-amber-400" : line.type === "PREFAKTURACE" ? "bg-violet-400" : line.type === "PAUSAL" ? "bg-emerald-400" : line.type === "SLEVA" ? "bg-rose-400" : "bg-stone-300")} />
                              <div>
                                <span className="text-[#1C1917]">{line.subject}</span>
                                {line.clientDescription && viewMode === "client" && <p className="text-xs text-[#78716C]">{line.clientDescription}</p>}
                                {line.internalDescription && viewMode === "internal" && <p className="text-xs text-[#A8A29E]">{line.internalDescription}</p>}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">{line.type !== "INTERNI_PRACE" && line.type !== "PAUSAL" && line.type !== "TEXT" ? (line.type === "INTERNI_PRACE" ? `${line.plannedHours}h` : `${line.quantity} ${line.unit}`) : line.type === "INTERNI_PRACE" ? `${line.plannedHours}h` : "—"}</td>
                      {viewMode === "internal" && <td className="px-5 py-3 text-right text-[#78716C]">{line.unitCost ? `${line.unitCost.toLocaleString("cs-CZ")} Kč` : "—"}</td>}
                      <td className="px-5 py-3 text-right">{line.unitPrice ? `${line.unitPrice.toLocaleString("cs-CZ")} Kč` : "—"}</td>
                      <td className={cn("px-5 py-3 text-right font-medium", line.totalExclVat >= 0 ? "text-emerald-600" : "text-rose-500")}>{line.totalExclVat.toLocaleString("cs-CZ")} Kč</td>
                      {viewMode === "internal" && (
                        <td className="px-5 py-3 text-right">
                          <span className={cn("text-xs", line.plannedMargin >= 0 ? "text-emerald-600" : "text-rose-500")}>
                            {line.plannedMarginPercent}%
                          </span>
                        </td>
                      )}
                      <td className="px-5 py-3 text-right">
                        {canEdit && line.type !== "SKUPINA" && line.type !== "TEXT" && (
                          <button onClick={() => handleDeleteLine(line.id)} className="p-1 rounded hover:bg-rose-50 text-[#A8A29E] hover:text-rose-500">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr><td colSpan={viewMode === "internal" ? 7 : 4} className="px-5 py-8 text-center text-sm text-[#78716C]">Žádné položky</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4 border-l-4 border-l-emerald-400">
              <p className="text-xs text-[#78716C]">Celkem bez DPH</p>
              <p className="text-xl font-semibold text-emerald-600 mt-1">{netRevenue.toLocaleString("cs-CZ")} Kč</p>
              <p className="text-xs text-[#78716C] mt-0.5">DPH: +{totalVat.toLocaleString("cs-CZ")} Kč</p>
            </div>
            <div className="glass rounded-xl p-4 border-l-4 border-l-amber-400">
              <p className="text-xs text-[#78716C]">Náklady</p>
              <p className="text-xl font-semibold text-[#1C1917] mt-1">{totalCosts.toLocaleString("cs-CZ")} Kč</p>
              <p className="text-xs text-[#78716C] mt-0.5">{totalHours}h plánovaných</p>
            </div>
            <div className={cn("glass rounded-xl p-4 border-l-4", marginPercent >= 30 ? "border-l-emerald-400" : marginPercent >= 15 ? "border-l-amber-400" : "border-l-red-500")}>
              <p className="text-xs text-[#78716C]">Marže</p>
              <div className="flex items-center gap-2 mt-1">
                {grossMargin >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-rose-500" />}
                <p className={cn("text-xl font-semibold", marginColor)}>{grossMargin.toLocaleString("cs-CZ")} Kč</p>
              </div>
              <p className={cn("text-xs mt-0.5", marginColor)}>{marginPercent}% marže</p>
            </div>
            <div className="glass rounded-xl p-4 border-l-4 border-l-purple-500">
              <p className="text-xs text-[#78716C]">S DPH (21%)</p>
              <p className="text-xl font-semibold text-[#1C1917] mt-1">{totalWithVat.toLocaleString("cs-CZ")} Kč</p>
              <p className="text-xs text-[#78716C] mt-0.5">K fakturaci</p>
            </div>
          </div>

          {/* Margin warning */}
          {marginPercent < 15 && marginPercent >= 0 && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-5 py-3 text-sm text-amber-800">
              ⚠ Marže je pouze {marginPercent}% — doporučujeme navýšit ceny nebo snížit náklady.
            </div>
          )}
          {marginPercent < 0 && (
            <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl px-5 py-3 text-sm text-rose-700">
              🚫 Marže je záporná ({marginPercent}%) — zakázka je ve ztrátě!
            </div>
          )}
        </>
      )}
    </div>
  );
}
