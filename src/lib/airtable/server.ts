import type {
  QuestionBank,
  Grade,
  SubjectId,
  Question,
  MultipleChoiceQuestion,
  MatchingQuestion,
  ShortAnswerQuestion,
  MultipleCorrectQuestion,
  TestResult,
} from "@/types";
import { grades, subjectIds } from "@/constants/questions";

const BASE_ID = process.env.AIRTABLE_BASE_ID;
const API_KEY = process.env.AIRTABLE_API_KEY;
const QUESTIONS_TABLE = process.env.AIRTABLE_QUESTIONS_TABLE || "Questions";
const RESULTS_TABLE = process.env.AIRTABLE_RESULTS_TABLE || "Results";
const IMAGE_STORAGE_TABLE = process.env.AIRTABLE_IMAGE_STORAGE_TABLE || "ImageStorage";

/** Макс довжина base64 в Airtable Long text (~100K) */
const MAX_IMAGE_BASE64_LENGTH = 98_000;

export function isAirtableConfigured() {
  return !!(BASE_ID && API_KEY);
}

/** Зберігає зображення в Airtable (таблиця ImageStorage, поля Content + Type). Повертає record id. */
export async function createImageRecord(contentBase64: string, mimeType: string): Promise<string> {
  if (!isAirtableConfigured() || contentBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new Error("Airtable not configured or image too large");
  }
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${IMAGE_STORAGE_TABLE}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        Content: contentBase64,
        Type: mimeType || "image/png",
      },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Failed to store image");
  return data.id;
}

