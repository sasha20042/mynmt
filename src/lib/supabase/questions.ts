import type { QuestionBank, Grade, SubjectId, Question, MultipleChoiceQuestion, MatchingQuestion } from "@/types";
import { grades, subjectIds } from "@/constants/questions";
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
}): Question {
  if (row.type === "multiple") {
    return {
      type: "multiple",
      id: row.id,
      question: row.question,
      options: row.options || [],
      correctIndex: row.correct_index ?? 0,
      ...(row.image_url && { image_url: row.image_url }),
    } as MultipleChoiceQuestion;
  }
  return {
    type: "matching",
    id: row.id,
    question: row.question,
    pairs: row.pairs || [],
    ...(row.image_url && { image_url: row.image_url }),
  } as MatchingQuestion;
}

function questionToRow(q: Question, grade: Grade, subject: SubjectId, sortOrder: number) {
  const base = {
    grade,
    subject,
    sort_order: sortOrder,
    type: q.type,
    question: q.question,
    image_url: (q as Question & { image_url?: string }).image_url ?? null,
  };
  if (q.type === "multiple") {
    return {
      ...base,
      id: q.id,
      options: (q as MultipleChoiceQuestion).options,
      correct_index: (q as MultipleChoiceQuestion).correctIndex,
      pairs: null,
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
  const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}
