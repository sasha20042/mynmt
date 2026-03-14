"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { getQuestionsForBlock } from "@/lib/questionsStorage";
import { subjectLabels, gradeLabels, TIME_PER_BLOCK_SEC, blockSubjects } from "@/constants/questions";
import type { Grade, SubjectId, AnswerState, AnswerDetailItem, Question, ShortAnswerQuestion } from "@/types";
import { QuestionMultiple } from "@/components/QuestionMultiple";
import { QuestionMatching } from "@/components/QuestionMatching";
import { QuestionShortAnswer } from "@/components/QuestionShortAnswer";

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
    const w = getWeight(q as Question);
    out[subject].total += w;
    const val = answers[q.id];
    let ok = false;
    if (q.type === "multiple" && typeof val === "number") {
      ok = (q as import("@/types").MultipleChoiceQuestion).correctIndex === val;
    } else if (q.type === "matching" && Array.isArray(val)) {
      ok = (q as import("@/types").MatchingQuestion).pairs.every((_, i) => val[i] === i);
    } else if (q.type === "short_answer" && typeof val === "string") {
      ok = isShortAnswerCorrect(val, (q as ShortAnswerQuestion).correctAnswer);
    }
    if (ok) out[subject].correct += w;
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
    if (q.type === "multiple" && typeof val === "number") {
      ok = (q as import("@/types").MultipleChoiceQuestion).correctIndex === val;
    } else if (q.type === "matching" && Array.isArray(val)) {
      ok = (q as import("@/types").MatchingQuestion).pairs.every((_, i) => val[i] === i);
    } else if (q.type === "short_answer" && typeof val === "string") {
      ok = isShortAnswerCorrect(val, (q as ShortAnswerQuestion).correctAnswer);
    }
    const snippet = q.question.trim().slice(0, 100);
    out[subject].push({
      questionId: q.id,
      correct: ok,
      questionSnippet: snippet || undefined,
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
  const questionList = useMemo(() => blockItems.map((x) => x.question), [blockItems]);
  const subjectsInBlock = block === 1 ? blockSubjects[1] : blockSubjects[2];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getQuestionsForBlock(grade, block).then((items) => {
      if (!cancelled) {
        setBlockItems(items);
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
          const payload: Record<string, unknown> = { name, invitation, grade, subjects: allScores };
          if (parsed && "answerDetails" in parsed && parsed.answerDetails) {
            payload.answerDetails = parsed.answerDetails;
          }
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

  useEffect(() => {
    if (ended) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setEnded(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [ended]);

  const setAnswer = useCallback((questionId: string, value: AnswerState["value"]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const finishBlock = useCallback(() => {
    setEnded(true);
    const subjectScores = computeSubjectScores(
      blockItems.map((x) => ({ subject: x.subject, question: x.question })),
      answers
    );
    const baseParams = { name, invitation, grade: String(grade) };

    const blockDetails = computeAnswerDetails(
      blockItems.map((x) => ({ subject: x.subject, question: x.question })),
      answers
    );

    if (block === 1) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          BLOCK1_STORAGE,
          JSON.stringify({ subjectScores, answerDetails: blockDetails })
        );
      }
      router.push(`/test?${new URLSearchParams({ ...baseParams, block: "2" }).toString()}`);
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
      ukrainian: [...(block1Details.ukrainian ?? []), ...(blockDetails.ukrainian ?? [])],
      math: [...(block1Details.math ?? []), ...(blockDetails.math ?? [])],
      history: [...(block1Details.history ?? []), ...(blockDetails.history ?? [])],
      english: [...(block1Details.english ?? []), ...(blockDetails.english ?? [])],
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

  const endedRef = useRef(false);
  useEffect(() => {
    if (!ended || endedRef.current) return;
    endedRef.current = true;
    finishBlock();
  }, [ended, finishBlock]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-slate-600">Завантаження…</p>
      </div>
    );
  }
  if (questionList.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-600 mb-4">
            Питання для цього блоку ще не додано. Зверніться до вчителя.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-indigo-600 hover:underline"
          >
            Повернутися на головну
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questionList[currentIndex];
  const currentSubject = blockItems[currentIndex]?.subject;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="font-medium text-slate-800">
              Блок {block} — {subjectsInBlock.map((s) => subjectLabels[s]).join(", ")}
            </span>
            <span className="text-slate-500 text-sm">{gradeLabels[grade]}</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 ${
                secondsLeft <= 300 ? "text-red-600" : "text-slate-600"
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="font-mono font-medium">{formatTime(secondsLeft)}</span>
            </div>
            <button
              type="button"
              onClick={finishBlock}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              <Send className="w-4 h-4" />
              {block === 1 ? "Здати блок 1" : "Здати тест"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-5xl w-full mx-auto gap-6 p-4">
        <aside className="w-44 shrink-0 hidden sm:block">
          <div className="sticky top-4 bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-700 mb-3">Питання</p>
            <div className="flex flex-wrap gap-2">
              {questionList.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition ${
                    currentIndex === i
                      ? "bg-indigo-600 text-white"
                      : answers[q.id] !== undefined
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
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
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
            {currentSubject && (
              <p className="text-xs text-indigo-700 font-medium mb-1">
                {subjectLabels[currentSubject]}
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
              </>
            )}

            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-800 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
                Назад
              </button>
              {currentIndex < questionList.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => i + 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 font-medium border border-slate-300"
                >
                  Далі
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishBlock}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium border border-indigo-700"
                >
                  <Send className="w-4 h-4" />
                  {block === 1 ? "Завершити блок і перейти до блоку 2" : "Завершити тест"}
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
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium border ${
                  currentIndex === i
                    ? "bg-indigo-600 text-white border-indigo-700"
                    : "bg-slate-200 text-slate-800 border-slate-300"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
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
