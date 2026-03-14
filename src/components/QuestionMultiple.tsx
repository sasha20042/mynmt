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
            className="w-full max-w-full object-contain"
          />
        </div>
      )}
      <p className="text-slate-800 font-medium mb-4">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const optImg = question.option_image_urls?.[i];
          return (
            <label
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                value === i
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === i}
                onChange={() => onChange(i)}
                className="w-4 h-4 mt-0.5 shrink-0 text-indigo-600"
              />
              <div className="min-w-0 flex-1">
                {optImg && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={optImg}
                      alt=""
                      className="w-full max-w-full object-contain"
                    />
                  </div>
                )}
                <span className="text-slate-900">{opt}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
