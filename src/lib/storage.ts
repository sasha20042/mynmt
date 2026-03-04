import type { TestResult } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getResultsFromSupabase,
  saveResultToSupabase,
  deleteResultFromSupabase,
  clearAllResultsFromSupabase,
} from "@/lib/supabase/results";

const STORAGE_KEY = "nmt_results";

export async function getStoredResults(): Promise<TestResult[]> {
  if (isSupabaseConfigured()) return getResultsFromSupabase();
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveResult(result: Omit<TestResult, "id">): Promise<void> {
  if (isSupabaseConfigured()) return saveResultToSupabase(result);
  const list = await getStoredResults();
  const withId: TestResult = {
    ...result,
    id: crypto.randomUUID(),
  };
  list.push(withId);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export async function deleteResult(id: string): Promise<void> {
  if (isSupabaseConfigured()) return deleteResultFromSupabase(id);
  const list = (await getStoredResults()).filter((r) => r.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export async function clearAllResults(): Promise<void> {
  if (isSupabaseConfigured()) return clearAllResultsFromSupabase();
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, "[]");
  }
}
