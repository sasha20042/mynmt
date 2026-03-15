"use client";

import type { MatchingQuestion } from "@/types";

interface Props {
  question: MatchingQuestion;
  value: number[] | undefined;
  onChange: (indices: number[]) => void;
}

const scalePct = (scale: number | undefined) => `${((scale ?? 1) * 100).toFixed(0)}%`;

export function QuestionMatching({ question, value, onChange }: Props) {
  const n = question.pairs.length;
  const current = value ?? Array(n).fill(-1);
  const scale = question.image_scale ?? 1;

  const setOne = (leftIndex: number, rightIndex: number) => {
    const next = [...current];
    next[leftIndex] = rightIndex;
    onChange(next);
  };

  return (
    <div>
      {question.image_url && (
        <div className="mb-4 rounded-xl overflow-x-auto border border-slate-200 bg-slate-50 max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.image_url}
            alt="До питання"
            style={{ width: scalePct(scale), maxWidth: "none", display: "block" }}
            className="object-contain"
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
            <div className="min-w-[120px] flex flex-col gap-1">
              {pair.leftImageUrl && (
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 max-w-[140px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pair.leftImageUrl}
                    alt=""
                    style={{ width: scalePct(scale), maxWidth: "none", display: "block" }}
                    className="object-contain max-h-24"
                  />
                </div>
              )}
              <span className="font-medium text-slate-700">{pair.left}</span>
            </div>
            <span className="text-slate-400">—</span>
            <div className="flex items-center gap-2 min-w-[160px]">
              <select
                value={current[i] >= 0 ? current[i] : ""}
                onChange={(e) => setOne(i, Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white flex-1"
              >
                <option value="">Оберіть</option>
                {question.pairs.map((p, j) => (
                  <option key={j} value={j}>
                    {p.right}
                  </option>
                ))}
              </select>
              {current[i] >= 0 && question.pairs[current[i]]?.rightImageUrl && (
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0 w-16 h-12">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={question.pairs[current[i]].rightImageUrl}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
