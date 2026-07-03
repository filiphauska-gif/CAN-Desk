"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProject } from "@/server/actions/projects";
import { ProjectStatusBadge, projectStatusLabels } from "@/components/shared/status-badges";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProjectStatusSwitcher({
  projectId,
  currentStatus,
}: {
  projectId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function handleChange(newStatus: string) {
    setLoading(true);
    setStatus(newStatus);
    try {
      await updateProject(projectId, { status: newStatus });
      router.refresh();
    } catch (error) {
      console.error(error);
      setStatus(currentStatus);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <ProjectStatusBadge status={status} />
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        className="text-xs px-2 py-1 rounded border border-[#E7E5E4] bg-white text-[#78716C] hover:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1] cursor-pointer"
      >
        {Object.entries(projectStatusLabels).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
