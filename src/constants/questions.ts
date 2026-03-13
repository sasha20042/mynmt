import type { Grade, SubjectId } from "@/types";

export const grades: Grade[] = [8, 9, 10, 11];

export const gradeLabels: Record<Grade, string> = {
  8: "8 клас",
  9: "9 клас",
  10: "10 клас",
  11: "11 клас",
};

export const subjectIds: SubjectId[] = ["ukrainian", "math", "history", "english"];

export const subjectLabels: Record<SubjectId, string> = {
  ukrainian: "Українська мова",
  math: "Математика",
  history: "Історія України",
  english: "Англійська мова",
};

/** Блок 1: українська мова та математика. Блок 2: історія та англійська. */
export const blockSubjects: Record<1 | 2, SubjectId[]> = {
  1: ["ukrainian", "math"],
  2: ["history", "english"],
};

/** 1 година на блок (у межах блоку час розподіляється між предметами) */
export const TIME_PER_BLOCK_SEC = 60 * 60;
