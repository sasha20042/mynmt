import { NextResponse } from "next/server";
import { fetchQuestionBank, replaceQuestionsForSubject, isAirtableConfigured } from "@/lib/airtable/server";
import type { Grade, SubjectId } from "@/types";

export async function GET() {
  if (!isAirtableConfigured()) {
    return NextResponse.json({ bank: null }, { status: 200 });
  }
  try {
    const bank = await fetchQuestionBank();
    return NextResponse.json({ bank });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAirtableConfigured()) {
    return NextResponse.json({ error: "Airtable not configured" }, { status: 501 });
  }
  try {
    const body = await request.json();
    const { grade, subject, questions } = body as {
      grade: Grade;
      subject: SubjectId;
      questions: import("@/types").Question[];
    };
    if (grade == null || !subject || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Invalid body: grade, subject, questions required" }, { status: 400 });
    }
    await replaceQuestionsForSubject(grade, subject, questions);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Failed to save questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
