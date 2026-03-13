"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import Link from "next/link";
import { Trash2, Filter, ArrowLeft, GraduationCap, ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";
import { getStoredResults, deleteResult, clearAllResults } from "@/lib/storage";
import { subjectLabels, gradeLabels, grades } from "@/constants/questions";
import type { TestResult, Grade, SubjectId } from "@/types";

const subjectIds: SubjectId[] = ["ukrainian", "math", "history", "english"];

export default function AdminResultsPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [gradeFilter, setGradeFilter] = useState<Grade | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadResults = useCallback(() => {
    getStoredResults().then(setResults);
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const filtered = useMemo(() => {
    if (gradeFilter === "all") return results;
    return results.filter((r) => r.grade === gradeFilter);
  }, [results, gradeFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Видалити цей запис?")) return;
    await deleteResult(id);
    loadResults();
  };

  const handleClearAll = async () => {
    if (!confirm("Видалити всі результати? Цю дію не можна скасувати.")) return;
    await clearAllResults();
    setResults([]);
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label="На головну"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">
                Результати тестувань
              </h1>
              <p className="text-sm text-slate-500">Пробне НМТ · ПІБ, запрошення, бали</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="text-sm text-primary-600 hover:underline"
          >
            Внесення тестів →
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Клас:</span>
            <select
              value={gradeFilter}
              onChange={(e) =>
                setGradeFilter(
                  e.target.value === "all" ? "all" : (Number(e.target.value) as Grade)
                )
              }
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
            >
              <option value="all">Усі</option>
              {grades.map((g) => (
                <option key={g} value={g}>{gradeLabels[g]}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleClearAll}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Очистити всі
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Немає збережених результатів.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                      ПІБ
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                      Запрошення
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                      Клас
                    </th>
                    {subjectIds.map((s) => (
                      <th
                        key={s}
                        className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase"
                      >
                        {subjectLabels[s]}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                      Дата
                    </th>
                    <th className="px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <Fragment key={r.id}>
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 hover:bg-slate-50/50"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {r.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.invitation}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {gradeLabels[r.grade]}
                        </td>
                        {subjectIds.map((s) => (
                          <td key={s} className="px-4 py-3 text-slate-600">
                            {r.subjects[s]?.total != null ? (
                              <span className="font-medium text-primary-600">
                                {r.subjects[s].score}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-slate-500 text-sm">
                          {formatDate(r.date)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {r.answerDetails && (
                              <button
                                type="button"
                                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                aria-label={expandedId === r.id ? "Згорнути деталі" : "Деталі по питаннях"}
                                title="Деталі по питаннях"
                              >
                                {expandedId === r.id ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              aria-label="Видалити"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === r.id && r.answerDetails && (
                        <tr key={`${r.id}-details`} className="bg-slate-50/80">
                          <td colSpan={subjectIds.length + 4} className="px-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              {subjectIds.map((s) => {
                                const list = r.answerDetails![s];
                                if (!list?.length) return null;
                                return (
                                  <div key={s} className="bg-white rounded-lg border border-slate-200 p-3">
                                    <p className="font-medium text-slate-700 mb-2">
                                      {subjectLabels[s]}
                                    </p>
                                    <ul className="space-y-1.5">
                                      {list.map((item, idx) => (
                                        <li
                                          key={`${item.questionId}-${idx}`}
                                          className={`flex items-start gap-2 ${item.correct ? "text-emerald-700" : "text-red-700"}`}
                                        >
                                          {item.correct ? (
                                            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                          ) : (
                                            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                          )}
                                          <span className="break-words">
                                            {item.questionSnippet
                                              ? `${item.questionSnippet}${item.questionSnippet.length >= 100 ? "…" : ""}`
                                              : `Питання ${idx + 1}`}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
