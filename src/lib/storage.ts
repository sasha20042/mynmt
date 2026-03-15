import type { TestResult } from "@/types";
import { generateId } from "@/lib/uuid";

const STORAGE_KEY = "nmt_results";

function useAirtable(): boolean {
  return typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_AIRTABLE === "true";
}

export async function getStoredResults(): Promise<TestResult[]> {
  if (useAirtable()) {
    try {
      const res = await fetch("/api/results");
      const data = await res.json();
      if (res.ok && Array.isArray(data.results)) return data.results;
      return [];
    } catch {
      return [];
    }
  }
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
  const payload: TestResult = {
    ...result,
    id: generateId(),
  };
  if (useAirtable()) {
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch (e) {
      console.error(e);
    }
    return;
  }
  const list = await getStoredResults();
  list.push(payload);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export async function deleteResult(id: string): Promise<void> {
  if (useAirtable()) {
    try {
      const res = await fetch(`/api/results/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    } catch (e) {
      console.error(e);
    }
    return;
  }
  const list = (await getStoredResults()).filter((r) => r.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export async function clearAllResults(): Promise<void> {
  if (useAirtable()) {
    try {
      const res = await fetch("/api/results", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear");
    } catch (e) {
      console.error(e);
    }
    return;
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, "[]");
  }
}
