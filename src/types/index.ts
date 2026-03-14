/** 8, 9, 10, 11 клас */
export type Grade = 8 | 9 | 10 | 11;

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
  /** Вага питання (балів за правильну відповідь), за замовчуванням 1 */
  weight?: number;
  /** URL фото до питання (Supabase Storage або зовнішнє) */
  image_url?: string;
  /** URL фото до варіантів відповіді (індекс = options), опційно для кожного варіанту */
  option_image_urls?: (string | undefined)[];
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
  /** Вага питання (балів за правильну відповідь), за замовчуванням 1 */
  weight?: number;
}

/** Своя відповідь: учень вводить число або текст, порівняння з правильним варіантом */
export interface ShortAnswerQuestion {
  type: "short_answer";
  id: string;
  question: string;
  /** Правильна відповідь (число або текст для порівняння) */
  correctAnswer: string;
  /** Вага питання (балів за правильну відповідь), за замовчуванням 1 */
  weight?: number;
  image_url?: string;
}

export type Question = MultipleChoiceQuestion | MatchingQuestion | ShortAnswerQuestion;

export type QuestionBank = Record<Grade, Record<SubjectId, Question[]>>;

/** Результат по одному предмету */
export interface SubjectScore {
  score: number;
  total: number;
  correct: number;
}

/** Один пункт деталізації: питання та чи правильна відповідь */
export interface AnswerDetailItem {
  questionId: string;
  correct: boolean;
  /** Короткий текст питання для відображення вчителю */
  questionSnippet?: string;
}

/** Один запис = одна сесія тесту (обидва блоки, 4 предмети) */
export interface TestResult {
  id: string;
  name: string;
  invitation: string;
  grade: Grade;
  date: string;
  subjects: Record<SubjectId, SubjectScore>;
  /** По предметам — список питань і чи правильна відповідь (для деталізації в адмінці) */
  answerDetails?: Record<SubjectId, AnswerDetailItem[]>;
}

export interface AnswerState {
  questionId: string;
  type: "multiple" | "matching" | "short_answer";
  value: number | number[] | string;
  correct: boolean;
}
