import type { QuestionBank, Grade, SubjectId, Question, MultipleChoiceQuestion, MatchingQuestion } from "@/types";
import { grades, subjectIds } from "@/constants/questions";
import { generateId } from "@/lib/uuid";
import { createClient } from "./client";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "question-images";

function rowToQuestion(row: {
  id: string;
  type: string;
  question: string;
  options: string[] | null;
  correct_index: number | null;
  pairs: { left: string; right: string }[] | null;
  image_url: string | null;
  option_image_urls?: (string | null)[] | null;
  weight?: number | null;
}): Question {
  if (row.type === "multiple") {
    const q: MultipleChoiceQuestion = {
      type: "multiple",
      id: row.id,
      question: row.question,
      options: row.options || [],
      correctIndex: row.correct_index ?? 0,
    };
    if (row.image_url) q.image_url = row.image_url;
    if (Array.isArray(row.option_image_urls)) {
      q.option_image_urls = row.option_image_urls.map((u) => u || undefined);
    }
    if (typeof row.weight === "number" && !Number.isNaN(row.weight)) {
      q.weight = row.weight;
    }
    return q;
  }
  const q: MatchingQuestion = {
    type: "matching",
    id: row.id,
    question: row.question,
    pairs: row.pairs || [],
  };
  if (row.image_url) q.image_url = row.image_url;
  if (typeof row.weight === "number" && !Number.isNaN(row.weight)) {
    q.weight = row.weight;
  }
  return q;
}

function questionToRow(q: Question, grade: Grade, subject: SubjectId, sortOrder: number) {
  const base = {
    grade,
    subject,
    sort_order: sortOrder,
    type: q.type,
    question: q.question,
    image_url: (q as Question & { image_url?: string }).image_url ?? null,
    weight: (q as Question & { weight?: number }).weight ?? 1,
  };
  if (q.type === "multiple") {
    const m = q as MultipleChoiceQuestion;
    return {
      ...base,
      id: q.id,
      options: m.options,
      correct_index: m.correctIndex,
      pairs: null,
      ...(m.option_image_urls?.length && { option_image_urls: m.option_image_urls }),
    };
  }
  return {
    ...base,
    id: q.id,
    options: null,
    correct_index: null,
    pairs: (q as MatchingQuestion).pairs,
  };
}

export async function getQuestionBankFromSupabase(): Promise<QuestionBank> {
  const supabase = createClient();
  if (!supabase) return emptyBank();

  const bank = emptyBank();
  for (const g of grades) {
    for (const s of subjectIds) {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("grade", g)
        .eq("subject", s)
        .order("sort_order", { ascending: true });
      if (error) continue;
      bank[g][s] = (data || []).map(rowToQuestion);
    }
  }
  return bank;
}

function emptyBank(): QuestionBank {
  const bank = {} as QuestionBank;
  for (const g of grades) {
    bank[g] = {} as Record<SubjectId, Question[]>;
    for (const s of subjectIds) {
      bank[g][s] = [];
    }
  }
  return bank;
}

export async function saveQuestionsForSubjectToSupabase(
  grade: Grade,
  subject: SubjectId,
  questions: Question[]
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  await supabase.from("questions").delete().eq("grade", grade).eq("subject", subject);

  if (questions.length === 0) return;

  const rows = questions.map((q, i) => questionToRow(q, grade, subject, i));
  await supabase.from("questions").insert(rows);
}

export async function getQuestionsForBlockFromSupabase(
  grade: Grade,
  block: 1 | 2
): Promise<{ subject: SubjectId; question: Question; index: number }[]> {
  const bank = await getQuestionBankFromSupabase();
  const subjects = block === 1 ? (["ukrainian", "math"] as const) : (["history", "english"] as const);
  const out: { subject: SubjectId; question: Question; index: number }[] = [];
  for (const s of subjects) {
    const list = bank[grade]?.[s] ?? [];
    list.forEach((q, i) => out.push({ subject: s, question: q, index: i }));
  }
  return out;
}

export async function uploadQuestionImage(file: File): Promise<string> {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase not configured");

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${generateId().slice(0, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}
