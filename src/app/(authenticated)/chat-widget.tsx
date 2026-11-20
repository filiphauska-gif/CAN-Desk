"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Search, Send, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import {
  chatUnreadCount,
  getChatMessages,
  listChatPeople,
  openDM,
  sendChatMessage,
} from "@/server/actions/chat";
import { cn } from "@/lib/utils";

type Person = { id: string; name: string; role: string };
type Msg = { id: string; kind?: string; body: string; authorId: string; authorName: string; createdAt: string };

export function ChatWidget({ meId }: { meId: string }) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [other, setOther] = useState<Person | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatUnreadCount().then((r) => setUnread(r.total)).catch(() => {});
    const t = setInterval(() => chatUnreadCount().then((r) => setUnread(r.total)).catch(() => {}), 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open && people.length === 0) listChatPeople().then(setPeople).catch(() => {});
  }, [open, people.length]);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;
    const load = () =>
      getChatMessages(roomId)
        .then((m) => {
          if (!alive) return;
          setMessages(m);
          setUnread(0);
        })
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
    const m = await getChatMessages(roomId);
    setMessages(m);
  }

  const filtered = people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-[#6366F1] text-white shadow-lg shadow-indigo-500/30 hover:bg-[#4F46E5] transition-colors"
          title="Chat"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-medium">Chat</span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-[11px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] rounded-2xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
            <div className="flex items-center gap-2 min-w-0">
              {other && (
                <button onClick={() => { setOther(null); setRoomId(null); setMessages([]); }} className="p-1 rounded-lg hover:bg-white/70">
                  <ArrowLeft className="w-4 h-4 text-[#78716C]" />
                </button>
              )}
              <p className="text-sm font-semibold text-[#1C1917] truncate">
                {other ? other.name : "Chat"}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/70" title="Zavřít">
              <X className="w-4 h-4 text-[#78716C]" />
            </button>
          </div>

          {!other && (
            <>
              <div className="px-3 py-2 border-b border-black/5">
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
                    className="w-full text-left px-4 py-3 hover:bg-white/70 transition-colors"
                  >
                    <p className="text-sm text-[#1C1917]">{p.name}</p>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="px-4 py-10 text-sm text-[#78716C] text-center">Žádný kolega nenalezen.</p>
                )}
              </div>
            </>
          )}

          {other && (
            <>
              <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {messages.map((m) => {
                  if (m.kind === "SYSTEM") {
                    return (
                      <div key={m.id} className="flex justify-center">
                        <div className="max-w-[92%] text-center text-[11px] text-[#6366F1] bg-[#6366F1]/10 rounded-lg px-2.5 py-1.5">
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
                          "max-w-[78%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
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
                  <p className="text-center text-xs text-[#A8A29E] py-6">Zatím žádné zprávy. Napište první.</p>
                )}
              </div>
              {showEmoji && (
                <div className="border-t border-black/5 px-2 py-2 grid grid-cols-8 gap-1">
                  {["👍","🙏","😀","😂","🎉","❤️","🔥","👀","✅","⚠️","📌","🚀","👋","🤝","💪","☕"].map((e) => (
                    <button key={e} onClick={() => { setText((t) => t + e); setShowEmoji(false); }} className="text-lg hover:bg-white/70 rounded p-0.5">
                      {e}
                    </button>
                  ))}
                </div>
              )}
              <div className="border-t border-black/5 p-2 flex gap-2">
                <button
                  onClick={() => setShowEmoji((v) => !v)}
                  className="p-2 rounded-lg text-[#78716C] hover:bg-white/70"
                  title="Emoji"
                >
                  😊
                </button>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="Napište zprávu..."
                  className="flex-1 px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                />
                <button
                  onClick={send}
                  disabled={!text.trim()}
                  className="p-2 rounded-lg bg-[#6366F1] text-white disabled:opacity-40"
                  title="Odeslat"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
