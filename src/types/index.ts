/** 8 клас, 9 клас, 10-11 клас */
export type Grade = 8 | 9 | 10;

export type SubjectId = "math" | "history" | "ukrainian" | "english";

/** Блок 1: українська + математика; Блок 2: історія + англійська */
export type BlockId = 1 | 2;

export interface SubjectOption {
  id: SubjectId;
  label: string;
  icon: string;
}

/** Множинний вибір: одна правильна відповідь з 4 або 5 варіантів */
export interface MultipleChoiceQuestion {
  type: "multiple";
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  /** URL фото до питання (Supabase Storage або зовнішнє) */
  image_url?: string;
}

export interface MatchingPair {
  left: string;
  right: string;
}

export interface MatchingQuestion {
  type: "matching";
  id: string;
  question: string;
  pairs: MatchingPair[];
  /** URL фото до питання (Supabase Storage або зовнішнє) */
  image_url?: string;
}

export type Question = MultipleChoiceQuestion | MatchingQuestion;

export type QuestionBank = Record<Grade, Record<SubjectId, Question[]>>;

/** Результат по одному предмету */
export interface SubjectScore {
  score: number;
  total: number;
  correct: number;
}

/** Один запис = одна сесія тесту (обидва блоки, 4 предмети) */
export interface TestResult {
  id: string;
  name: string;
  invitation: string;
  grade: Grade;
  date: string;
  subjects: Record<SubjectId, SubjectScore>;
}

export interface AnswerState {
  questionId: string;
  type: "multiple" | "matching";
  value: number | number[];
  correct: boolean;
}
