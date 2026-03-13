import { NextResponse } from "next/server";
import {
  fetchAllResults,
  createResult,
  clearAllResults,
  isAirtableConfigured,
} from "@/lib/airtable/server";
import type { TestResult } from "@/types";

export async function GET() {
  if (!isAirtableConfigured()) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
  try {
    const results = await fetchAllResults();
    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAirtableConfigured()) {
    return NextResponse.json({ error: "Airtable not configured" }, { status: 501 });
  }
  try {
    const result = (await request.json()) as Omit<TestResult, "id">;
    if (!result.name || result.grade == null || !result.subjects) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    await createResult(result);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save result" }, { status: 500 });
  }
}

export async function DELETE() {
  if (!isAirtableConfigured()) {
    return NextResponse.json({ error: "Airtable not configured" }, { status: 501 });
  }
  try {
    await clearAllResults();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to clear results" }, { status: 500 });
  }
}
