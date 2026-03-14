"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Link2,
  GraduationCap,
  BookOpen,
  ImagePlus,
} from "lucide-react";
import { getQuestionBank, saveQuestionsForSubject } from "@/lib/questionsStorage";
import { grades, gradeLabels, subjectLabels, subjectIds } from "@/constants/questions";
import type { Grade, SubjectId, Question, MultipleChoiceQuestion, MatchingQuestion, ShortAnswerQuestion } from "@/types";
import { generateId } from "@/lib/uuid";

type EditMode = { type: "add" } | { type: "edit"; index: number };

/** Завантажує зображення в Airtable через API, повертає URL */
async function processImageBlob(blob: Blob): Promise<string> {
  const file = new File(
    [blob],
    blob.type.startsWith("image/") ? "image.png" : "paste.png",
    { type: blob.type }
  );
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload-image", { method: "POST", body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Помилка ${res.status}`);
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}

function getImageFromClipboardItem(item: ClipboardItem): Promise<Blob | null> {
  for (const type of item.types) {
    if (type.startsWith("image/")) return item.getType(type);
  }
  return Promise.resolve(null);
}

const newMultiple = (): MultipleChoiceQuestion => ({
  type: "multiple",
  id: generateId(),
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  weight: 1,
});

const newMatching = (): MatchingQuestion => ({
  type: "matching",
  id: generateId(),
  question: "",
  pairs: [{ left: "", right: "" }],
  weight: 1,
});

const newShortAnswer = (): ShortAnswerQuestion => ({
  type: "short_answer",
  id: generateId(),
  question: "",
  correctAnswer: "",
  weight: 1,
});

