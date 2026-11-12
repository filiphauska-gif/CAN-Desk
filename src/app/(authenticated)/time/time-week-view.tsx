"use client";

import { useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getDay, addWeeks, subWeeks, isSameDay, isToday } from "date-fns";
import { cs } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
};

export function TimeWeekView({
  dayDataMap,
  onDayClick,
}: {
  dayDataMap: Record<string, { date: Date; entries: DayEntry[]; totalHours: number; billableHours: number }>;
  onDayClick: (date: Date) => void;
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Collect all unique projects from this week
  const allProjects = new Map<string, string>();
  for (const day of days) {
    const key = format(day, "yyyy-MM-dd");
    const data = dayDataMap[key];
    if (data) {
      for (const entry of data.entries) {
        if (entry.projectName && !allProjects.has(entry.projectId)) {
          allProjects.set(entry.projectId, entry.projectName);
        }
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
            className="p-1.5 rounded-lg hover:bg-white/40 text-[#78716C]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-sm font-semibold text-[#1C1917] min-w-[200px] text-center">
            {format(weekStart, "d. MMMM", { locale: cs })} —{" "}
            {format(weekEnd, "d. MMMM yyyy", { locale: cs })}
          </h3>
          <button
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            className="p-1.5 rounded-lg hover:bg-white/40 text-[#78716C]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Column layout */}
      <div className="glass rounded-xl overflow-hidden">
        {/* Header row - day names */}
        <div className="grid grid-cols-7 border-b border-black/5">
          {days.map((day, i) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const data = dayDataMap[dayKey];
            const dayOfWeek = getDay(day);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            return (
              <div
                key={i}
                className={cn(
                  "px-2 py-3 text-center border-r last:border-r-0 border-white/40",
                  isToday(day) && "bg-[#EEF2FF]",
                  isWeekend && "bg-white/30"
                )}
              >
                <div className="text-xs font-medium text-[#78716C]">
                  {format(day, "EEE", { locale: cs })}
                </div>
                <div
                  className={cn(
                    "text-lg font-semibold mt-0.5",
                    isToday(day) ? "text-[#6366F1]" : "text-[#1C1917]"
                  )}
                >
                  {format(day, "d")}
                </div>
                {data && (
                  <div className="text-xs font-medium text-[#78716C] mt-0.5">
                    {data.totalHours.toFixed(1)}h
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Content rows - projects per day */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const data = dayDataMap[dayKey];
            const dayOfWeek = getDay(day);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[200px] p-2 border-r last:border-r-0 border-b border-black/5",
                  isToday(day) && "bg-[#EEF2FF]",
                  isWeekend && "bg-white/30"
                )}
              >
                {/* Entries */}
                <div className="space-y-1.5">
                  {data?.entries.map((entry, ei) => (
                    <div
                      key={ei}
                      className={cn(
                        "px-2 py-1.5 rounded-md text-xs border",
                        entry.entryType === "VACATION"
                          ? "bg-sky-50 border-sky-200 text-sky-700"
                          : entry.entryType === "SICK"
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : entry.billable
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-stone-50 border-stone-200 text-stone-600"
                      )}
                    >
                      <div className="font-medium truncate">
                        {entry.projectName || (entry.entryType === "VACATION" ? "Dovolená" : entry.entryType === "SICK" ? "Nemoc" : "Práce")}
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="truncate flex-1 mr-1">
                          {entry.description || "—"}
                        </span>
                        <span className="font-medium shrink-0">
                          {entry.hours.toFixed(1)}h
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add button */}
                <button
                  onClick={() => onDayClick(day)}
                  className="mt-2 flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[#78716C] hover:bg-white/40 hover:text-[#6366F1] transition-colors w-full justify-center"
                >
                  <Plus className="w-3 h-3" />
                  Přidat
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
