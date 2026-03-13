import type { TestResult } from "@/types";
import { createClient } from "./client";

export async function getResultsFromSupabase(): Promise<TestResult[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("results")
    .select("*")
    .order("date", { ascending: false });
  if (error) return [];
  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    invitation: row.invitation,
    grade: row.grade,
    date: row.date,
    subjects: row.subjects || {},
    answerDetails: row.answer_details ?? undefined,
  })) as TestResult[];
}

export async function saveResultToSupabase(result: Omit<TestResult, "id">): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  await supabase.from("results").insert({
    name: result.name,
    invitation: result.invitation,
    grade: result.grade,
    date: result.date,
    subjects: result.subjects,
    ...(result.answerDetails && { answer_details: result.answerDetails }),
  });
}

export async function deleteResultFromSupabase(id: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from("results").delete().eq("id", id);
}

export async function clearAllResultsFromSupabase(): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from("results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}
