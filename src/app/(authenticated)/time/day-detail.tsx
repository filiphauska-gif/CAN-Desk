"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTimeEntry } from "@/server/actions/time";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { X, Plus, Sun, Briefcase, Trash2, Clock } from "lucide-react";

type DayEntry = {
  id: string;
  hours: number;
  billable: boolean;
  entryType: string;
  description: string | null;
  projectId: string;
  projectName: string;
};

type DayData = {
  date: Date;
  entries: DayEntry[];
  totalHours: number;
  billableHours: number;
  vacationHours: number;
  sickHours: number;
};

export function DayDetail({
  date,
  dayData,
  userId,
  projects,
  onClose,
  onSaved,
}: {
  date: Date;
  dayData?: DayData;
  userId: string;
  projects: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [entryType, setEntryType] = useState("WORK");
  const [loading, setLoading] = useState(false);

  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const type = form.get("entryType") as string;

      if (type === "VACATION" || type === "SICK") {
        await createTimeEntry({
          hours: Number(form.get("hours")),
          date,
          description: form.get("description") as string || (type === "VACATION" ? "Dovolená" : "Nemoc"),
          billable: false,
          entryType: type,
          userId,
        });
      } else {
        await createTimeEntry({
          hours: Number(form.get("hours")),
          date,
          description: form.get("description") as string || undefined,
          billable: form.get("billable") === "true",
          entryType: "WORK",
          projectId: form.get("projectId") as string,
          userId,
        });
      }
      setShowForm(false);
      router.refresh();
      onSaved();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const hoursOptions = [];
  for (let h = 0.25; h <= 24; h += 0.25) {
    hoursOptions.push(h);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl border border-[#E7E5E4] w-full max-w-lg max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E5E4]">
          <div>
            <h3 className="text-sm font-semibold text-[#1C1917]">
              {format(date, "EEEE d. MMMM yyyy", { locale: cs })}
            </h3>
            {isWeekend && <span className="text-xs text-[#A8A29E]">Víkend</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEntryType("WORK"); setShowForm(!showForm); }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#6366F1] text-white text-xs font-medium hover:bg-[#4F46E5] transition-colors"
            >
              <Plus className="w-3 h-3" />
              Přidat
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#78716C]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-[#E7E5E4] bg-[#FAF8F5] space-y-3">
            {/* Entry type selector */}
            <div className="flex gap-2">
              {[
                { value: "WORK", label: "Práce", icon: Briefcase },
                { value: "VACATION", label: "Dovolená", icon: Sun },
                { value: "SICK", label: "Nemoc", icon: Clock },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEntryType(value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    entryType === value
                      ? "bg-[#6366F1] text-white"
                      : "bg-white border border-[#E7E5E4] text-[#78716C] hover:border-[#6366F1]"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>

            <input type="hidden" name="entryType" value={entryType} />

            {/* Project selector (only for WORK) */}
            {entryType === "WORK" && (
              <select
                name="projectId"
                required
                className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              >
                <option value="">Vyber zakázku...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#78716C] mb-1">Hodiny</label>
                <select
                  name="hours"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                >
                  {hoursOptions.map((h) => (
                    <option key={h} value={h}>
                      {h.toFixed(2).replace(".", ",").replace(",00", "")}h
                    </option>
                  ))}
                </select>
              </div>
              {entryType === "WORK" && (
                <div>
                  <label className="block text-xs text-[#78716C] mb-1">Typ</label>
                  <select
                    name="billable"
                    defaultValue="true"
                    className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  >
                    <option value="true">Fakturovatelný</option>
                    <option value="false">Režie</option>
                  </select>
                </div>
              )}
            </div>

            {(entryType === "WORK") && (
              <div>
                <input
                  name="description"
                  placeholder="Popis práce..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-[#78716C] hover:text-[#1C1917]">
                Zrušit
              </button>
              <button type="submit" disabled={loading} className="px-4 py-1.5 rounded-lg bg-[#6366F1] text-white text-xs font-medium hover:bg-[#4F46E5] disabled:opacity-50">
                {loading ? "..." : "Uložit"}
              </button>
            </div>
          </form>
        )}

        {/* Day entries */}
        <div className="divide-y divide-[#E7E5E4]">
          {dayData && dayData.entries.map((entry, i) => (
            <div key={entry.id || i} className="px-5 py-3 flex items-center gap-3">
              <span className={cn(
                "w-2 h-2 rounded-full shrink-0",
                entry.entryType === "VACATION" ? "bg-blue-500" :
                entry.entryType === "SICK" ? "bg-red-500" :
                entry.billable ? "bg-emerald-500" : "bg-gray-400"
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1C1917] truncate">
                  {entry.projectName || (entry.entryType === "VACATION" ? "Dovolená" : entry.entryType === "SICK" ? "Nemoc" : "Práce")}
                </p>
                {entry.description && (
                  <p className="text-xs text-[#78716C] truncate">{entry.description}</p>
                )}
              </div>
              <span className={cn(
                "text-sm font-medium shrink-0",
                entry.entryType === "VACATION" ? "text-blue-600" :
                entry.entryType === "SICK" ? "text-red-600" :
                entry.billable ? "text-green-600" : "text-[#78716C]"
              )}>
                {entry.hours.toFixed(2).replace(".", ",")}h
              </span>
            </div>
          ))}
          {(!dayData || dayData.entries.length === 0) && !showForm && (
            <div className="px-5 py-8 text-center text-sm text-[#78716C]">
              Žádné záznamy pro tento den
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
