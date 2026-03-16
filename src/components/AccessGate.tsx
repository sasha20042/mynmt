"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { ADMIN_ACCESS_CODE, ACCESS_STORAGE_KEY } from "@/constants/access";

interface AccessGateProps {
  children: React.ReactNode;
  title?: string;
}

export function AccessGate({ children, title = "Доступ обмежено" }: AccessGateProps) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = sessionStorage.getItem(ACCESS_STORAGE_KEY) === "1";
    setUnlocked(ok);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.trim() === ADMIN_ACCESS_CODE) {
      if (typeof window !== "undefined") sessionStorage.setItem(ACCESS_STORAGE_KEY, "1");
      setUnlocked(true);
    } else {
      setError("Невірний код доступу.");
    }
  };

  if (unlocked === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-slate-500">Завантаження…</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-slate-500" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800 text-center mb-2">
            {title}
          </h1>
          <p className="text-sm text-slate-500 text-center mb-6">
            Введіть код доступу
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Код"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-center text-lg tracking-widest"
              maxLength={8}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
            )}
            <button
              type="submit"
              className="mt-4 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              Увійти
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
