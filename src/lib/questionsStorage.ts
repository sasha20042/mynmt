import type { QuestionBank, Grade, SubjectId, Question } from "@/types";
import { grades, subjectIds } from "@/constants/questions";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getQuestionBankFromSupabase,
  saveQuestionsForSubjectToSupabase,
  getQuestionsForBlockFromSupabase,
} from "@/lib/supabase/questions";

const STORAGE_KEY = "nmt_questions";

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

function getQuestionBankLocal(): QuestionBank {
  if (typeof window === "undefined") return emptyBank();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyBank();
    const parsed = JSON.parse(raw) as QuestionBank;
    const bank = emptyBank();
    for (const g of grades) {
      for (const s of subjectIds) {
        const list = parsed[g]?.[s];
        bank[g][s] = Array.isArray(list) ? list : [];
      }
    }
    return bank;
  } catch {
    return emptyBank();
  }
}

export async function getQuestionBank(): Promise<QuestionBank> {
  if (isSupabaseConfigured()) return getQuestionBankFromSupabase();
  return Promise.resolve(getQuestionBankLocal());
}

export function saveQuestionsForSubject(
  grade: Grade,
  subject: SubjectId,
  questions: Question[]
): Promise<void> {
  if (isSupabaseConfigured()) return saveQuestionsForSubjectToSupabase(grade, subject, questions);
  if (typeof window === "undefined") return Promise.resolve();
  const bank = getQuestionBankLocal();
  bank[grade][subject] = questions;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bank));
  return Promise.resolve();
}

export async function getQuestionsForBlock(
  grade: Grade,
  block: 1 | 2
): Promise<{ subject: SubjectId; question: Question; index: number }[]> {
  if (isSupabaseConfigured()) return getQuestionsForBlockFromSupabase(grade, block);
  const bank = getQuestionBankLocal();
  const subjects: SubjectId[] = block === 1 ? ["ukrainian", "math"] : ["history", "english"];
  const out: { subject: SubjectId; question: Question; index: number }[] = [];
  for (const s of subjects) {
    const list = bank[grade]?.[s] ?? [];
    list.forEach((q, i) => out.push({ subject: s as SubjectId, question: q, index: i }));
  }
  return out;
}
