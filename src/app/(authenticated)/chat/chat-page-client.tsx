"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Search, Send } from "lucide-react";
import { getChatMessages, openDM, sendChatMessage } from "@/server/actions/chat";
import { cn } from "@/lib/utils";

type Person = { id: string; name: string };
type Msg = { id: string; kind?: string; body: string; authorId: string; authorName: string; createdAt: string };

const EMOJI = ["👍", "🙏", "😀", "😂", "🎉", "❤️", "🔥", "👀", "✅", "⚠️", "📌", "🚀"];

export function ChatPageClient({ meId, people }: { meId: string; people: Person[] }) {
  const [query, setQuery] = useState("");
  const [other, setOther] = useState<Person | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;
    const load = () =>
      getChatMessages(roomId)
        .then((m) => alive && setMessages(m))
        .catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [roomId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function pick(p: Person) {
    setOther(p);
    const r = await openDM(p.id);
    setRoomId(r.id);
  }

  async function send() {
    if (!roomId || !text.trim()) return;
    const body = text.trim();
    setText("");
    await sendChatMessage(roomId, body);
    setMessages(await getChatMessages(roomId));
  }

  const filtered = people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-9rem)] min-h-[480px]">
      {/* people */}
      <div className="glass rounded-xl flex flex-col overflow-hidden">
        <div className="p-3 border-b border-black/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledat člověka..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-black/5">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => pick(p)}
              className={cn(
                "w-full text-left px-4 py-3 text-sm text-[#1C1917] hover:bg-white/70 transition-colors",
                other?.id === p.id && "bg-white/80 font-medium"
              )}
            >
              {p.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-sm text-[#78716C] text-center">Nikdo nenalezen.</p>
          )}
        </div>
      </div>

      {/* conversation */}
      <div className="lg:col-span-3 glass rounded-xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-black/5">
          <p className="text-sm font-semibold text-[#1C1917]">{other ? other.name : "Chat"}</p>
        </div>

        {!other ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[#A8A29E]">
            Vyber člověka vlevo a začni psát.
          </div>
        ) : (
          <>
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.map((m) => {
                if (m.kind === "SYSTEM") {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="max-w-[85%] text-center text-[11px] text-[#6366F1] bg-[#6366F1]/10 rounded-lg px-2.5 py-1.5">
                        {m.body}
                      </div>
                    </div>
                  );
                }
                const mine = m.authorId === meId;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words",
                        mine ? "bg-[#6366F1] text-white rounded-br-md" : "bg-white text-[#1C1917] rounded-bl-md border border-black/5"
                      )}
                    >
                      {m.body}
                      <div className={cn("text-[10px] mt-1", mine ? "text-white/70" : "text-[#A8A29E]")}>
                        {format(new Date(m.createdAt), "d.M. HH:mm")}
                      </div>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="text-center text-xs text-[#A8A29E] py-8">Zatím žádné zprávy. Napiš první.</p>
              )}
            </div>

            {showEmoji && (
              <div className="border-t border-black/5 px-3 py-2 flex flex-wrap gap-1">
                {EMOJI.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      setText((t) => t + e);
                      setShowEmoji(false);
                    }}
                    className="text-lg hover:bg-white/70 rounded p-0.5"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-black/5 p-3 flex gap-2 items-center">
              <button onClick={() => setShowEmoji((v) => !v)} className="p-2 rounded-lg text-[#78716C] hover:bg-white/70" title="Emoji">
                😊
              </button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="Napište zprávu..."
                className="flex-1 px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              />
              <button onClick={send} disabled={!text.trim()} className="p-2 rounded-lg bg-[#6366F1] text-white disabled:opacity-40" title="Odeslat">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