export default function AdminTestsPage() {
  const [grade, setGrade] = useState<Grade>(9);
  const [subject, setSubject] = useState<SubjectId>("ukrainian");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [edit, setEdit] = useState<EditMode | null>(null);
  const [draft, setDraft] = useState<Question | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingOptionIndex, setUploadingOptionIndex] = useState<number | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draftRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const bank = await getQuestionBank();
    setQuestions(bank[grade][subject] ?? []);
    setEdit(null);
    setDraft(null);
  }, [grade, subject]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveBank = async () => {
    try {
      await saveQuestionsForSubject(grade, subject, questions);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Помилка збереження");
    }
  };

  const handleAdd = () => {
    setEdit({ type: "add" });
    setDraft(newMultiple());
    setTimeout(() => draftRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handleEdit = (index: number) => {
    const q = questions[index];
    setEdit({ type: "edit", index });
    setDraft(JSON.parse(JSON.stringify(q)));
    setTimeout(() => draftRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handleDelete = async (index: number) => {
    if (!confirm("Видалити це питання?")) return;
    const next = questions.filter((_, i) => i !== index);
    try {
      await saveQuestionsForSubject(grade, subject, next);
      setQuestions(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Помилка видалення");
    }
  };

  const handleSaveDraft = async () => {
    if (!draft) return;
    if (draft.type === "multiple") {
      const m = draft as MultipleChoiceQuestion;
      if (!m.question.trim() || m.options.some((o) => !o.trim())) {
        alert("Заповніть питання та усі варіанти відповіді.");
        return;
      }
    } else if (draft.type === "short_answer") {
      const s = draft as ShortAnswerQuestion;
      if (!s.question.trim() || !s.correctAnswer.trim()) {
        alert("Заповніть питання та правильну відповідь.");
        return;
      }
    } else {
      const mat = draft as MatchingQuestion;
      if (!mat.question.trim() || mat.pairs.some((p) => !p.left.trim() || !p.right.trim())) {
        alert("Заповніть питання та усі пари.");
        return;
      }
    }
    setSaving(true);
    try {
      const newList =
        edit?.type === "add"
          ? [...questions, draft]
          : questions.map((q, i) => (i === edit!.index ? draft : q));
      await saveQuestionsForSubject(grade, subject, newList);
      setQuestions(newList);
      setEdit(null);
      setDraft(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Помилка збереження питань");
    } finally {
      setSaving(false);
    }
  };

  const moveQuestion = async (index: number, dir: 1 | -1) => {
    const next = [...questions];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    try {
      await saveQuestionsForSubject(grade, subject, next);
      setQuestions(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Помилка збереження");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label="На головну"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">
                Внесення тестів
              </h1>
              <p className="text-sm text-slate-500">
                Додавання та редагування питань за класом і предметом
              </p>
            </div>
          </div>
          <Link
            href="/admin-results"
            className="text-sm text-indigo-600 hover:underline"
          >
            Результати →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Клас:</span>
            <select
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value) as Grade)}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {grades.map((g) => (
                <option key={g} value={g}>
                  {gradeLabels[g]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Предмет:</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as SubjectId)}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {subjectIds.map((s) => (
                <option key={s} value={s}>
                  {subjectLabels[s]}
                </option>
              ))}
            </select>
          </div>
          {saved && (
            <span className="flex items-center gap-1 text-emerald-600 text-sm">
              <Save className="w-4 h-4" /> Збережено
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Питань: <strong>{questions.length}</strong>
            </p>
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Додати питання
            </button>
          </div>

          {questions.length === 0 && !draft && (
            <div className="p-12 text-center text-slate-500">
              Немає питань. Оберіть клас і предмет та натисніть «Додати питання».
            </div>
          )}

          <ul className="divide-y divide-slate-100">
            {questions.map((q, i) => (
              <li
                key={q.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-50/50"
              >
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => moveQuestion(i, -1)}
                    disabled={i === 0}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    aria-label="Вгору"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(i, 1)}
                    disabled={i === questions.length - 1}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    aria-label="Вниз"
                  >
                    ▼
                  </button>
                </div>
                <span className="text-slate-400 font-mono w-8">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {q.question || "(без тексту)"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {q.type === "multiple"
                      ? "Один з варіантів"
                      : q.type === "short_answer"
                        ? "Своя відповідь"
                        : "Відповідність"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(i)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                    aria-label="Редагувати"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(i)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                    aria-label="Видалити"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {draft && (
          <div ref={draftRef} className="mt-8 bg-white rounded-xl border-2 border-indigo-200 p-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">
              {edit?.type === "add" ? "Нове питання" : "Редагування"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Тип
                </label>
                <select
                  value={draft.type}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft(
                      v === "multiple" ? newMultiple() : v === "short_answer" ? newShortAnswer() : newMatching()
                    );
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white w-full max-w-xs"
                >
                  <option value="multiple">Один з варіантів (до 10)</option>
                  <option value="matching">Відповідність (пари)</option>
                  <option value="short_answer">Своя відповідь (число/текст)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Текст питання
                </label>
                <textarea
                  value={draft.question}
                  onChange={(e) =>
                    setDraft({ ...draft, question: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Введіть текст питання..."
                />
                <div className="mt-3 flex items-center gap-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Вага питання (бали)
                  </label>
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={Math.max(0.25, (draft as Question & { weight?: number }).weight ?? 1)}
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value.replace(",", "."));
                      const w = Number.isFinite(raw) && raw > 0 ? raw : 1;
                      setDraft({ ...(draft as Question & { weight?: number }), weight: w });
                    }}
                    className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  />
                  <span className="text-xs text-slate-500">
                    Скільки балів дає правильна відповідь (за замовчуванням 1).
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Фото до питання (опційно)
                </label>
                {(draft as Question & { image_url?: string }).image_url ? (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-slate-200 overflow-hidden max-w-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={(draft as Question & { image_url?: string }).image_url}
                        alt="Превʼю"
                        className="w-full max-h-40 object-contain bg-slate-50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          image_url: undefined,
                        } as Question & { image_url?: string })
                      }
                      className="text-sm text-red-600 hover:underline"
                    >
                      Видалити фото
                    </button>
                  </div>
                ) : (
                  <div
                    className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400"
                    tabIndex={0}
                    onPaste={async (e) => {
                      const file = e.clipboardData?.files?.[0];
                      if (!file?.type.startsWith("image/")) return;
                      e.preventDefault();
                      setImageError(null);
                      setUploadingImage(true);
                      try {
                        const url = await processImageBlob(file);
                        setDraft({
                          ...draft,
                          image_url: url,
                        } as Question & { image_url?: string });
                      } catch (err) {
                        setImageError(err instanceof Error ? err.message : "Помилка вставки");
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setImageError(null);
                        setUploadingImage(true);
                        try {
                          const url = await processImageBlob(file);
                          setDraft({
                            ...draft,
                            image_url: url,
                          } as Question & { image_url?: string });
                        } catch (err) {
                          setImageError(err instanceof Error ? err.message : "Помилка завантаження");
                        } finally {
                          setUploadingImage(false);
                          e.target.value = "";
                        }
                      }}
                      className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:text-indigo-800"
                    />
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={async () => {
                          try {
                            const items = await navigator.clipboard.read();
                            for (const item of items) {
                              const blob = await getImageFromClipboardItem(item);
                              if (blob) {
                                setImageError(null);
                                setUploadingImage(true);
                                try {
                                  const url = await processImageBlob(blob);
                                  setDraft({
                                    ...draft,
                                    image_url: url,
                                  } as Question & { image_url?: string });
                                } finally {
                                  setUploadingImage(false);
                                }
                                return;
                              }
                            }
                            setImageError("У буфері обміну немає зображення");
                          } catch (err) {
                            setImageError(err instanceof Error ? err.message : "Немає доступу до буфера");
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 text-sm font-medium hover:bg-indigo-200 disabled:opacity-70"
                      >
                        <ImagePlus className="w-4 h-4" />
                        Вставити з буфера
                      </button>
                      <span className="text-xs text-slate-500">
                        або натисніть тут і Ctrl+V
                      </span>
                    </div>
                    {uploadingImage && (
                      <p className="text-sm text-slate-500 mt-1">Завантаження…</p>
                    )}
                    {imageError && (
                      <p className="text-sm text-red-600 mt-1">{imageError}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Файл або вставка з буфера. Зображення зберігаються в Airtable (~70 КБ макс).
                    </p>
                  </div>
                )}
              </div>
              {draft.type === "short_answer" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Правильна відповідь
                  </label>
                  <input
                    type="text"
                    value={(draft as ShortAnswerQuestion).correctAnswer}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        correctAnswer: e.target.value,
                      } as ShortAnswerQuestion)
                    }
                    className="w-full max-w-md px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Наприклад: 42 або 3,14"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Числа порівнюються з допуском; кому можна заміняти крапкою.
                  </p>
                </div>
              )}
              {draft.type === "multiple" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Варіанти відповіді (позначте правильну, можна додати фото до варіанту)
                  </label>
                  {(draft as MultipleChoiceQuestion).options.map((opt, i) => {
                    const m = draft as MultipleChoiceQuestion;
                    const optUrls = m.option_image_urls ?? [];
                    const optImg = optUrls[i];
                    return (
                      <div key={i} className="mb-4 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correct"
                            checked={m.correctIndex === i}
                            onChange={() =>
                              setDraft({ ...draft, correctIndex: i } as MultipleChoiceQuestion)
                            }
                            className="text-indigo-600"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const opts = [...m.options];
                              opts[i] = e.target.value;
                              setDraft({ ...draft, options: opts } as MultipleChoiceQuestion);
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300"
                            placeholder={`Варіант ${i + 1}`}
                          />
                        </div>
                        <div className="ml-6 pl-1">
                          {optImg ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="rounded-lg border border-slate-200 overflow-hidden max-w-[120px] max-h-20">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={optImg}
                                  alt={`Варіант ${i + 1}`}
                                  className="w-full h-full object-contain bg-slate-50"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...(m.option_image_urls ?? [])];
                                  while (next.length <= i) next.push(undefined);
                                  next[i] = undefined;
                                  setDraft({
                                    ...draft,
                                    option_image_urls: next,
                                  } as MultipleChoiceQuestion);
                                }}
                                className="text-sm text-red-600 hover:underline"
                              >
                                Видалити фото
                              </button>
                            </div>
                          ) : (
                            <div
                              className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-2 inline-block focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400"
                              tabIndex={0}
                              onPaste={async (e) => {
                                const file = e.clipboardData?.files?.[0];
                                if (!file?.type.startsWith("image/")) return;
                                e.preventDefault();
                                setImageError(null);
                                setUploadingOptionIndex(i);
                                try {
                                  const url = await processImageBlob(file);
                                  const m2 = draft as MultipleChoiceQuestion;
                                  const next = [...(m2.option_image_urls ?? [])];
                                  while (next.length <= i) next.push(undefined);
                                  next[i] = url;
                                  setDraft({
                                    ...draft,
                                    option_image_urls: next,
                                  } as MultipleChoiceQuestion);
                                } catch (err) {
                                  setImageError(err instanceof Error ? err.message : "Помилка вставки");
                                } finally {
                                  setUploadingOptionIndex(null);
                                }
                              }}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploadingOptionIndex !== null}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setImageError(null);
                                  setUploadingOptionIndex(i);
                                  try {
                                    const url = await processImageBlob(file);
                                    const m2 = draft as MultipleChoiceQuestion;
                                    const next = [...(m2.option_image_urls ?? [])];
                                    while (next.length <= i) next.push(undefined);
                                    next[i] = url;
                                    setDraft({
                                      ...draft,
                                      option_image_urls: next,
                                    } as MultipleChoiceQuestion);
                                  } catch (err) {
                                    setImageError(err instanceof Error ? err.message : "Помилка завантаження");
                                  } finally {
                                    setUploadingOptionIndex(null);
                                    e.target.value = "";
                                  }
                                }}
                                className="block text-sm text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-indigo-100 file:text-indigo-800"
                              />
                              <button
                                type="button"
                                disabled={uploadingOptionIndex !== null}
                                onClick={async () => {
                                  try {
                                    const items = await navigator.clipboard.read();
                                    for (const item of items) {
                                      const blob = await getImageFromClipboardItem(item);
                                      if (blob) {
                                        setImageError(null);
                                        setUploadingOptionIndex(i);
                                        try {
                                          const url = await processImageBlob(blob);
                                          const m2 = draft as MultipleChoiceQuestion;
                                          const next = [...(m2.option_image_urls ?? [])];
                                          while (next.length <= i) next.push(undefined);
                                          next[i] = url;
                                          setDraft({
                                            ...draft,
                                            option_image_urls: next,
                                          } as MultipleChoiceQuestion);
                                        } finally {
                                          setUploadingOptionIndex(null);
                                        }
                                        return;
                                      }
                                    }
                                    setImageError("У буфері немає зображення");
                                  } catch (err) {
                                    setImageError(err instanceof Error ? err.message : "Немає доступу до буфера");
                                  }
                                }}
                                className="inline-flex items-center gap-1 mt-1 px-2 py-1 rounded bg-indigo-100 text-indigo-800 text-xs font-medium hover:bg-indigo-200 disabled:opacity-70"
                              >
                                <ImagePlus className="w-3.5 h-3.5" />
                                Вставити з буфера
                              </button>
                              {uploadingOptionIndex === i && (
                                <p className="text-xs text-slate-500 mt-0.5">Завантаження…</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      const m = draft as MultipleChoiceQuestion;
                      const opts = m.options;
                      if (opts.length < 10) {
                        const urls = m.option_image_urls ?? [];
                        setDraft({
                          ...draft,
                          options: [...opts, ""],
                          option_image_urls: [...urls, undefined],
                        } as MultipleChoiceQuestion);
                      }
                    }}
                    className="text-sm text-indigo-600 hover:underline mt-1"
                  >
                    + Додати варіант
                  </button>
                </div>
              )}
              {draft.type === "matching" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Пари (лівий стовпчик — правий)
                  </label>
                  {(draft as MatchingQuestion).pairs.map((pair, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={pair.left}
                        onChange={(e) => {
                          const pairs = (draft as MatchingQuestion).pairs.map(
                            (p, j) => (j === i ? { ...p, left: e.target.value } : p)
                          );
                          setDraft({ ...draft, pairs } as MatchingQuestion);
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300"
                        placeholder="Лівий елемент"
                      />
                      <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={pair.right}
                        onChange={(e) => {
                          const pairs = (draft as MatchingQuestion).pairs.map(
                            (p, j) => (j === i ? { ...p, right: e.target.value } : p)
                          );
                          setDraft({ ...draft, pairs } as MatchingQuestion);
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300"
                        placeholder="Правий елемент"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({
                        ...draft,
                        pairs: [...(draft as MatchingQuestion).pairs, { left: "", right: "" }],
                      } as MatchingQuestion);
                    }}
                    className="text-sm text-indigo-600 hover:underline mt-1"
                  >
                    + Додати пару
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-medium shadow-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? "Збереження…" : "Зберегти"}
              </button>
              <button
                type="button"
                onClick={() => { setEdit(null); setDraft(null); }}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium"
              >
                <X className="w-4 h-4" />
                Скасувати
              </button>
            </div>
          </div>
        )}

        {questions.length > 0 && !draft && (
          <div className="mt-6">
            <button
              type="button"
              onClick={handleSaveBank}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium shadow-sm"
            >
              Зберегти зміни
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
