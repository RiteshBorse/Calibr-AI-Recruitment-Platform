/**
 * Base Types for Shared Interview Logic
 * Used by both Technical Interview and HR Interview
 * 
 * =============================================================================
 * QUEUE FLOW & PRIORITY SYSTEM
 * =============================================================================
 * 
 * Q0: VIDEO PROCESSING & INTERRUPTIONS (HIGHEST PRIORITY)
 * ────────────────────────────────────────────────────────
 * Flow:
 * 1. VideoProcessing component continuously monitors candidate via webcam
 * 2. Detects: mood changes (happy, sad, angry, anxious, etc.), violations (looking away, multiple people, etc.)
 * 3. Logs violations/mood data in database in real-time
 * 4. TechnicalInterviewClient (or HR client) calls action to retrieve recent logs
 * 5. If mood_changed || violations detected:
 *    - Send logs + current context to Gemini
 *    - Gemini crafts a contextual interruption question
 *    - Question added to Queue0 with category='interruption'
 * 6. Engine.askNext() checks Q0 FIRST (before Q1/Q3)
 * 7. If Q0 has questions, they're asked immediately (highest priority)
 * 8. If violations >= 3: Interview ends immediately
 * 
 * Question Category: 'interruption'
 * Trigger Types: 'mood-change' | 'violation-detected' | 'pause-detected'
 * 
 * Q1: MAIN QUESTIONS (PRIORITY 2)
 * ────────────────────────────────
 * - Base technical or non-technical questions
 * - Generated upfront for entire interview
 * - Asked sequentially unless Q0 interruptions or Q3 follow-ups take priority
 * 
 * Q2: DEPTH QUESTIONS (TECHNICAL ONLY - PRIORITY 3)
 * ──────────────────────────────────────────────────
 * - Medium & hard difficulty questions on same topic
 * - Generated upfront (same as Q1)
 * - NOT directly polled by engine
 * - Promoted to Q1 based on answer correctness:
 *   • Score >= 80% on base question → Medium promoted to Q1
 *   • Score >= 80% on medium → Hard promoted to Q1
 * - HR interviews have NO Queue2
 * 
 * Q3: FOLLOW-UP QUESTIONS (PRIORITY 2 - Same as Q1)
 * ──────────────────────────────────────────────────
 * - Generated dynamically during interview
 * - Based on: low answer scores (<10%), mood changes, follow-up prompts
 * - Asked with same priority as Q1 (engine checks Q3 before Q1 if Q0 empty)
 * 
 * ASKING ORDER:
 * 1. Check Queue0 first (interruptions, violations)
 *    → If violations >= 3: End interview
 *    → If interruption question: Ask it
 * 2. Check Queue3 (follow-ups have priority over main flow)
 * 3. Check Queue1 (main questions or promoted depth questions)
 * 4. If all empty: Interview ends
 * 
 * =============================================================================
 */

export type InterviewType = 'technical' | 'hr';
export type Difficulty = "medium" | "hard";
export type QuestionCategory = "technical" | "non-technical" | "followup" | "interruption";
export type QueueType = 'Q0' | 'Q1' | 'Q2' | 'Q3';

/**
 * Base Question Interface
 * Shared across all interview types
 * 
 * Category Types:
 * - 'technical': Technical questions about skills/knowledge
 * - 'non-technical': Behavioral/soft skills questions
 * - 'followup': Follow-ups based on answer quality
 * - 'interruption': Q0 questions triggered by mood changes or proctoring violations
 */
export interface BaseQuestion {
  id: string;
  question: string;
  category: QuestionCategory;
  difficulty?: Difficulty;
  answer?: string;
  parentQuestion?: string;
  topicId?: string;
  source_urls?: string[];
  // Q0 specific fields
  triggerType?: 'mood-change' | 'violation-detected' | 'pause-detected';
  moodState?: string; // Current mood that triggered this question
  violationType?: string; // Type of violation that triggered this
}

/**
 * Base Interview Configuration
 * Common settings for all interview types
 */
export interface BaseInterviewConfig {
  duration: number; // Duration in minutes
  mode: "live" | "async";
  language: string;
  difficulty: "junior" | "mid" | "senior";
  topics: string[];
  aiPrompt?: string;
  maxFollowUpsPerTopic?: number;
  recordingEnabled: boolean;
  consentRequired: boolean;
  proctoring: {
    cameraRequired: boolean;
    micRequired: boolean;
    screenShareRequired: boolean;
  };
  questionStyle: "structured" | "conversational";
  initialWarmupMinutes?: number;
  maxSilenceSeconds?: number;
  allowInterruptions: boolean;
  rubric: {
    passThreshold?: number;
    categories: { key: string; label: string; weight: number }[];
  };
  scheduledDate?: Date;
  startTime?: string;
  endTime?: string;
  status: "inactive" | "active" | "completed";
}

