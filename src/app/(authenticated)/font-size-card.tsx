"use client";

import { useEffect, useState } from "react";
import { Type } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES: { key: string; label: string; px: string }[] = [
  { key: "small", label: "Malé", px: "14 px" },
  { key: "medium", label: "Střední", px: "16 px" },
  { key: "large", label: "Velké", px: "18 px" },
];

export function FontSizeCard() {
  const [size, setSize] = useState("medium");

  useEffect(() => {
    setSize(localStorage.getItem("can-font-size") || "medium");
  }, []);

  function apply(key: string) {
    setSize(key);
    localStorage.setItem("can-font-size", key);
    document.documentElement.dataset.fontSize = key;
  }

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Type className="w-4 h-4 text-[#6366F1]" />
        <h2 className="text-sm font-semibold text-[#1C1917]">Velikost písma</h2>
      </div>
      <p className="text-xs text-[#78716C] mb-4">Základní je střední.</p>
      <div className="flex gap-2">
        {SIZES.map((s) => (
          <button
            key={s.key}
            onClick={() => apply(s.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm border transition-colors",
              size === s.key
                ? "bg-[#6366F1] text-white border-[#6366F1]"
                : "bg-white text-[#1C1917] border-black/10 hover:border-[#6366F1]/50"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
