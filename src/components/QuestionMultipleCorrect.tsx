"use client";

import type { MultipleCorrectQuestion } from "@/types";
import { ZoomableImage } from "@/components/ZoomableImage";
import { FormattedText } from "@/components/FormattedText";

interface Props {
  question: MultipleCorrectQuestion;
  value: number[] | undefined;
  onChange: (indices: number[]) => void;
}

const scalePct = (scale: number | undefined) => `${((scale ?? 1) * 100).toFixed(0)}%`;

export function QuestionMultipleCorrect({ question, value, onChange }: Props) {
  const scale = question.image_scale ?? 1;
  const selected = value ?? [];

  const toggle = (index: number) => {
    const next = selected.includes(index)
      ? selected.filter((i) => i !== index)
      : [...selected, index].sort((a, b) => a - b);
    onChange(next);
  };

  return (
    <div>
      {question.image_url && (
        <div className="mb-4 rounded-xl overflow-x-auto border border-slate-200 bg-slate-50 max-w-full">
          <ZoomableImage
            src={question.image_url}
            alt="До питання"
            style={{ width: scalePct(scale), maxWidth: "none", display: "block" }}
            className="object-contain"
            containerClassName="rounded-xl overflow-hidden"
          />
        </div>
      )}
      <FormattedText text={question.question} />
      <p className="text-sm text-slate-600 mb-3">Оберіть усі правильні варіанти:</p>
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const optImg = question.option_image_urls?.[i];
          const checked = selected.includes(i);
          return (
            <label
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                checked ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(i)}
                className="w-4 h-4 mt-0.5 shrink-0 rounded text-indigo-600"
              />
              <div className="min-w-0 flex-1">
                {optImg && (
                  <div className="mb-2 rounded-lg overflow-x-auto border border-slate-200 bg-slate-50 max-w-full">
                    <ZoomableImage
                      src={optImg}
                      alt=""
                      style={{ width: scalePct(scale), maxWidth: "none", display: "block" }}
                      className="object-contain"
                      containerClassName="rounded-lg overflow-hidden"
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
