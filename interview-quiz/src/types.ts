export type QuestionType = "single" | "multiple" | "short" | "code";

export type Choice = {
  id: string;
  text: string;
};

export type Question = {
  id: string;
  moduleId: string;
  type: QuestionType;
  title: string;
  prompt: string;
  choices?: Choice[];
  correctAnswers?: string[];
  referenceAnswer: string;
  explanation: string;
  whyOthersWrong?: Record<string, string>;
  keyPoints: string[];
  interviewTips: string[];
  codeRefs?: string[];
};

export type QuizModule = {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  summary: string;
};

export type AnswerRecord = {
  selected: string[];
  draft: string;
  checked: boolean;
  correct: boolean;
};

export type StoredProgress = Record<string, AnswerRecord>;