/**
 * Job Data Context
 * Used for personalized question generation
 */
export interface JobData {
  title: string;
  department: string;
  position: string;
  seniority: string;
  techStack: string[];
  description?: string;
  requirements?: string;
}

/**
 * Resume Data Context
 * Used for personalized question generation
 */
export interface ResumeData {
  tagline?: string;
  summary?: string;
  workDetails?: any[];
  education?: any[];
  skills?: string;
  projects?: any[];
  certificates?: any[];
}

/**
 * Base Queue Structure
 * 
 * Queue0: Video Processing / Interruptions (Highest Priority)
 * - Triggered by VideoProcessing component detecting mood changes or violations
 * - Violations/mood data stored in database in real-time
 * - Data sent to Gemini to craft context-aware interruption questions
 * - Questions marked as 'interruption' category
 * - HIGHEST priority - asked immediately when triggered
 * 
 * Queue1: Main Questions (Priority 2)
 * - Base technical/non-technical questions
 * - Asked in sequence unless Q0 or Q3 has priority questions
 * 
 * Queue2: Depth Questions (Optional - Technical Interviews Only)
 * - Medium & hard difficulty follow-ups
 * - Only promoted to Queue1 when candidate scores ≥80% on base question
 * - HR interviews skip this queue entirely
 * 
 * Queue3: Follow-up Questions (Priority 2)
 * - Generated based on answer quality analysis
 * - Generated based on mood changes (lower priority than Q0 violations)
 * - Asked after Q0 interruptions but before new Q1 questions
 */
export interface BaseQueues {
  queue0?: {
    use_video_processing: boolean;
    violation_count: number;
    mood_state: string;
    logs: any[];
  };
  queue1: BaseQuestion[];
  queue2?: BaseQuestion[]; // Optional - only for technical interviews
  queue3: BaseQuestion[];
}

/**
 * Interview Statistics
 */
export interface InterviewStats {
  questionsAsked: number;
  queue0Active?: boolean;
  queue1Size: number;
  queue2Size?: number; // Optional - only for technical interviews
  queue3Size: number;
  violationCount?: number;
  interviewEnded?: boolean;
}

/**
 * Interview Screens
 */
export type InterviewScreen = "setup" | "loading" | "ready" | "interview" | "complete";

/**
 * Question Generation Context
 */
export interface QuestionGenerationContext {
  jobData?: JobData;
  resumeData?: ResumeData;
  interviewType: InterviewType;
  difficulty: "junior" | "mid" | "senior";
  topics: string[];
}

/**
 * Question Entry for Evaluation Storage
 */
export interface QuestionEntry {
  question_text: string;
  ideal_answer?: string;
  user_answer: string;
  correctness_score?: number;
  question_type: 'technical' | 'non-technical' | 'followup' | 'mood-triggered';
  queue_number: 0 | 1 | 2 | 3;
  timestamp: Date;
  source_urls?: string[];
  mood_state?: string;
  violation_snapshot?: {
    violation_count: number;
    current_violations: string[];
  };
}

/**
 * Chunking Configuration
 * For preprocessing questions in batches
 */
export interface ChunkingConfig {
  enabled: boolean;
  chunkSize: number; // Number of questions per chunk
  preprocessAhead: number; // How many chunks ahead to preprocess
}

/**
 * Audio Configuration
 */
export interface AudioConfig {
  useTTS: boolean;
  useS3Storage: boolean;
  browserTTSFallback: boolean;
}

/**
 * Interview Session State
 */
export interface InterviewSessionState {
  interviewId: string;
  currentScreen: InterviewScreen;
  currentQuestion: BaseQuestion | null;
  queues: BaseQueues;
  stats: InterviewStats;
  isRecording: boolean;
  isSpeaking: boolean;
  isUserMuted: boolean;
  timeRemaining: number;
  hasConsent: boolean;
  transcript: {
    interim: string;
    final: string;
  };
}

/**
 * Question Generator Function Type
 * Each interview type provides its own implementation
 */
export type QuestionGenerator = (context: QuestionGenerationContext) => Promise<{
  success: boolean;
  queues?: BaseQueues;
  error?: string;
}>;

/**
 * Answer Analyzer Function Type
 * Each interview type provides its own implementation
 */
export type AnswerAnalyzer = (
  question: string,
  correctAnswer: string,
  userAnswer: string,
  currentQueues: BaseQueues,
  currentQuestion: BaseQuestion
) => Promise<{
  success: boolean;
  correctness?: number;
  nextQueue?: QueueType;
  followupQuestion?: BaseQuestion;
  error?: string;
}>;
