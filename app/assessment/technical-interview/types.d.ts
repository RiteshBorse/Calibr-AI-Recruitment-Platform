export interface Question {
  id: string;
  question: string;
  category: "technical" | "non-technical" | "followup";
  difficulty?: "medium" | "hard";
  answer?: string;
  parentQuestion?: string;
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


