export type Difficulty = "medium" | "hard";
export type QuestionType = "technical" | "non-technical" | "followup" | "mood-triggered";

export interface Question {
  id: string;
  question: string;
  category: "technical" | "non-technical" | "followup";
  difficulty?: Difficulty;
  answer?: string;
  parentQuestion?: string;
  topicId?: string; // Used to track related questions across queues
}

export interface ConversationItem {
  role: "assistant" | "user";
  content: string;
  question?: Question | null;
  timestamp?: Date;
}

export interface InterviewConfig {
  duration: number;
  mode: "live" | "async";
  language: string;
  useVideoProcessing?: boolean;
}

// Queue 0: Video Input Queue
export interface VideoInputQueue {
  use_video_processing: boolean;
  violation_count: number;
  mood_state: string;
  logs: VideoLog[];
}

export interface VideoLog {
  timestamp: Date;
  mood?: string;
  gesture?: string;
  objects?: string[];
  violationType?: string;
}

// Complete queue structure
export interface Queues {
  queue0?: VideoInputQueue; // Optional, only if video processing enabled
  queue1: Question[]; // Base questions
  queue2: Question[]; // Technical depth (medium/hard)
  queue3: Question[]; // Follow-ups
}

// Data model for each asked question entry
export interface QuestionEntry {
  question_text: string;
  user_answer: string;
  ideal_answer?: string;
  correctness_score?: number; // 0-100
  source_urls?: string[];
  question_type: QuestionType;
  queue_number: 0 | 1 | 2 | 3;
  timestamp: Date;
  // Queue 0 specific fields
  mood_state?: string;
  violation_snapshot?: {
    violation_count: number;
    current_violations: string[];
  };
}

export interface EngineStats {
  questionsAsked: number;
  queue0Active: boolean;
  queue1Size: number;
  queue2Size: number;
  queue3Size: number;
  violationCount: number;
  interviewEnded: boolean;
  // Chunking stats
  currentChunk?: number;
  totalChunks?: number;
  chunksPreprocessed?: number;
  preprocessingInProgress?: boolean;
}

export interface EngineAdapter {
  getConfig: (interviewId: string) => Promise<{ success: boolean; config?: any; error?: string }>;
  startEvaluation: (interviewId: string) => Promise<{ success: boolean; evaluationId?: string }>;
  analyze: (
    question: string,
    correctAnswer: string,
    userAnswer: string,
    queues: Queues,
    currentQuestion: Question,
    interviewId: string
  ) => Promise<{ updatedQueues?: Queues; correctness?: number }>;
  persistQA: (
    interviewId: string,
    entry: QuestionEntry
  ) => Promise<{ success: boolean }>;
  checkVideoViolations?: (interviewId: string) => Promise<{ 
    violation_count: number; 
    mood_state: string; 
    should_end: boolean;
    mood_changed: boolean;
  }>;
}


