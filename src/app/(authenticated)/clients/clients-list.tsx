"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Building2, Mail, Phone, ChevronDown, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectStatusBadge } from "@/components/shared/status-badges";

export type ClientListItem = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  projectsCount: number;
  projects: { id: string; name: string; status: string; deadline: string | null }[];
};

export function ClientsList({ clients }: { clients: ClientListItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {clients.map((client) => {
        const open = openId === client.id;
        const activeProjects = client.projects.filter(
          (p) => !["DOKONCENO", "FAKTUROVANO", "ARCHIVOVANO"].includes(p.status)
        );
        const nextDeadline = client.projects
          .filter((p) => p.deadline && !["DOKONCENO", "ARCHIVOVANO"].includes(p.status))
          .map((p) => p.deadline!)
          .sort()[0];

        return (
          <div key={client.id} className="glass rounded-xl relative transition-all">
            <Link href={`/clients/${client.id}`} className="block p-5 pr-14">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/35 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-[#78716C]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#1C1917]">{client.name}</h3>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {client.contactName && (
                        <span className="text-xs text-[#78716C]">{client.contactName}</span>
                      )}
                      {client.email && (
                        <span className="text-xs text-[#78716C] flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </span>
                      )}
                      {client.phone && (
                        <span className="text-xs text-[#78716C] flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </span>
                      )}
                    </div>
                    {client.note && (
                      <p className="text-xs text-[#78716C] mt-2 line-clamp-1">{client.note}</p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-[#1C1917]">{client.projectsCount}</p>
                  <p className="text-xs text-[#78716C]">projektů</p>
                </div>
              </div>
            </Link>

            {/* Expand toggle */}
            {!open && <button
              onClick={() => setOpenId(open ? null : client.id)}
              title={open ? "Sbalit náhled" : "Rozbalit náhled"}
              className="absolute bottom-3 right-3 p-2 rounded-lg text-[#A8A29E] hover:text-[#6366F1] hover:bg-white/70 transition-all"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", open && "rotate-180")} />
            </button>}

            {/* Expandable panel */}
            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 border-t border-black/5">
                  <div className="flex justify-end pt-2">
                    <button onClick={() => setOpenId(null)} title="Sbalit náhled" className="inline-flex items-center gap-1 text-xs text-[#6366F1] hover:underline">
                      <ChevronDown className="w-3.5 h-3.5 rotate-180" /> Sbalit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
                    {/* Contact */}
                    <div className="glass rounded-xl p-4 space-y-2">
                      <p className="text-[10px] uppercase tracking-wide text-[#A8A29E]">Kontakt</p>
                      <p className="text-sm text-[#1C1917]">{client.contactName || "Nevyplněno"}</p>
                      <p className="text-xs text-[#78716C] flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> {client.email || "-"}
                      </p>
                      <p className="text-xs text-[#78716C] flex items-center gap-1.5">
                        <Phone className="w-3 h-3" /> {client.phone || "-"}
                      </p>
                      {client.note && <p className="text-xs text-[#78716C] pt-1">{client.note}</p>}
                    </div>

                    {/* Projects */}
                    <div className="glass rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-wide text-[#A8A29E] mb-2">Zakázky</p>
                      <div className="space-y-1.5">
                        {client.projects.slice(0, 5).map((p) => (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}`}
                            className="flex items-center gap-2 text-xs text-[#1C1917] hover:text-[#6366F1] transition-colors"
                          >
                            <FolderKanban className="w-3 h-3 text-[#A8A29E] shrink-0" />
                            <span className="truncate flex-1">{p.name}</span>
                            {p.deadline && (
                              <span className="text-[#A8A29E] shrink-0">
                                {format(new Date(p.deadline), "d.M.")}
                              </span>
                            )}
                          </Link>
                        ))}
                        {client.projects.length === 0 && (
                          <p className="text-xs text-[#A8A29E]">Zatím žádné zakázky</p>
                        )}
                        {client.projects.length > 5 && (
                          <p className="text-xs text-[#A8A29E]">+ {client.projects.length - 5} dalších</p>
                        )}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="glass rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-wide text-[#A8A29E] mb-2">Souhrn</p>
                      <div className="space-y-1.5 text-xs text-[#78716C]">
                        <p className="flex justify-between">
                          <span>Zakázek celkem</span>
                          <span className="font-medium text-[#1C1917]">{client.projectsCount}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Aktivních</span>
                          <span className="font-medium text-[#1C1917]">{activeProjects.length}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Nejbližší deadline</span>
                          <span className="font-medium text-[#1C1917]">
                            {nextDeadline ? format(new Date(nextDeadline), "d.M.yyyy") : "-"}
                          </span>
                        </p>
                      </div>
                      <Link
                        href={`/clients/${client.id}`}
                        className="mt-3 inline-flex items-center gap-1 text-xs text-[#6366F1] hover:underline"
                      >
                        Otevřít detail klienta
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {clients.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-[#D6D3D1] mx-auto mb-3" />
          <p className="text-[#78716C]">Zatím žádní klienti</p>
          <p className="text-sm text-[#A8A29E] mt-1">Přidejte prvního klienta tlačítkem nahoře</p>
        </div>
      )}
    </div>
  );
}
