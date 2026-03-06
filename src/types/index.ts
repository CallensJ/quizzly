// src/types/index.ts

export type AgeGroup = '6-9' | '10-13';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Category = 'science' | 'history';
export type Locale = 'en' | 'fr';

export interface Profile {
  pseudo: string;
  ageGroup: AgeGroup;
  avatarId: string;
  badgeEarned: boolean;
  locale: Locale;
  createdAt: string;
}

export interface QuizSession {
  category: Category;
  difficulty: Difficulty;
  score: number;
  totalQuestions: number;
  playedAt: string;
}

export interface Question {
  id: number;
  difficulty: Difficulty;
  text: string;
  answers: string[];
  correctIndex: number;
}

export interface QuestionFile {
  category: Category;
  language: Locale;
  questions: Question[];
}
