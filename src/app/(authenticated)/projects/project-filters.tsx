"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { projectStatusLabels } from "@/components/shared/status-badges";

export function ProjectFilters({
  clients,
}: {
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/projects?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/projects");
  }

  const hasFilters = Array.from(searchParams.keys()).length > 0;

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
          <input
            placeholder="Hledat zakázku..."
            defaultValue={searchParams.get("search") || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val.length >= 2 || val.length === 0) {
                setFilter("search", val || null);
              }
            }}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
          />
        </div>

        {/* Status filter */}
        <select
          value={searchParams.get("status") || ""}
          onChange={(e) => setFilter("status", e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] bg-white"
        >
          <option value="">Aktivní</option>
          {Object.entries(projectStatusLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {/* Client filter */}
        <select
          value={searchParams.get("clientId") || ""}
          onChange={(e) => setFilter("clientId", e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] bg-white"
        >
          <option value="">Všichni klienti</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-[#78716C] hover:text-[#1C1917] transition-colors"
          >
            <X className="w-4 h-4" />
            Zrušit filtry
          </button>
        )}
      </div>
    </div>
  );
}
