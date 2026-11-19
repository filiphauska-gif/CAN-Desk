"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Mail, RefreshCw, Send, Inbox, Unlink, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assignEmail, disconnectMailbox, replyToEmail, syncMyMailbox } from "@/server/actions/email";
import { cn } from "@/lib/utils";

type EmailRow = {
  id: string;
  direction: string;
  fromAddress: string;
  fromName: string | null;
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  receivedAt: string;
  unread: boolean;
  projectId: string | null;
  projectLabel: string | null;
  matchReason: string | null;
  matchConfidence: number | null;
};

export function MailClient({
  account,
  initialEmails,
  projects,
  error,
  connected,
}: {
  account: { email: string; lastSyncAt: string | null } | null;
  initialEmails: EmailRow[];
  projects: { id: string; jobNumber: string | null; name: string }[];
  error: string | null;
  connected: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialEmails[0]?.id || null);
  const [filter, setFilter] = useState<"all" | "unassigned" | "unread">("all");
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);

  const emails = useMemo(() => {
    if (filter === "unassigned") return initialEmails.filter((e) => !e.projectId);
    if (filter === "unread") return initialEmails.filter((e) => e.unread);
    return initialEmails;
  }, [initialEmails, filter]);

  const selected = initialEmails.find((e) => e.id === selectedId) || emails[0] || null;

  async function syncNow() {
    setBusy(true);
    try {
      const r = await syncMyMailbox();
      router.refresh();
      alert(r.added > 0 ? `Načteno ${r.added} nových zpráv` : "Žádné nové zprávy");
    } catch (e: any) {
      alert(e?.message || "Synchronizace selhala");
    } finally {
      setBusy(false);
    }
  }

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold text-[#1C1917]">Pošta</h1>
        {error && (
          <div className="glass rounded-xl p-3 text-sm text-rose-600 border-l-4 border-rose-400">
            Připojení selhalo: {error}
          </div>
        )}
        <div className="glass rounded-xl p-8 text-center space-y-4">
          <Mail className="w-12 h-12 text-[#6366F1] mx-auto" />
          <div>
            <p className="font-medium text-[#1C1917]">Připojte svou schránku</p>
            <p className="text-sm text-[#78716C] mt-1">
              Zatím podporujeme Gmail. Připojením povolíte čtení a odesílání e-mailů přímo z CAN Desku.
              Maily se automaticky přiřadí zakázkám podle čísla JOB, odesílatele nebo klíčových slov.
            </p>
          </div>
          <Button
            className="btn-glass-primary text-white gap-2"
            onClick={() => (window.location.href = "/api/email/oauth/start")}
          >
            <Mail className="w-4 h-4" /> Připojit Gmail
          </Button>
          {connected && <p className="text-xs text-emerald-600">Schránka připojena.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1C1917]">Pošta</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {account.email}
            {account.lastSyncAt && ` • synchronizováno ${format(new Date(account.lastSyncAt), "d.M. HH:mm")}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-2 btn-glass-primary text-white" onClick={syncNow} disabled={busy}>
            <RefreshCw className={cn("w-4 h-4", busy && "animate-spin")} /> Synchronizovat
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={async () => {
              await disconnectMailbox();
              router.refresh();
            }}
          >
            <Unlink className="w-4 h-4" /> Odpojit
          </Button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl p-3 text-sm text-rose-600 border-l-4 border-rose-400">
          Chyba: {error}
        </div>
      )}

      <div className="flex gap-1.5">
        {(
          [
            ["all", "Vše"],
            ["unassigned", "Nezařazené"],
            ["unread", "Nepřečtené"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === key
                ? "bg-[#6366F1] text-white"
                : "bg-white/60 text-[#78716C] hover:bg-white"
            )}
          >
            {label}
            {key === "unassigned" && ` (${initialEmails.filter((e) => !e.projectId).length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[60vh]">
        {/* list */}
        <div className="lg:col-span-2 glass rounded-xl divide-y divide-black/5 overflow-y-auto max-h-[70vh]">
          {emails.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedId(e.id)}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-white/60 transition-colors",
                selected?.id === e.id && "bg-white/80"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={cn("text-xs truncate", e.unread ? "font-semibold text-[#1C1917]" : "text-[#57534E]")}>
                  {e.direction === "OUT" ? "→ " : ""}
                  {e.fromName || e.fromAddress}
                </p>
                <span className="text-[10px] text-[#A8A29E] shrink-0">
                  {format(new Date(e.receivedAt), "d.M.")}
                </span>
              </div>
              <p className="text-xs text-[#1C1917] truncate mt-0.5">{e.subject}</p>
              <p className="text-[11px] text-[#A8A29E] truncate">{e.snippet}</p>
              <div className="mt-1">
                {e.projectLabel ? (
                  <span className="text-[10px] text-[#6366F1] bg-[#6366F1]/10 rounded px-1.5 py-0.5">
                    {e.projectLabel}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-100/70 rounded px-1.5 py-0.5">
                    Nezařazené
                  </span>
                )}
              </div>
            </button>
          ))}
          {emails.length === 0 && (
            <p className="px-4 py-10 text-sm text-[#78716C] text-center">Žádné zprávy.</p>
          )}
        </div>

        {/* detail */}
        <div className="lg:col-span-3 glass rounded-xl p-5 flex flex-col max-h-[70vh]">
          {selected ? (
            <>
              <div className="border-b border-black/5 pb-3 mb-3">
                <p className="text-sm font-semibold text-[#1C1917]">{selected.subject}</p>
                <p className="text-xs text-[#78716C] mt-1">
                  {selected.fromName || selected.fromAddress} &lt;{selected.fromAddress}&gt; •{" "}
                  {format(new Date(selected.receivedAt), "d.M.yyyy HH:mm")}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-[#78716C]">Zakázka:</span>
                  <select
                    value={selected.projectId || ""}
                    onChange={async (e) => {
                      await assignEmail(selected.id, e.target.value || null);
                      router.refresh();
                    }}
                    className="text-xs px-2 py-1 rounded-lg border border-black/10 bg-white max-w-[260px]"
                  >
                    <option value="">Nezařazené</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.jobNumber} {p.name}
                      </option>
                    ))}
                  </select>
                  {selected.matchReason && (
                    <span className="text-[10px] text-[#A8A29E]">({selected.matchReason})</span>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="text-[13px] leading-relaxed text-[#292524] whitespace-pre-wrap break-words">
                  {selected.bodyText || selected.snippet}
                </div>
              </div>
              <div className="border-t border-black/5 pt-3 mt-3 space-y-2">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={`Odpovědět na ${selected.fromAddress}...`}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-2 btn-glass-primary text-white"
                    disabled={!replyBody.trim() || busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await replyToEmail(selected.id, replyBody);
                        setReplyBody("");
                        router.refresh();
                      } catch (e: any) {
                        alert(e?.message || "Odeslání selhalo");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Send className="w-4 h-4" /> Odeslat
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#A8A29E]">
              <Inbox className="w-10 h-10 mb-2" />
              <p className="text-sm">Vyberte zprávu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