/** Читає зображення з Airtable за record id */
export async function getImageRecord(
  id: string
): Promise<{ content: string; mimeType: string }> {
  if (!isAirtableConfigured()) throw new Error("Airtable not configured");
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${IMAGE_STORAGE_TABLE}/${id}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Failed to get image");
  const content = data.fields?.Content as string | undefined;
  const mimeType = (data.fields?.Type as string) || "image/png";
  if (!content) throw new Error("Image not found");
  return { content, mimeType };
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
  /** Для типу multiple_correct — масив індексів правильних варіантів (JSON) */
  CorrectIndices?: string;
  Pairs?: string;
  /** Для типу short_answer — правильна відповідь (число або текст) */
  CorrectAnswer?: string;
  Image?: { url: string }[];
  OptionImages?: string;
  Weight?: number;
  /** Масштаб зображення в тесті (1 = 100%) */
  ImageScale?: number;
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
    if (typeof f.Weight === "number" && !Number.isNaN(f.Weight)) {
      q.weight = f.Weight;
    }
    if (f.OptionImages) {
      try {
        const arr = JSON.parse(f.OptionImages) as (string | null | undefined)[];
        if (Array.isArray(arr)) q.option_image_urls = arr.map((u) => u || undefined);
      } catch {
        /* ignore */
      }
    }
    if (typeof f.ImageScale === "number" && f.ImageScale > 0) q.image_scale = f.ImageScale;
    return q;
  }
  if (f.Type === "multiple_correct") {
    const options = f.Options ? JSON.parse(f.Options) : [];
    let correctIndices: number[] = [];
    if (f.CorrectIndices) {
      try {
        const arr = JSON.parse(f.CorrectIndices) as number[];
        if (Array.isArray(arr)) correctIndices = arr.filter((i) => typeof i === "number" && i >= 0 && i < options.length).sort((a, b) => a - b);
      } catch {
        /* ignore */
      }
    }
    const q: MultipleCorrectQuestion = {
      type: "multiple_correct",
      id: record.id,
      question: f.Question || "",
      options,
      correctIndices,
    };
    if (imageUrl) q.image_url = imageUrl;
    if (typeof f.Weight === "number" && !Number.isNaN(f.Weight)) q.weight = f.Weight;
    if (f.OptionImages) {
      try {
        const arr = JSON.parse(f.OptionImages) as (string | null | undefined)[];
        if (Array.isArray(arr)) q.option_image_urls = arr.map((u) => u || undefined);
      } catch {
        /* ignore */
      }
    }
    if (typeof f.ImageScale === "number" && f.ImageScale > 0) q.image_scale = f.ImageScale;
    return q;
  }
  if (f.Type === "short_answer") {
    const q: ShortAnswerQuestion = {
      type: "short_answer",
      id: record.id,
      question: f.Question || "",
      correctAnswer: String(f.CorrectAnswer ?? "").trim(),
    };
    if (imageUrl) q.image_url = imageUrl;
    if (typeof f.Weight === "number" && !Number.isNaN(f.Weight)) {
      q.weight = f.Weight;
    }
    if (typeof f.ImageScale === "number" && f.ImageScale > 0) q.image_scale = f.ImageScale;
    return q;
  }
  const pairsRaw = f.Pairs ? JSON.parse(f.Pairs) : [];
  const pairs = Array.isArray(pairsRaw)
    ? pairsRaw.map((p: { left?: string; right?: string; leftImageUrl?: string; rightImageUrl?: string }) => ({
        left: String(p?.left ?? ""),
        right: String(p?.right ?? ""),
        ...(p?.leftImageUrl && { leftImageUrl: p.leftImageUrl }),
        ...(p?.rightImageUrl && { rightImageUrl: p.rightImageUrl }),
      }))
    : [];
  const q: MatchingQuestion = {
    type: "matching",
    id: record.id,
    question: f.Question || "",
    pairs,
  };
  if (imageUrl) q.image_url = imageUrl;
  if (typeof f.Weight === "number" && !Number.isNaN(f.Weight)) {
    q.weight = f.Weight;
  }
  if (typeof f.ImageScale === "number" && f.ImageScale > 0) q.image_scale = f.ImageScale;
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
    fields.CorrectIndices = null;
    fields.Pairs = null;
    fields.CorrectAnswer = null;
    if (m.option_image_urls?.length) {
      fields.OptionImages = JSON.stringify(m.option_image_urls);
    }
    fields.Weight = (m as MultipleChoiceQuestion & { weight?: number }).weight ?? 1;
  } else if (q.type === "multiple_correct") {
    const m = q as MultipleCorrectQuestion;
    fields.Options = JSON.stringify(m.options);
    fields.CorrectIndex = null;
    fields.CorrectIndices = JSON.stringify(m.correctIndices.slice().sort((a, b) => a - b));
    fields.Pairs = null;
    fields.CorrectAnswer = null;
    if (m.option_image_urls?.length) {
      fields.OptionImages = JSON.stringify(m.option_image_urls);
    }
    fields.Weight = m.weight ?? 1;
  } else if (q.type === "short_answer") {
    const s = q as ShortAnswerQuestion;
    fields.Options = null;
    fields.CorrectIndex = null;
    fields.CorrectIndices = null;
    fields.Pairs = null;
    fields.CorrectAnswer = s.correctAnswer;
    fields.Weight = s.weight ?? 1;
  } else {
    const mat = q as MatchingQuestion;
    fields.Options = null;
    fields.CorrectIndex = null;
    fields.CorrectIndices = null;
    fields.Pairs = JSON.stringify(mat.pairs);
    fields.CorrectAnswer = null;
    fields.Weight = (mat as MatchingQuestion & { weight?: number }).weight ?? 1;
  }
  const imgUrl = (q as Question & { image_url?: string }).image_url;
  if (imgUrl) fields.Image = [{ url: imgUrl }];
  const scale = (q as Question & { image_scale?: number }).image_scale;
  if (typeof scale === "number" && scale > 0) fields.ImageScale = scale;
  return fields;
}

export async function replaceQuestionsForSubject(
  grade: number,
  subject: string,
  questions: Question[]
): Promise<void> {
  if (!isAirtableConfigured()) {
    throw new Error("Airtable not configured (AIRTABLE_BASE_ID, AIRTABLE_API_KEY)");
  }
  const listUrl = `https://api.airtable.com/v0/${BASE_ID}/${QUESTIONS_TABLE}?filterByFormula=AND({Grade}=${grade}, {Subject}='${subject}')`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  }).then((r) => r.json());
  if (listRes.error) {
    throw new Error(listRes.error.message || "Airtable: failed to list questions");
  }
  if (listRes.records?.length) {
    for (const rec of listRes.records) {
      const delRes = await fetch(
        `https://api.airtable.com/v0/${BASE_ID}/${QUESTIONS_TABLE}/${rec.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${API_KEY}` } }
      );
      if (!delRes.ok) {
        const err = await delRes.json().catch(() => ({}));
        throw new Error(err.error?.message || `Airtable: delete failed ${delRes.status}`);
      }
    }
  }
  for (let i = 0; i < questions.length; i++) {
    const fields = questionToFields(questions[i], grade, subject, i);
    const postRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${QUESTIONS_TABLE}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });
    if (!postRes.ok) {
      const err = await postRes.json().catch(() => ({}));
      throw new Error(
        err.error?.message || `Airtable: failed to create question (${postRes.status})`
      );
    }
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
