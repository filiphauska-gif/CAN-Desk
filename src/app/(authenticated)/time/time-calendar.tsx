"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { cs } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayDetail } from "./day-detail";
import { TimeWeekView } from "./time-week-view";

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

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function TimeCalendar({
  year,
  month,
  userId,
  projects,
}: {
  year: number;
  month: number;
  userId: string;
  projects: { id: string; name: string }[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date(year, month - 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayDataMap, setDayDataMap] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const mod = await import("@/server/actions/time");
        const entries = await mod.getTimeEntries({
          from: calStart,
          to: calEnd,
        });
        if (cancelled) return;

        const map: Record<string, DayData> = {};
        for (const entry of entries as any[]) {
          const dateKey = format(new Date(entry.date), "yyyy-MM-dd");
          if (!map[dateKey]) {
            map[dateKey] = {
              date: new Date(entry.date),
              entries: [],
              totalHours: 0,
              billableHours: 0,
              vacationHours: 0,
              sickHours: 0,
            };
          }
          map[dateKey].entries.push({
            id: entry.id,
            hours: entry.hours,
            billable: entry.billable,
            entryType: (entry as any).entryType || "WORK",
            description: entry.description,
            projectId: entry.projectId,
            projectName: entry.project?.name || "",
          });
          map[dateKey].totalHours += entry.hours;
          if (entry.billable) map[dateKey].billableHours += entry.hours;
          if ((entry as any).entryType === "VACATION")
            map[dateKey].vacationHours += entry.hours;
          if ((entry as any).entryType === "SICK")
            map[dateKey].sickHours += entry.hours;
        }
        setDayDataMap(map);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [currentMonth.getTime(), refreshKey]);

  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const monthDays = days.filter((d) => isSameMonth(d, currentMonth));
  const monthTotalHours = monthDays.reduce(
    (sum, d) => sum + (dayDataMap[format(d, "yyyy-MM-dd")]?.totalHours || 0),
    0
  );
  const monthBillableHours = monthDays.reduce(
    (sum, d) => sum + (dayDataMap[format(d, "yyyy-MM-dd")]?.billableHours || 0),
    0
  );

  function getDayColor(dayData: DayData | undefined): string {
    if (!dayData || dayData.totalHours === 0) return "";
    if (dayData.vacationHours > 0) return "bg-sky-100/70 border-sky-300/60";
    if (dayData.sickHours > 0) return "bg-rose-100/70 border-rose-300/60";
    if (dayData.billableHours === dayData.totalHours)
      return "bg-emerald-50 border-emerald-300";
    if (dayData.billableHours > 0) return "bg-amber-50 border-amber-300";
    return "bg-stone-100/60 border-stone-300/50";
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-white/40 text-[#78716C]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-[#1C1917] min-w-[180px] text-center">
            {format(currentMonth, "LLLL yyyy", { locale: cs })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-white/40 text-[#78716C]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setRefreshKey(k => k + 1); setSelectedDay(null); }}
            className="px-2 py-1 text-xs rounded-md bg-white/35 text-[#78716C] hover:bg-[#E7E5E4] transition-colors"
          >
            Obnovit
          </button>
        </div>
        <div className="flex bg-white/35 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("month")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              viewMode === "month" ? "bg-white text-[#1C1917] shadow-sm" : "text-[#78716C] hover:text-[#1C1917]"
            )}
          >
            Měsíc
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              viewMode === "week" ? "bg-white text-[#1C1917] shadow-sm" : "text-[#78716C] hover:text-[#1C1917]"
            )}
          >
            Týden
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[#78716C]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-300" />{" "}
          Fakturovatelné
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-50 border border-amber-300" />{" "}
          Smíšené
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-sky-100 border border-sky-300" />{" "}
          Dovolená
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300" />{" "}
          Nemoc
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-stone-50 border border-stone-300" />{" "}
          Režie
        </span>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <span className="text-[#78716C]">
          Měsíc: <strong className="text-[#1C1917]">{monthTotalHours.toFixed(1)}h</strong>
        </span>
        <span className="text-[#78716C]">
          Fakturovatelné:{" "}
          <strong className="text-emerald-600">{monthBillableHours.toFixed(1)}h</strong>
        </span>
        <span className="text-[#78716C]">
          Nefakturovatelné:{" "}
          <strong className="text-[#78716C]">
            {(monthTotalHours - monthBillableHours).toFixed(1)}h
          </strong>
        </span>
      </div>

      {/* Calendar Grid */}
      {viewMode === "month" ? (
        <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-black/5">
          {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-xs font-medium text-[#78716C] text-center"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayData = dayDataMap[dateKey];
            const isCurrMonth = isSameMonth(day, currentMonth);
            const dayOfWeek = getDay(day);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "min-h-[80px] p-1.5 border-b border-r border-white/40 text-left transition-colors hover:bg-white/30 relative",
                  !isCurrMonth && "opacity-30",
                  isWeekend && !dayData && "bg-white/30/50",
                  isToday(day) && "ring-2 ring-inset ring-[#6366F1]",
                  getDayColor(dayData)
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    isToday(day)
                      ? "text-[#6366F1]"
                      : isCurrMonth
                      ? "text-[#1C1917]"
                      : "text-[#D6D3D1]"
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayData && (
                  <div className="mt-1 space-y-0.5">
                    {dayData.entries.slice(0, 2).map((entry, ei) => (
                      <div key={ei} className="flex items-center gap-1">
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            entry.entryType === "VACATION"
                              ? "bg-sky-500"
                              : entry.entryType === "SICK"
                              ? "bg-rose-500"
                              : entry.billable
                              ? "bg-emerald-500"
                              : "bg-stone-400"
                          )}
                        />
                        <span className="text-[10px] leading-tight text-[#78716C] truncate">
                          {entry.projectName?.substring(0, 10) ||
                            (entry.entryType === "VACATION"
                              ? "Dovolená"
                              : entry.entryType === "SICK"
                              ? "Nemoc"
                              : "Práce")}
                        </span>
                      </div>
                    ))}
                    {dayData.entries.length > 2 && (
                      <span className="text-[10px] text-[#A8A29E]">
                        +{dayData.entries.length - 2} další
                      </span>
                    )}
                    <span className="block text-[11px] font-medium text-[#1C1917]">
                      {dayData.totalHours.toFixed(1)}h
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      ) : (
        <TimeWeekView
          dayDataMap={dayDataMap}
          onDayClick={(day) => setSelectedDay(day)}
        />
      )}

      {/* Day detail modal */}
      {selectedDay && (
        <DayDetail
          date={selectedDay}
          dayData={dayDataMap[format(selectedDay, "yyyy-MM-dd")]}
          userId={userId}
          projects={projects}
          onClose={() => setSelectedDay(null)}
          onSaved={() => {
            setSelectedDay(null);
            setRefreshKey(k => k + 1);
          }}
        />
      )}
    </div>
  );
}
