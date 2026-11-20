"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { resetDashboardLayout } from "@/server/actions/dashboard";

export function ResetDashboardCard() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <RotateCcw className="w-4 h-4 text-[#6366F1]" />
        <h2 className="text-sm font-semibold text-[#1C1917]">Dashboard</h2>
      </div>
      <p className="text-xs text-[#78716C] mb-4">
        Vrátí rozmístění a velikosti widgetů do výchozího stavu.
      </p>
      <button
        onClick={async () => {
          setBusy(true);
          await resetDashboardLayout();
          router.refresh();
          setBusy(false);
        }}
        disabled={busy}
        className="px-4 py-2 rounded-lg text-sm bg-white border border-black/10 text-[#1C1917] hover:border-[#6366F1]/50 transition-colors"
      >
        {busy ? "Obnovuji..." : "Obnovit výchozí rozložení"}
      </button>
    </div>
  );
}
