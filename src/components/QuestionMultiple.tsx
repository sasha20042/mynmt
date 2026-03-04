"use client";

import type { MultipleChoiceQuestion } from "@/types";

interface Props {
  question: MultipleChoiceQuestion;
  value: number | undefined;
  onChange: (index: number) => void;
}

export function QuestionMultiple({ question, value, onChange }: Props) {
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
      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <label
            key={i}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
              value === i
                ? "border-primary-500 bg-primary-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <input
              type="radio"
              name={question.id}
              checked={value === i}
              onChange={() => onChange(i)}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-slate-800">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
