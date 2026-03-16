"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { getQuestionsForBlock } from "@/lib/questionsStorage";
import { subjectLabels, gradeLabels, TIME_PER_BLOCK_SEC, blockSubjects } from "@/constants/questions";
import type { Grade, SubjectId, AnswerState, AnswerDetailItem, Question, ShortAnswerQuestion, MultipleCorrectQuestion } from "@/types";
import { QuestionMultiple } from "@/components/QuestionMultiple";
import { QuestionMatching } from "@/components/QuestionMatching";
import { QuestionShortAnswer } from "@/components/QuestionShortAnswer";
import { QuestionMultipleCorrect } from "@/components/QuestionMultipleCorrect";

const BLOCK1_STORAGE = "nmt_block1_scores";

function parseParams(searchParams: ReturnType<typeof useSearchParams>) {
  const name = searchParams.get("name") ?? "";
  const invitation = searchParams.get("invitation") ?? "";
  const grade = (Number(searchParams.get("grade")) || 9) as Grade;
  const block = (Number(searchParams.get("block")) || 1) as 1 | 2;
  return { name, invitation, grade, block };
}

function getWeight(q: Question): number {
  const w = (q as Question & { weight?: number }).weight;
  return typeof w === "number" && w > 0 ? w : 1;
}

/** Порівняння відповіді "своя відповідь": числа з допуском, інакше рядки без урахування регістру */
function isShortAnswerCorrect(userValue: string | undefined, correctAnswer: string): boolean {
  const u = String(userValue ?? "").trim().replace(/,/g, ".");
  const c = correctAnswer.trim().replace(/,/g, ".");
  const uNum = parseFloat(u);
  const cNum = parseFloat(c);
  if (!Number.isNaN(uNum) && !Number.isNaN(cNum)) {
    return Math.abs(uNum - cNum) < 1e-6;
  }
  return u.toLowerCase() === c.toLowerCase();
}

function computeSubjectScores(
  blockItems: { subject: SubjectId; question: Question }[],
  answers: Record<string, AnswerState["value"]>
): Record<SubjectId, { correct: number; total: number }> {
  const out: Record<string, { correct: number; total: number }> = {};
  for (const { subject, question: q } of blockItems) {
    if (!out[subject]) out[subject] = { correct: 0, total: 0 };
    const val = answers[q.id];
    if (q.type === "matching" && Array.isArray(val)) {
      const mat = q as import("@/types").MatchingQuestion;
      const n = mat.pairs.length;
      out[subject].total += n;
      let correctPairs = 0;
      for (let i = 0; i < n; i++) if (val[i] === i) correctPairs++;
      out[subject].correct += correctPairs;
    } else if (q.type === "multiple_correct" && Array.isArray(val)) {
      const mc = q as MultipleCorrectQuestion;
      const correctSet = new Set(mc.correctIndices);
      out[subject].total += correctSet.size;
      let correctCount = 0;
      for (const i of val as number[]) if (correctSet.has(i)) correctCount++;
      out[subject].correct += correctCount;
    } else {
      const w = getWeight(q as Question);
      out[subject].total += w;
      let ok = false;
      if (q.type === "multiple" && typeof val === "number") {
        ok = (q as import("@/types").MultipleChoiceQuestion).correctIndex === val;
      } else if (q.type === "short_answer" && typeof val === "string") {
        ok = isShortAnswerCorrect(val, (q as ShortAnswerQuestion).correctAnswer);
      }
      if (ok) out[subject].correct += w;
    }
  }
  return out as Record<SubjectId, { correct: number; total: number }>;
}

