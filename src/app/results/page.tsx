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
  subjects: Record<SubjectId, { correct: number; total: number }>;
  answerDetails?: import("@/types").TestResult["answerDetails"];
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
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("nmt_final_scores");
    sessionStorage.removeItem("nmt_final_scores");
    if (!raw) {
      router.replace("/");
      return;
    }
    let parsed: FinalScores;
    try {
      parsed = JSON.parse(raw) as FinalScores;
    } catch {
      router.replace("/");
      return;
    }
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
    (async () => {
      await saveResult({
        name: parsed.name,
        invitation: parsed.invitation,
        grade: parsed.grade,
        date: new Date().toISOString(),
        subjects,
        ...(parsed.answerDetails && { answerDetails: parsed.answerDetails }),
      });
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

  const sanitizeFileName = (value: string) =>
    value
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 60);

  const handleSnapshot = async () => {
    if (!data || exporting) return;
    setExporting(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileBase = sanitizeFileName(`${data.name}_${data.grade}_${dateStr}`);

      // Excel (SheetJS)
      const xlsxMod = await import("xlsx");
      const xlsx = xlsxMod.default ?? xlsxMod;

      const subjectRows = (Object.keys(defaultScores) as SubjectId[]).map((id) => {
        const t = data.subjects[id] ?? { correct: 0, total: 0 };
        const percent = t.total ? Math.round((t.correct / t.total) * 100) : 0;
        return {
          "Предмет": subjectLabels[id],
          "Набрано (балів)": `${t.correct}/${t.total}`,
          "Відсоток (%)": percent,
        };
      });

      const wb = xlsx.utils.book_new();
      const summarySheet = xlsx.utils.json_to_sheet(subjectRows);
      xlsx.utils.book_append_sheet(wb, summarySheet, "Зведення");

      const detailRows: Array<Record<string, string | number>> = [];
      const answerDetails =
        data.answerDetails ?? ({} as NonNullable<FinalScores["answerDetails"]>);
      let n = 1;
      for (const subjId of Object.keys(defaultScores) as SubjectId[]) {
        const items = answerDetails[subjId] ?? [];
        for (const item of items) {
          detailRows.push({
            "№": n++,
            "Предмет": subjectLabels[subjId],
            "Питання": item.questionSnippet ?? "",
            "Відповідь учня": item.userAnswer ?? "—",
            "Правильна відповідь": item.correctAnswer ?? "—",
            "Результат": item.correct ? "Правильно" : "Неправильно",
            "Мета": item.meta ?? "",
          });
        }
      }

      if (detailRows.length) {
        const detailsSheet = xlsx.utils.json_to_sheet(detailRows);
        xlsx.utils.book_append_sheet(wb, detailsSheet, "Деталі");
      }

      const wbout = xlsx.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);

      try {
        // PDF (pdfmake)
        const pdfMakeMod = await import("pdfmake/build/pdfmake");
        const pdfFontsMod = await import("pdfmake/build/vfs_fonts");
        const pdfMake = (pdfMakeMod.default ?? pdfMakeMod) as any;
      // pdfmake/build/vfs_fonts exports font file contents keyed by filename
      pdfMake.vfs = (pdfFontsMod as any).pdfMake?.vfs ?? (pdfFontsMod as any).vfs ?? pdfFontsMod;

        const pdfDocDefinition: any = {
          content: [
            { text: "Результати тесту", style: "title" },
            {
              text: `${data.name} · ${gradeLabels[data.grade]} · Запрошення ${data.invitation}`,
              style: "subtitle",
            },
            { text: `Дата: ${new Date().toLocaleString("uk-UA")}`, style: "meta" },
            { text: " ", margin: [0, 10, 0, 6] },
            { text: "Зведення по предметах", style: "sectionTitle" },
            {
              table: {
                headerRows: 1,
                widths: ["*", "auto", "auto", "auto"],
                body: [
                  [
                    { text: "Предмет", style: "tableHeader" },
                    { text: "Набрано", style: "tableHeader" },
                    { text: "%", style: "tableHeader" },
                    { text: " ", style: "tableHeader" },
                  ],
                  ...((Object.keys(defaultScores) as SubjectId[]).map((id) => {
                    const t = data.subjects[id] ?? { correct: 0, total: 0 };
                    const percent = t.total ? Math.round((t.correct / t.total) * 100) : 0;
                    return [
                      { text: subjectLabels[id], style: "tableCell" },
                      { text: `${t.correct}/${t.total}`, style: "tableCell" },
                      { text: `${percent}%`, style: "tableCell" },
                      { text: "", style: "tableCell" },
                    ];
                  })),
                ],
              },
              layout: {
                fillColor: (rowIndex: number) => (rowIndex === 0 ? "#F3F4F6" : null),
              },
            },
            { text: " ", margin: [0, 14, 0, 6] },
            { text: "Детальні відповіді", style: "sectionTitle" },
            ...(detailRows.length
              ? [
                  {
                    table: {
                      headerRows: 1,
                      widths: ["auto", "*", "*", "*", "*"],
                      body: [
                        [
                          { text: "№", style: "tableHeader" },
                          { text: "Предмет", style: "tableHeader" },
                          { text: "Питання", style: "tableHeader" },
                          { text: "Відповідь учня", style: "tableHeader" },
                          { text: "Правильна відповідь", style: "tableHeader" },
                        ],
                        ...detailRows.map((r) => [
                          { text: String(r["№"] ?? ""), style: "tableCell" },
                          { text: String(r["Предмет"] ?? ""), style: "tableCell" },
                          { text: String(r["Питання"] ?? ""), style: "tableCell" },
                          { text: String(r["Відповідь учня"] ?? ""), style: "tableCell" },
                          { text: String(r["Правильна відповідь"] ?? ""), style: "tableCell" },
                        ]),
                      ],
                    },
                    layout: {
                      fillColor: (rowIndex: number) => (rowIndex === 0 ? "#F3F4F6" : null),
                    },
                    wordWrap: true,
                  },
                ]
              : [{ text: "Деталі відповідей відсутні для цього результату.", style: "meta" }]),
          ],
          styles: {
            title: { fontSize: 18, bold: true, margin: [0, 0, 0, 6] },
            subtitle: { fontSize: 11, bold: true, color: "#374151", margin: [0, 0, 0, 2] },
            meta: { fontSize: 9, color: "#6B7280" },
            sectionTitle: { fontSize: 12, bold: true, color: "#111827", margin: [0, 0, 0, 6] },
            tableHeader: { fontSize: 9, bold: true, color: "#111827" },
            tableCell: { fontSize: 8, color: "#111827" },
          },
          defaultStyle: {
            font: "Roboto",
          },
          pageSize: "A4",
          pageMargins: [40, 50, 40, 45],
        };

        const pdfName = `${fileBase}.pdf`;
        pdfMake.createPdf(pdfDocDefinition).download(pdfName);
      } catch (err) {
        console.error("PDF export failed:", err);
        alert("Excel сформувався, але PDF не вийшов. Перевірте консоль (F12).");
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <Award className="w-8 h-8 text-indigo-600" />
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
                      Набрано {s.correct}/{s.total} балів
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-indigo-700">
                  {s.correct}/{s.total} <span className="text-base text-indigo-700/70 font-semibold">({s.score}%)</span>
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleSnapshot}
              disabled={exporting}
              className="w-full py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              Зліпок
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              На головну
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
