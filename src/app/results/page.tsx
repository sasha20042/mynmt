"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Home, Award, BookOpen } from "lucide-react";
import { subjectLabels, gradeLabels } from "@/constants/questions";
import { saveResult } from "@/lib/storage";
import type { SubjectId, Grade } from "@/types";

interface FinalScores {
  name: string;
  invitation: string;
  grade: Grade;
  subjects: Record<
    SubjectId,
    { correct: number; total: number }
  >;
}

const defaultScores: Record<SubjectId, { correct: number; total: number }> = {
  ukrainian: { correct: 0, total: 0 },
  math: { correct: 0, total: 0 },
  history: { correct: 0, total: 0 },
  english: { correct: 0, total: 0 },
};

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<FinalScores | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    (async () => {
      try {
        const raw = sessionStorage.getItem("nmt_final_scores");
        if (!raw) {
          router.replace("/");
          return;
        }
        const parsed = JSON.parse(raw) as FinalScores;
        setData(parsed);
        const subjects: Record<SubjectId, { score: number; total: number; correct: number }> = {
          ukrainian: { score: 0, total: 0, correct: 0 },
          math: { score: 0, total: 0, correct: 0 },
          history: { score: 0, total: 0, correct: 0 },
          english: { score: 0, total: 0, correct: 0 },
        };
        for (const s of Object.keys(defaultScores) as SubjectId[]) {
          const t = parsed.subjects[s] ?? { correct: 0, total: 0 };
          subjects[s] = {
            correct: t.correct,
            total: t.total,
            score: t.total ? Math.round((t.correct / t.total) * 100) : 0,
          };
        }
        await saveResult({
          name: parsed.name,
          invitation: parsed.invitation,
          grade: parsed.grade,
          date: new Date().toISOString(),
          subjects,
        });
        sessionStorage.removeItem("nmt_final_scores");
      } catch {
        router.replace("/");
      }
    })();
  }, [router]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Завантаження…</p>
      </div>
    );
  }

  const subjects = (Object.keys(defaultScores) as SubjectId[]).map((id) => ({
    id,
    label: subjectLabels[id],
    ...(data.subjects[id] ?? { correct: 0, total: 0 }),
    score:
      data.subjects[id]?.total ?
        Math.round((data.subjects[id].correct / data.subjects[id].total) * 100) : 0,
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <Award className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-slate-800 text-center mb-2">
            Тест завершено
          </h1>
          <p className="text-slate-500 text-center text-sm mb-8">
            {data.name} · {gradeLabels[data.grade]} · Запрошення {data.invitation}
          </p>

          <div className="space-y-4 mb-8">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-800">{s.label}</p>
                    <p className="text-sm text-slate-500">
                      <CheckCircle className="w-4 h-4 text-emerald-500 inline mr-1" />
                      {s.correct} правильних
                      {s.total > 0 && (
                        <>
                          {" · "}
                          <XCircle className="w-4 h-4 text-red-500 inline mr-1" />
                          {s.total - s.correct} неправильних
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-primary-600">{s.score}%</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            На головну
          </button>
        </div>
      </main>
    </div>
  );
}
