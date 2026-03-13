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
        {question.options.map((opt, i) => {
          const optImg = question.option_image_urls?.[i];
          return (
            <label
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
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
                className="w-4 h-4 mt-0.5 shrink-0 text-primary-600"
              />
              <div className="min-w-0 flex-1">
                {optImg && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 max-w-[200px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={optImg}
                      alt=""
                      className="w-full max-h-32 object-contain"
                    />
                  </div>
                )}
                <span className="text-slate-800">{opt}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
