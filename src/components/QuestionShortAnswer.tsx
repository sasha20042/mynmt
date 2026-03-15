"use client";

import type { ShortAnswerQuestion } from "@/types";

interface Props {
  question: ShortAnswerQuestion;
  value: string | undefined;
  onChange: (value: string) => void;
}

const scalePct = (scale: number | undefined) => `${((scale ?? 1) * 100).toFixed(0)}%`;

export function QuestionShortAnswer({ question, value, onChange }: Props) {
  const scale = question.image_scale ?? 1;
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
      <label className="block">
        <span className="sr-only">Відповідь</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Введіть число або відповідь"
          className="w-full max-w-xs px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-900"
        />
      </label>
    </div>
  );
}
