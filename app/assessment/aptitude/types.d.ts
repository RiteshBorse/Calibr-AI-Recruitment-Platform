import { Types } from 'mongoose';


export interface Question {
  id: number | string;
  question: string;
  options: string[];
  correctAnswer: number;
  section: 'A' | 'B' | 'C' | 'D';
  
}

export interface TestSession {
  _id: string;
  questionIds: (number | string)[];
  status: 'inactive' | 'active' | 'completed';
  currentQuestionIndex: number;
  startTime?: Date;
  endTime?: Date;
  warnings: {
    fullscreen: number;
    tabSwitch: number;
    audio: number;
  };
  score?: number;
  resultId?: string;
}

export type Section = { 
  name: string; 
  questionIds: (number | string)[] 
};

export type Test = {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  questionIds: (number | string)[];
  startedAt?: Date | null;
  durationSec: number;
  sections: Section[];
  status: 'inactive' | 'active' | 'completed';
  currentQuestionIndex: number;
  warnings: {
    fullscreen: number;
    tabSwitch: number;
    audio: number;
  };
  score?: number;
  resultId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type Result = {
  _id?: Types.ObjectId;
  testId: Types.ObjectId;
  userId: Types.ObjectId;
  answers: Record<string, number>; // qid -> chosen option index
  score: number;
  timeTaken: number; // in seconds
  warnings: {
    fullscreen: number;
    tabSwitch: number;
    audio: number;
  };
  sectionScores: Record<string, { correct: number; total: number }>;
  completedAt: Date;
  passed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TestWithQuestions = Omit<Test, 'questionIds'> & {
  questions: Question[];
};

export type TestSession = {
  test: TestWithQuestions;
  currentQuestionIndex: number;
  remainingTime: number;
};

export type TestResult = {
  result: Omit<Result, 'testId'> & {
    test: Pick<Test, '_id' | 'startedAt' | 'durationSec'>;
  };
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  sectionWiseScore: Record<string, { correct: number; total: number }>;
};

export type StartTestResponse = {
  success: boolean;
  test?: TestWithQuestions;
  error?: string;
};

export type SubmitTestResponse = {
  success: boolean;
  result?: TestResult;
  error?: string;
};
