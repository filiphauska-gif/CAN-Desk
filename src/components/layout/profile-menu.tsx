"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Bell, CheckCheck, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/notifications";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  ACCOUNT_MANAGER: "Account Manager",
  PROJECT_MANAGER: "Project Manager",
  KREATIVEC: "Kreativec",
  PRODUKCNI: "Produkční",
  EXTERNISTA: "Externista",
  FINANCE: "Finance",
};

type Item = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const initials = (name?: string | null) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export function ProfileMenu() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await getMyNotifications();
      setUnread(r.unread);
      setItems(r.items);
    } catch {}
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 25000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (open && boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative px-3 pb-3" ref={boxRef}>
      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-2 glass-strong rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-black/5">
            <p className="text-xs font-semibold text-[#1C1917]">Notifikace</p>
            <button
              onClick={async () => {
                await markAllNotificationsRead();
                load();
              }}
              className="text-[11px] text-[#6366F1] hover:underline flex items-center gap-1"
              title="Označit vše jako přečtené"
            >
              <CheckCheck className="w-3 h-3" /> Přečíst vše
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-black/5">
            {items.length === 0 && (
              <p className="px-3 py-6 text-xs text-[#78716C] text-center">Žádné notifikace.</p>
            )}
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.link || "/"}
                onClick={async () => {
                  await markNotificationRead(n.id);
                  setOpen(false);
                  load();
                }}
                className={cn(
                  "block px-3 py-2.5 hover:bg-white/70 transition-colors",
                  !n.readAt && "bg-[#6366F1]/5"
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.readAt && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#6366F1] shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#1C1917] truncate">{n.title}</p>
                    {n.body && <p className="text-[11px] text-[#78716C] line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-[#A8A29E] mt-0.5">
                      {format(new Date(n.createdAt), "d.M. HH:mm")}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setOpen(!open)}
          className="relative shrink-0"
          title="Notifikace"
        >
          {user.image || user.avatarUrl ? (
            <img
              src={user.image || user.avatarUrl}
              alt={user.name || ""}
              className="w-9 h-9 rounded-full object-cover border border-white/70 shadow"
            />
          ) : (
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6E70F5] to-[#8B5CF6] text-white text-xs font-bold flex items-center justify-center shadow-[0_4px_14px_rgba(99,102,241,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]">
              {initials(user.name)}
            </span>
          )}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1C1917] truncate leading-tight">{user.name}</p>
          <p className="text-[11px] text-[#78716C] leading-tight">{roleLabels[user.role] || user.role}</p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-2 rounded-lg text-[#78716C] hover:bg-white/60 hover:text-[#1C1917] transition-colors"
          title="Odhlásit se"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