function computeAnswerDetails(
  blockItems: { subject: SubjectId; question: Question }[],
  answers: Record<string, AnswerState["value"]>
): Record<SubjectId, AnswerDetailItem[]> {
  const out: Record<string, AnswerDetailItem[]> = {};
  for (const { subject, question: q } of blockItems) {
    if (!out[subject]) out[subject] = [];
    const val = answers[q.id];
    let ok = false;
    let userAnswer: string | undefined;
    let correctAnswer: string | undefined;
    let meta: string | undefined;
    if (q.type === "multiple" && typeof val === "number") {
      const mq = q as import("@/types").MultipleChoiceQuestion;
      ok = mq.correctIndex === val;
      if (val >= 0 && val < mq.options.length) {
        userAnswer = mq.options[val];
      }
      if (mq.correctIndex >= 0 && mq.correctIndex < mq.options.length) {
        correctAnswer = mq.options[mq.correctIndex];
      }
    } else if (q.type === "matching" && Array.isArray(val)) {
      const mat = q as import("@/types").MatchingQuestion;
      ok = mat.pairs.every((_, i) => val[i] === i);
      const parts: string[] = [];
      for (let i = 0; i < mat.pairs.length; i++) {
        const left = mat.pairs[i]?.left ?? "";
        const rightIdx = (val as number[])[i];
        const right = rightIdx != null && rightIdx >= 0 && rightIdx < mat.pairs.length
          ? mat.pairs[rightIdx].right
          : "—";
        parts.push(`${i + 1}) ${left} → ${right}`);
      }
      userAnswer = parts.join("; ");
    } else if (q.type === "short_answer" && typeof val === "string") {
      const sa = q as ShortAnswerQuestion;
      ok = isShortAnswerCorrect(val, sa.correctAnswer);
      userAnswer = val;
      correctAnswer = sa.correctAnswer;
    } else if (q.type === "multiple_correct" && Array.isArray(val)) {
      const mc = q as MultipleCorrectQuestion;
      const correctSet = new Set(mc.correctIndices);
      const userArr = val as number[];
      ok = correctSet.size === userArr.length && userArr.every((i) => correctSet.has(i));
      const userLabels = userArr
        .filter((i) => i >= 0 && i < mc.options.length)
        .map((i) => mc.options[i]);
      const correctLabels = mc.correctIndices
        .filter((i) => i >= 0 && i < mc.options.length)
        .map((i) => mc.options[i]);
      userAnswer = userLabels.join("; ");
      correctAnswer = correctLabels.join("; ");
      let correctCount = 0;
      for (const i of userArr) if (correctSet.has(i)) correctCount++;
      meta = `Правильних варіантів у відповіді учня: ${correctCount} з ${correctSet.size}`;
    }
    const snippet = q.question.trim().slice(0, 100);
    out[subject].push({
      questionId: q.id,
      correct: ok,
      questionSnippet: snippet || undefined,
      userAnswer: userAnswer || undefined,
      correctAnswer: correctAnswer || undefined,
      meta: meta || undefined,
    });
  }
  return out as Record<SubjectId, AnswerDetailItem[]>;
}

function TestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { name, invitation, grade, block } = parseParams(searchParams);

  const [blockItems, setBlockItems] = useState<{ subject: SubjectId; question: import("@/types").Question; index: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [transitionToBlock2, setTransitionToBlock2] = useState(false);
  const [optionOrder, setOptionOrder] = useState<Record<string, number[]>>({});
  const subjectsInBlock = block === 1 ? blockSubjects[1] : blockSubjects[2];
  const questionList = useMemo(() => blockItems.map((x) => x.question), [blockItems]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getQuestionsForBlock(grade, block).then((items) => {
      if (!cancelled) {
        setBlockItems(items);
        // Задаємо випадковий порядок варіантів для вибраних предметів
        const newOrder: Record<string, number[]> = {};
        const shuffle = (arr: number[]) => {
          const copy = [...arr];
          for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
          }
          return copy;
        };
        for (const item of items) {
          const subj = item.subject;
          if (subj === "history" || subj === "ukrainian" || subj === "math") {
            const q = item.question as Question;
            if (q.type === "multiple" || q.type === "multiple_correct") {
              const base = q.options.map((_, i) => i);
              newOrder[q.id] = shuffle(base);
            }
          }
        }
        setOptionOrder(newOrder);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [grade, block]);

  useEffect(() => {
    if (block === 2 && blockItems.length === 0 && typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(BLOCK1_STORAGE);
        if (raw) {
          const parsed = JSON.parse(raw) as
            | { subjectScores?: Record<SubjectId, { correct: number; total: number }>; answerDetails?: Record<SubjectId, import("@/types").AnswerDetailItem[]> }
            | Record<SubjectId, { correct: number; total: number }>;
          const allScores = {
            ukrainian: { correct: 0, total: 0 },
            math: { correct: 0, total: 0 },
            history: { correct: 0, total: 0 },
            english: { correct: 0, total: 0 },
            ...(parsed && "subjectScores" in parsed ? parsed.subjectScores : parsed),
          };
          const emptyDetails: Record<SubjectId, AnswerDetailItem[]> = {
            ukrainian: [], math: [], history: [], english: [],
          };
          const allDetails = parsed && "answerDetails" in parsed && parsed.answerDetails
            ? { ...emptyDetails, ...parsed.answerDetails }
            : emptyDetails;
          const payload: Record<string, unknown> = { name, invitation, grade, subjects: allScores, answerDetails: allDetails };
          sessionStorage.setItem("nmt_final_scores", JSON.stringify(payload));
          sessionStorage.removeItem(BLOCK1_STORAGE);
          router.replace("/results");
        }
      } catch {}
    }
  }, [block, blockItems.length, name, invitation, grade, router]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState["value"]>>({});
  const [secondsLeft, setSecondsLeft] = useState(TIME_PER_BLOCK_SEC);
  const [ended, setEnded] = useState(false);
  const [timeUpModalOpen, setTimeUpModalOpen] = useState(false);

  useEffect(() => {
    if (ended || timeUpModalOpen) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setTimeUpModalOpen(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [ended, timeUpModalOpen]);

  const setAnswer = useCallback((questionId: string, value: AnswerState["value"]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const finishBlock = useCallback(() => {
    const items = blockItems.map((x) => ({ subject: x.subject, question: x.question }));
    const subjectScores = computeSubjectScores(items, answers);
    const answerDetails = computeAnswerDetails(items, answers);

    const baseParams = { name, invitation, grade: String(grade) };

    if (block === 1) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          BLOCK1_STORAGE,
          JSON.stringify({ subjectScores, answerDetails })
        );
      }
      setTransitionToBlock2(true);
      return;
    }

    let block1Scores: Record<SubjectId, { correct: number; total: number }> = {
      ukrainian: { correct: 0, total: 0 },
      math: { correct: 0, total: 0 },
      history: { correct: 0, total: 0 },
      english: { correct: 0, total: 0 },
    };
    let block1Details: Record<SubjectId, AnswerDetailItem[]> = {
      ukrainian: [],
      math: [],
      history: [],
      english: [],
    };
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(BLOCK1_STORAGE);
        if (raw) {
          const parsed = JSON.parse(raw) as
            | { subjectScores?: Record<SubjectId, { correct: number; total: number }>; answerDetails?: Record<SubjectId, AnswerDetailItem[]> }
            | Record<SubjectId, { correct: number; total: number }>;
          if (parsed && "subjectScores" in parsed && parsed.subjectScores) {
            block1Scores = { ...block1Scores, ...parsed.subjectScores };
            if (parsed.answerDetails) block1Details = parsed.answerDetails;
          } else {
            block1Scores = { ...block1Scores, ...(parsed as Record<SubjectId, { correct: number; total: number }>) };
          }
        }
      } catch {}
    }
    const allScores: Record<SubjectId, { correct: number; total: number }> = {
      ...block1Scores,
      ...subjectScores,
    };
    const allDetails: Record<SubjectId, AnswerDetailItem[]> = {
      ukrainian: [...(block1Details.ukrainian ?? []), ...(answerDetails.ukrainian ?? [])],
      math: [...(block1Details.math ?? []), ...(answerDetails.math ?? [])],
      history: [...(block1Details.history ?? []), ...(answerDetails.history ?? [])],
      english: [...(block1Details.english ?? []), ...(answerDetails.english ?? [])],
    };
    if (typeof window !== "undefined") {
      sessionStorage.setItem("nmt_final_scores", JSON.stringify({
        name,
        invitation,
        grade,
        subjects: allScores,
        answerDetails: allDetails,
      }));
      sessionStorage.removeItem(BLOCK1_STORAGE);
    }
    router.push("/results");
  }, [block, blockItems, answers, name, invitation, grade, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-slate-600">Завантаження…</p>
      </div>
    );
  }

  if (transitionToBlock2 && block === 1) {
    const baseParams = { name, invitation, grade: String(grade) };
    const goToBlock2 = () => {
      router.push(`/test?${new URLSearchParams({ ...baseParams, block: "2" }).toString()}`);
    };
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex flex-col items-center justify-center p-6 transition-colors duration-300">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-8 text-center transition-all duration-300">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <Clock className="w-7 h-7 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-3">Блок 1 завершено</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Ваші відповіді збережено. Коли будете готові, перейдіть до блоку 2.
          </p>
          <button
            type="button"
            onClick={goToBlock2}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
          >
            Перейти до блоку 2
          </button>
        </div>
      </div>
    );
  }

  if (questionList.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-slate-600 mb-4">
            Питання для цього блоку ще не додано.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {(block === 1 || block === 2) && (
              <button
                type="button"
                onClick={finishBlock}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                {block === 1 ? "Здати блок 1" : "Здати тест"}
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-indigo-600 hover:underline text-sm"
            >
              Повернутися на головну
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    }
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questionList[currentIndex];
  const currentItem = blockItems[currentIndex];
  const answeredCount = Object.keys(answers).filter((id) =>
    blockItems.some((x) => x.question.id === id)
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white shrink-0 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="font-medium text-slate-800">
              Блок {block} — {subjectsInBlock.map((s) => subjectLabels[s]).join(", ")} (2 год)
            </span>
            <span className="text-slate-500 text-sm">{gradeLabels[grade]}</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 transition-colors duration-200 ${
                secondsLeft <= 300 ? "text-red-600" : "text-slate-600"
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="font-mono font-medium tabular-nums">{formatTime(secondsLeft)}</span>
            </div>
            <button
              type="button"
              onClick={finishBlock}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              {block === 1 ? "Здати блок 1" : "Здати тест"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-5xl w-full mx-auto gap-6 p-4">
        <aside className="w-44 shrink-0 hidden sm:block">
          <div className="sticky top-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-shadow duration-200 hover:shadow">
            <p className="text-xs font-medium text-slate-700 mb-3">Питання</p>
            <div className="flex flex-wrap gap-2">
              {questionList.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                      currentIndex === i
                        ? "bg-indigo-600 text-white shadow-sm"
                        : answers[q.id] !== undefined
                          ? "bg-indigo-100 text-indigo-800 border border-indigo-200 hover:bg-indigo-200/80"
                          : "bg-slate-200 text-slate-800 hover:bg-slate-300 border border-slate-300"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-600">
              Відповідно: {answeredCount} / {questionList.length}
            </p>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            {currentItem && (
              <p className="text-xs text-indigo-700 font-medium mb-1">
                {subjectLabels[currentItem.subject]}
              </p>
            )}
            {currentQuestion && (
              <>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Питання {currentIndex + 1} з {questionList.length}
                </p>
                {currentQuestion.type === "multiple" && (
                  <QuestionMultiple
                    question={currentQuestion as import("@/types").MultipleChoiceQuestion}
                    value={answers[currentQuestion.id] as number | undefined}
                    onChange={(v) => setAnswer(currentQuestion.id, v)}
                    order={optionOrder[currentQuestion.id]}
                  />
                )}
                {currentQuestion.type === "matching" && (
                  <QuestionMatching
                    question={currentQuestion as import("@/types").MatchingQuestion}
                    value={answers[currentQuestion.id] as number[] | undefined}
                    onChange={(v) => setAnswer(currentQuestion.id, v)}
                  />
                )}
                {currentQuestion.type === "short_answer" && (
                  <QuestionShortAnswer
                    question={currentQuestion as ShortAnswerQuestion}
                    value={answers[currentQuestion.id] as string | undefined}
                    onChange={(v) => setAnswer(currentQuestion.id, v)}
                  />
                )}
                {currentQuestion.type === "multiple_correct" && (
                  <QuestionMultipleCorrect
                    question={currentQuestion as MultipleCorrectQuestion}
                    value={answers[currentQuestion.id] as number[] | undefined}
                    onChange={(v) => setAnswer(currentQuestion.id, v)}
                    order={optionOrder[currentQuestion.id]}
                  />
                )}
              </>
            )}

            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-800 disabled:opacity-50 transition-colors duration-200"
              >
                <ChevronLeft className="w-5 h-5" />
                Назад
              </button>
              {currentIndex < questionList.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => i + 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 font-medium border border-slate-300 transition-all duration-200 active:scale-[0.98]"
                >
                  Далі
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishBlock}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium border border-indigo-700 shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
                >
                  <Send className="w-4 h-4" />
                  {block === 1 ? "Здати блок 1" : "Здати тест"}
                </button>
              )}
            </div>
          </div>

          <div className="sm:hidden mt-4 flex flex-wrap gap-2">
            {questionList.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium border transition-all duration-200 ${
                  currentIndex === i
                    ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                    : "bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {timeUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-200/80">
            <p className="text-lg font-medium text-slate-800 mb-6 leading-relaxed">
              Час закінчився. Поточні відповіді зараховано.
            </p>
            <button
              type="button"
              onClick={() => {
                setTimeUpModalOpen(false);
                finishBlock();
              }}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-slate-600">Завантаження…</p>
      </div>
    }>
      <TestPageContent />
    </Suspense>
  );
}
