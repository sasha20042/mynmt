"use client";

import type { MultipleChoiceQuestion } from "@/types";
import { ZoomableImage } from "@/components/ZoomableImage";
import { FormattedText } from "@/components/FormattedText";

interface Props {
  question: MultipleChoiceQuestion;
  value: number | undefined;
  onChange: (index: number) => void;
  /** Необов'язковий порядок відображення варіантів (індекси вихідного масиву options) */
  order?: number[];
}

const scalePct = (scale: number | undefined) => `${((scale ?? 1) * 100).toFixed(0)}%`;

export function QuestionMultiple({ question, value, onChange, order }: Props) {
  const scale = question.image_scale ?? 1;
  const indices = order && order.length === question.options.length
    ? order
    : question.options.map((_, i) => i);
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
      <div className="space-y-2">
        {indices.map((originalIndex) => {
          const opt = question.options[originalIndex];
          const optImg = question.option_image_urls?.[originalIndex];
          return (
            <label
              key={originalIndex}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                value === originalIndex
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === originalIndex}
                onChange={() => onChange(originalIndex)}
                className="w-4 h-4 mt-0.5 shrink-0 text-indigo-600"
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
                <FormattedText inline text={opt} className="text-slate-900" />
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
