"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight, Hash, Loader2 } from "lucide-react";
import { grades, gradeLabels, blockSubjects } from "@/constants/questions";
import { getQuestionBank } from "@/lib/questionsStorage";
import type { Grade } from "@/types";

export default function WelcomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [invitation, setInvitation] = useState("");
  const [grade, setGrade] = useState<Grade | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setError("");
    if (!name.trim()) {
      setError("Введіть прізвище, ім'я та по батькові.");
      return;
    }
    if (!invitation.trim()) {
      setError("Введіть номер запрошення.");
      return;
    }
    if (!grade) {
      setError("Оберіть клас.");
      return;
    }
    setLoading(true);
    try {
      const bank = await getQuestionBank();
      const block1Subjects = blockSubjects[1];
      const hasBlock1 = block1Subjects.some(
        (s) => (bank[grade]?.[s]?.length ?? 0) > 0
      );
      if (!hasBlock1) {
        setError("Для обраного класу ще не додано питання (блок 1). Зверніться до вчителя.");
        return;
      }
      const params = new URLSearchParams({
        name: name.trim(),
        invitation: invitation.trim(),
        grade: String(grade),
        block: "1",
      });
      router.push(`/test?${params.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              Пробне тестування НМТ
            </h1>
            <p className="text-sm text-slate-500">
              І блок: українська мова, математика · ІІ блок: історія, англійська
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">
            Реєстрація на тест
          </h2>
          <p className="text-slate-600 text-sm mb-6">
            Перед початком введіть свої ПІБ та номер запрошення.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Прізвище, ім&apos;я та по батькові
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Наприклад: Петренко Олексій Іванович"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Номер запрошення
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={invitation}
                  onChange={(e) => setInvitation(e.target.value)}
                  placeholder="Введіть номер з запрошення"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Клас
              </label>
              <select
                value={grade}
                onChange={(e) =>
                  setGrade((e.target.value ? Number(e.target.value) : "") as Grade | "")
                }
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition bg-white"
              >
                <option value="">Оберіть клас</option>
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {gradeLabels[g]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleStart}
            disabled={loading}
            className="mt-8 w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-medium flex items-center justify-center gap-2 transition shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Завантаження…
              </>
            ) : (
              <>
                Почати тест (І блок)
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <a href="/admin-results" className="text-indigo-600 hover:underline">
            Результати
          </a>
          {" · "}
          <a href="/admin" className="text-indigo-600 hover:underline">
            Адмін: внесення тестів
          </a>
        </p>
      </main>
    </div>
  );
}
