"use client";

import type { MatchingQuestion } from "@/types";
import { ZoomableImage } from "@/components/ZoomableImage";
import { FormattedText } from "@/components/FormattedText";

interface Props {
  question: MatchingQuestion;
  value: number[] | undefined;
  onChange: (indices: number[]) => void;
  /** Необов'язковий порядок відображення правих варіантів (індекси масиву pairs) */
  order?: number[];
}

const scalePct = (scale: number | undefined) => `${((scale ?? 1) * 100).toFixed(0)}%`;

/** Чи є у парах хоча б одне зображення (ліве чи праве) */
function hasAnyPairImages(question: MatchingQuestion): boolean {
  return question.pairs.some(
    (p) => Boolean(p.leftImageUrl) || Boolean(p.rightImageUrl)
  );
}

export function QuestionMatching({ question, value, onChange, order }: Props) {
  const n = question.pairs.length;
  const current = value ?? Array(n).fill(-1);
  const scale = question.image_scale ?? 1;
  const useCardLayout = hasAnyPairImages(question);
  const indices = order && order.length === question.pairs.length
    ? order
    : question.pairs.map((_, i) => i);

  const setOne = (leftIndex: number, renderedIndex: number) => {
    const originalIndex =
      renderedIndex >= 0 && renderedIndex < indices.length ? indices[renderedIndex] : renderedIndex;
    const next = [...current];
    next[leftIndex] = originalIndex;
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
      <div className="space-y-4 overflow-x-auto">
        {question.pairs.map((pair, i) => (
          <div
            key={i}
            className="flex flex-wrap items-stretch gap-3 sm:gap-4 py-3 border-b border-slate-100 last:border-0"
          >
            {/* Лівий елемент пари: фото (якщо є) + текст */}
            <div className="min-w-[140px] flex flex-col gap-1.5">
              {pair.leftImageUrl && (
                <ZoomableImage
                  src={pair.leftImageUrl}
                  alt=""
                  style={{ width: scalePct(scale), maxWidth: "none", display: "block" }}
                  className="object-contain max-h-32 w-full"
                  containerClassName="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 w-full max-w-[200px]"
                />
              )}
              <span className="font-medium text-slate-700">{pair.left}</span>
            </div>

            <span className="text-slate-400 self-center hidden sm:inline">—</span>

            {/* Правий варіант: картки (якщо є фото) або випадаючий список */}
            <div className="flex-1 min-w-0">
              {useCardLayout ? (
                <div className="flex flex-wrap gap-2 min-w-max">
                  {indices.map((originalIndex, j) => {
                    const p = question.pairs[originalIndex];
                    const selected = current[i] === originalIndex;
                    return (
                      <button
                        key={j}
                        type="button"
                        onClick={() => setOne(i, j)}
                        className={`text-left rounded-xl border-2 p-2 sm:p-3 transition flex flex-col gap-1.5 min-w-[100px] max-w-[180px] ${
                          selected
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {p.rightImageUrl && (
                          <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 w-full aspect-square max-h-28 relative">
                            <ZoomableImage
                              src={p.rightImageUrl}
                              alt=""
                              style={{ width: scalePct(scale), maxWidth: "none", display: "block" }}
                              className="object-contain w-full h-full"
                              containerClassName="w-full h-full"
                            />
                          </div>
                        )}
                        <span className="text-sm font-medium text-slate-800 break-words">
                          {p.right}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <select
                  value={current[i] >= 0 ? current[i] : ""}
                  onChange={(e) => setOne(i, Number(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white w-full max-w-xl text-sm"
                >
                  <option value="">Оберіть</option>
                  {indices.map((originalIndex) => (
                    <option key={originalIndex} value={originalIndex}>
                      {question.pairs[originalIndex].right}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
