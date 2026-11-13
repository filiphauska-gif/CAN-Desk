"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { duplicateProject } from "@/server/actions/projects";

export function DuplicateProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCopy() {
    setLoading(true);
    try {
      const copy = await duplicateProject(projectId);
      router.push(`/projects/${copy.id}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCopy}
      disabled={loading}
      title="Duplikovat zakázku (včetně úkolů a rozpočtu)"
      className="p-1.5 rounded-lg text-[#A8A29E] hover:text-[#6366F1] hover:bg-white/60 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}
