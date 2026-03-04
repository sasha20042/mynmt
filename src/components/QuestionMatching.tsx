"use client";

import type { MatchingQuestion } from "@/types";

interface Props {
  question: MatchingQuestion;
  value: number[] | undefined;
  onChange: (indices: number[]) => void;
}

export function QuestionMatching({ question, value, onChange }: Props) {
  const n = question.pairs.length;
  const current = value ?? Array(n).fill(-1);

  const setOne = (leftIndex: number, rightIndex: number) => {
    const next = [...current];
    next[leftIndex] = rightIndex;
    onChange(next);
  };

  return (
    <div>
      {question.image_url && (
        <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.image_url}
            alt="До питання"
            className="w-full max-h-80 object-contain"
          />
        </div>
      )}
      <p className="text-slate-800 font-medium mb-4">{question.question}</p>
      <div className="space-y-3">
        {question.pairs.map((pair, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 sm:gap-4 py-2 border-b border-slate-100 last:border-0"
          >
            <span className="font-medium text-slate-700 min-w-[120px]">{pair.left}</span>
            <span className="text-slate-400">—</span>
            <select
              value={current[i] >= 0 ? current[i] : ""}
              onChange={(e) => setOne(i, Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white min-w-[160px]"
            >
              <option value="">Оберіть</option>
              {question.pairs.map((p, j) => (
                <option key={j} value={j}>
                  {p.right}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
