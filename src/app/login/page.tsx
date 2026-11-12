"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      setError("Neplatný email nebo heslo");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Aurora mesh background */}
      <div className="liquid-bg" aria-hidden />

      <div className="w-full max-w-sm relative">
        {/* Soft glow behind the glass card */}
        <div
          aria-hidden
          className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#6366F1]/25 via-[#A855F7]/15 to-[#FB923C]/20 blur-2xl"
        />

        <div className="glass-strong rounded-3xl p-8 relative">
          <div className="mb-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6E70F5] to-[#8B5CF6] flex items-center justify-center text-white text-lg font-bold shadow-[0_8px_24px_-4px_rgba(99,102,241,0.5),inset_0_1px_2px_rgba(255,255,255,0.45)] mb-4">
              CD
            </div>
            <h1 className="text-2xl font-semibold text-[#1C1917]">CAN Desk</h1>
            <p className="text-sm text-[#78716C] mt-1">
              Interní projektový nástroj
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#1C1917] mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-[#1C1917] placeholder:text-[#A8A29E]"
                placeholder="email@canagency.cz"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#1C1917] mb-1.5"
              >
                Heslo
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-[#1C1917] placeholder:text-[#A8A29E]"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-rose-500 text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 btn-glass-primary text-white rounded-xl text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Přihlašuji…" : "Přihlásit se"}
            </button>
          </form>

          <p className="mt-5 text-xs text-center text-[#A8A29E]">
            CAN Desk &mdash; Can Agency &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
