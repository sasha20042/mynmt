import type {
  QuestionBank,
  Grade,
  SubjectId,
  Question,
  MultipleChoiceQuestion,
  MatchingQuestion,
  TestResult,
} from "@/types";
import { grades, subjectIds } from "@/constants/questions";

const BASE_ID = process.env.AIRTABLE_BASE_ID;
const API_KEY = process.env.AIRTABLE_API_KEY;
const QUESTIONS_TABLE = process.env.AIRTABLE_QUESTIONS_TABLE || "Questions";
const RESULTS_TABLE = process.env.AIRTABLE_RESULTS_TABLE || "Results";

export function isAirtableConfigured() {
  return !!(BASE_ID && API_KEY);
}

type AirtableRecord<T> = { id: string; fields: T };

interface AirtableQuestionFields {
  Grade?: number;
  Subject?: string;
  SortOrder?: number;
  Type?: string;
  Question?: string;
  Options?: string;
  CorrectIndex?: number;
  Pairs?: string;
  Image?: { url: string }[];
  /** JSON array of image URLs for options (same order as Options) */
  OptionImages?: string;
}

function recordToQuestion(record: AirtableRecord<AirtableQuestionFields>): Question {
  const f = record.fields;
  const imageUrl = f.Image?.[0]?.url;
  if (f.Type === "multiple") {
    const options = f.Options ? JSON.parse(f.Options) : [];
    const q: MultipleChoiceQuestion = {
      type: "multiple",
      id: record.id,
      question: f.Question || "",
      options,
      correctIndex: f.CorrectIndex ?? 0,
    };
    if (imageUrl) q.image_url = imageUrl;
    if (f.OptionImages) {
      try {
        const arr = JSON.parse(f.OptionImages) as (string | null | undefined)[];
        if (Array.isArray(arr)) q.option_image_urls = arr.map((u) => u || undefined);
      } catch {
        /* ignore */
      }
    }
    return q;
  }
  const q: MatchingQuestion = {
    type: "matching",
    id: record.id,
    question: f.Question || "",
    pairs: f.Pairs ? JSON.parse(f.Pairs) : [],
  };
  if (imageUrl) q.image_url = imageUrl;
  return q;
}

export async function fetchQuestionBank(): Promise<QuestionBank> {
  if (!isAirtableConfigured()) return emptyBank();
  const bank = emptyBank();
  let offset: string | undefined;
  do {
    const url = offset
      ? `https://api.airtable.com/v0/${BASE_ID}/${QUESTIONS_TABLE}?offset=${offset}`
      : `https://api.airtable.com/v0/${BASE_ID}/${QUESTIONS_TABLE}?sort[0][field]=SortOrder&sort[0][direction]=asc`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    }).then((r) => r.json());
    if (res.error) return emptyBank();
    if (res.records) {
      for (const rec of res.records) {
        const g = rec.fields?.Grade as Grade | undefined;
        const s = rec.fields?.Subject as SubjectId | undefined;
        if (g != null && s && grades.includes(g) && subjectIds.includes(s)) {
          if (!bank[g][s]) bank[g][s] = [];
          bank[g][s].push(recordToQuestion(rec));
        }
      }
    }
    offset = res.offset;
  } while (offset);
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

function questionToFields(
  q: Question,
  grade: number,
  subject: string,
  sortOrder: number
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    Grade: grade,
    Subject: subject,
    SortOrder: sortOrder,
    Type: q.type,
    Question: q.question,
  };
  if (q.type === "multiple") {
    const m = q as MultipleChoiceQuestion;
    fields.Options = JSON.stringify(m.options);
    fields.CorrectIndex = m.correctIndex;
    fields.Pairs = null;
    if (m.option_image_urls?.length) {
      fields.OptionImages = JSON.stringify(m.option_image_urls);
    }
  } else {
    const mat = q as MatchingQuestion;
    fields.Options = null;
    fields.CorrectIndex = null;
    fields.Pairs = JSON.stringify(mat.pairs);
  }
  const imgUrl = (q as Question & { image_url?: string }).image_url;
  if (imgUrl) fields.Image = [{ url: imgUrl }];
  return fields;
}

export async function replaceQuestionsForSubject(
  grade: number,
  subject: string,
  questions: Question[]
): Promise<void> {
  if (!isAirtableConfigured()) return;
  const listUrl = `https://api.airtable.com/v0/${BASE_ID}/${QUESTIONS_TABLE}?filterByFormula=AND({Grade}=${grade}, {Subject}='${subject}')`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  }).then((r) => r.json());
  if (listRes.records?.length) {
    for (const rec of listRes.records) {
      await fetch(`https://api.airtable.com/v0/${BASE_ID}/${QUESTIONS_TABLE}/${rec.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
    }
  }
  for (let i = 0; i < questions.length; i++) {
    const fields = questionToFields(questions[i], grade, subject, i);
    await fetch(`https://api.airtable.com/v0/${BASE_ID}/${QUESTIONS_TABLE}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });
  }
}

interface AirtableResultFields {
  Name?: string;
  Invitation?: string;
  Grade?: number;
  Date?: string;
  Subjects?: string;
  AnswerDetails?: string;
}

export async function fetchAllResults(): Promise<TestResult[]> {
  if (!isAirtableConfigured()) return [];
  const url = `https://api.airtable.com/v0/${BASE_ID}/${RESULTS_TABLE}?sort[0][field]=Date&sort[0][direction]=desc`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  }).then((r) => r.json());
  if (res.error || !res.records) return [];
  return res.records.map((rec: AirtableRecord<AirtableResultFields>) => {
    const r: TestResult = {
      id: rec.id,
      name: rec.fields.Name ?? "",
      invitation: rec.fields.Invitation ?? "",
      grade: (rec.fields.Grade ?? 9) as Grade,
      date: rec.fields.Date ?? new Date().toISOString(),
      subjects: rec.fields.Subjects ? JSON.parse(rec.fields.Subjects) : {},
    };
    if (rec.fields.AnswerDetails) {
      try {
        r.answerDetails = JSON.parse(rec.fields.AnswerDetails);
      } catch {}
    }
    return r;
  });
}

export async function createResult(result: Omit<TestResult, "id">): Promise<void> {
  if (!isAirtableConfigured()) return;
  const fields: Record<string, unknown> = {
    Name: result.name,
    Invitation: result.invitation,
    Grade: result.grade,
    Date: result.date,
    Subjects: JSON.stringify(result.subjects),
  };
  if (result.answerDetails && Object.keys(result.answerDetails).length > 0) {
    fields.AnswerDetails = JSON.stringify(result.answerDetails);
  }
  await fetch(`https://api.airtable.com/v0/${BASE_ID}/${RESULTS_TABLE}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
}

export async function deleteResultById(id: string): Promise<void> {
  if (!isAirtableConfigured()) return;
  await fetch(`https://api.airtable.com/v0/${BASE_ID}/${RESULTS_TABLE}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
}

export async function clearAllResults(): Promise<void> {
  if (!isAirtableConfigured()) return;
  const list = await fetchAllResults();
  for (const r of list) await deleteResultById(r.id);
}
