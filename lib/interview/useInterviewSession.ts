"use client";

import { useState, useRef, useEffect } from "react";
import type { 
  BaseInterviewConfig, 
  BaseQueues, 
  BaseQuestion, 
  InterviewType,
  QueueType 
} from "./base-types";
import type { ISpeechRecognition } from "@/utils/stt";
import { generateTTSAudio } from "@/utils/tts";

type InterviewScreen = "setup" | "loading" | "ready" | "interview" | "complete";

interface UseInterviewSessionOptions {
  interviewId: string;
  interviewType: InterviewType;
  config: BaseInterviewConfig;
  jobData?: any;
  resumeData?: any;
  hasQueue2: boolean;
  
  // Action hooks (passed from specific interview type)
  actions: {
    getAskedQuestions: (interviewId: string) => Promise<any>;
    storeQ1Questions: (interviewId: string, questions: any[]) => Promise<any>;
    getQ1QuestionsForChunk: (interviewId: string, chunkNumber: number) => Promise<any>;
    getQ1Questions: (interviewId: string) => Promise<any>;
    addAskedQuestion: (interviewId: string, question: any) => Promise<any>;
    updateAskedQuestionAnswer: (interviewId: string, questionId: string, answer: string, evaluation?: { correctness: number; reason: string; route_action: 'next_difficulty' | 'normal_flow' | 'followup' }) => Promise<any>;
    removeAskedQuestion: (interviewId: string, questionId: string) => Promise<any>;
    generateQuestions: (context: any) => Promise<any>;
    preprocessQuestion: (question: string) => Promise<any>;
    deleteInterviewAudio: (interviewId: string) => Promise<any>;
    markQuestionAsked: (interviewId: string, questionId: string) => Promise<any>;
    completeInterview: (interviewId: string) => Promise<any>;
    storeVideoLogs: (interviewId: string, logs: any[]) => Promise<any>;
    markChunkPreprocessed: (interviewId: string, chunkNumber: number) => Promise<any>;
  };
  
  // Adapter for interview-specific logic (analysis, evaluation, etc.)
  adapter: {
    startEvaluation: (interviewId: string) => Promise<void>;
    analyze: (question: string, idealAnswer: string, userAnswer: string, queues: any, currentQuestion: any, interviewId: string) => Promise<any>;
    // Optional: Generate Q2 questions during preprocessing (technical interview only)
    generateQ2Questions?: (q1Question: string, q1Answer: string, topicId: string) => Promise<any>;
  };
}

export function useInterviewSession(options: UseInterviewSessionOptions) {
  const {
    interviewId,
    config,
    hasQueue2,
    actions,
    adapter,
  } = options;

  // TESTING MODE
  const TESTING_MODE = process.env.NEXT_PUBLIC_INTERVIEW_TESTING_MODE === "true";

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Screen & Loading States
  const [currentScreen, setCurrentScreen] = useState<InterviewScreen>("setup");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Initializing...");
  const [preprocessingProgress, setPreprocessingProgress] = useState<number>(0);

  // Question & Queue States
  const [queues, setQueues] = useState<BaseQueues>({ 
    queue1: [], 
    queue2: hasQueue2 ? [] : undefined, 
    queue3: [] 
  });
  const [currentQuestion, setCurrentQuestion] = useState<BaseQuestion | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentChunkNumber, setCurrentChunkNumber] = useState(0);
  const [totalQ1Questions, setTotalQ1Questions] = useState(0);
  const [preprocessedChunks, setPreprocessedChunks] = useState<Set<number>>(new Set([0]));
  const [stats, setStats] = useState({ questionsAsked: 0 });
  const [closingMessage, setClosingMessage] = useState<string>("");

  // Media States
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserMuted, setIsUserMuted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(config.duration * 60);
  const [hasConsent, setHasConsent] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");

  // ============================================================================
  // REFS (for immediate access in callbacks)
  // ============================================================================

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<ISpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const evaluationStartedRef = useRef<boolean>(false);
  const transcriptBufferRef = useRef<string>("");
  const answerBufferRef = useRef<string>("");
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preprocessingInProgressRef = useRef<boolean>(false);
  const askedQuestionsRef = useRef<any[]>([]);
  // const lastActivityRef = useRef<number>(Date.now()); // unused - for future proctoring features
  const hasStartedSpeakingRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const isUserMutedRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const currentScreenRef = useRef<InterviewScreen>("setup");
  const sttRestartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentQuestionRef = useRef<BaseQuestion | null>(null);

  const PAUSE_THRESHOLD = 3000;

  // Keep refs in sync with state
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    isUserMutedRef.current = isUserMuted;
  }, [isUserMuted]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Load asked questions from database
   */
  const loadAskedQuestions = async () => {
    try {
      const result = await actions.getAskedQuestions(interviewId);
      if (result.success && result.questions) {
        askedQuestionsRef.current = result.questions;
        return result.questions;
      }
      return [];
    } catch (error) {
      console.error("[Load] Error:", error);
      return [];
    }
  };

  /**
   * Generate TTS audio and upload to S3 (with fallback to browser TTS)
   */
  const generateAndUploadTTS = async (
    text: string,
    questionId: string
  ): Promise<string | null> => {
    try {
      console.log(`[TTS] Generating audio for ${questionId}...`);
      const audioBlob = await generateTTSAudio(text);

      if (!audioBlob) {
        console.warn(`[TTS] No audio blob for ${questionId}, will use browser TTS`);
        return null;
      }

      console.log(`[TTS] Audio blob generated, size: ${audioBlob.size} bytes`);

      // Convert blob to base64 for server upload
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString("base64");

      // Upload via API route
      const uploadResponse = await fetch("/api/upload-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64Audio,
          questionId,
          interviewId,
        }),
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        console.warn(`[TTS] Upload failed for ${questionId}: ${error.error}, will use browser TTS`);
        return null;
      }

      const { audioUrl } = await uploadResponse.json();
      console.log(`[TTS] ✓ Uploaded ${questionId} to S3: ${audioUrl}`);
      return audioUrl;
    } catch (error) {
      console.warn(`[TTS] Upload failed for ${questionId}, will use browser TTS:`, error);
      return null;
    }
  };

  /**
   * Preprocess chunk: generate answers, sources, TTS
   */
  const preprocessChunk = async (chunkNumber: number) => {
    if (preprocessingInProgressRef.current) return;
    preprocessingInProgressRef.current = true;

    try {
      console.log(`[Preprocessing] 🔄 Starting chunk ${chunkNumber}...`);
      setLoadingMessage(`Preprocessing chunk ${chunkNumber}...`);

      const result = await actions.getQ1QuestionsForChunk(interviewId, chunkNumber);
      if (!result.success || !result.questions || result.questions.length === 0) {
        console.log(`[Preprocessing] ❌ No questions for chunk ${chunkNumber}`);
        return;
      }

      const totalQuestions = result.questions.length;
      console.log(`[Preprocessing] Found ${totalQuestions} questions in chunk ${chunkNumber}`);

      for (let i = 0; i < result.questions.length; i++) {
        const q = result.questions[i];
        const baseProgress = Math.round(((i + 1) / totalQuestions) * 100);

        console.log(`[Preprocessing] Q1 Question ${i + 1}/${totalQuestions} (${baseProgress}%): ${q.id}`);
        setLoadingMessage(`Preprocessing chunk ${chunkNumber}: Question ${i + 1}/${totalQuestions}`);
        setPreprocessingProgress(baseProgress);

        let answer: string | undefined, source_urls: string[] | undefined;

        // Generate evaluation criteria/ideal answer for ALL questions
        // Technical: Gets ideal answer with sources
        // Non-technical (HR): Gets evaluation criteria or puzzle answers
        console.log(`[Preprocessing] Generating ${q.category === "technical" ? "ideal answer" : "evaluation criteria"} for ${q.id}...`);
        const preprocessResult = await actions.preprocessQuestion(q.question);
        if (preprocessResult.success && preprocessResult.answer) {
          answer = preprocessResult.answer;
          source_urls = preprocessResult.source_urls || [];
          console.log(`[Preprocessing] ✓ Got answer/criteria (${answer?.length || 0} chars) and ${source_urls?.length || 0} sources`);
        } else {
          console.warn(`[Preprocessing] ⚠️ Failed to generate answer/criteria: ${preprocessResult.error}`);
        }

        console.log(`[Preprocessing] Generating TTS audio for ${q.id}...`);
        const audioUrl = await generateAndUploadTTS(q.question, q.id);
        console.log(`[Preprocessing] TTS result for ${q.id}: ${audioUrl ? "S3 URL" : "Browser TTS fallback"}`);

        console.log(`[Preprocessing] Storing Q1 question ${q.id} in database...`);
        await actions.addAskedQuestion(interviewId, {
          id: q.id,
          question: q.question,
          category: q.category,
          difficulty: q.difficulty,
          queueType: "Q1" as QueueType,
          askedAt: undefined as any,
          preprocessed: true,
          answer: answer || undefined,
          source_urls: source_urls || [],
          audioUrl: audioUrl || undefined,
          userAnswer: undefined,
          correctness: undefined,
        });
        console.log(`[Preprocessing] ✓ Q1 question ${q.id} stored successfully`);

        // Generate Q2 questions if adapter provides the method (technical interview only)
        if (hasQueue2 && q.category === "technical" && answer && adapter.generateQ2Questions) {
          console.log(`[Preprocessing] 🎯 Generating Q2 (medium + hard) for ${q.id}...`);
          setLoadingMessage(`Preprocessing chunk ${chunkNumber}: Generating follow-ups for Q${i + 1}`);

          try {
            const q2Result = await adapter.generateQ2Questions(q.question, answer, q.id);
            
            if (q2Result.success && q2Result.questions && q2Result.questions.length > 0) {
              console.log(`[Preprocessing] ✓ Generated ${q2Result.questions.length} Q2 questions for ${q.id}`);
              
              // Store Q2 questions in database
              for (const q2 of q2Result.questions) {
                await actions.addAskedQuestion(interviewId, {
                  ...q2,
                  queueType: "Q2" as QueueType,
                  askedAt: undefined as any,
                  preprocessed: true,
                  audioUrl: undefined,
                  userAnswer: undefined,
                  correctness: undefined,
                });
              }
            } else {
              console.warn(`[Preprocessing] ⚠️ Q2 generation returned no questions for ${q.id}`);
            }
          } catch (e) {
            console.error(`[Preprocessing] ❌ Q2 generation failed for ${q.id}:`, e);
          }
        }
      }

      console.log(`[Preprocessing] ✅ Chunk ${chunkNumber} complete (${totalQuestions} questions processed)`);
      setPreprocessingProgress(100);

      // Mark chunk as preprocessed
      await actions.markChunkPreprocessed(interviewId, chunkNumber);
      console.log(`[Preprocessing] ✓ Marked chunk ${chunkNumber} as preprocessed in database`);

      // Update local state
      setPreprocessedChunks((prev) => {
        const updated = new Set(prev);
        updated.add(chunkNumber);
        console.log(`[Preprocessing] ✓ Local state updated. Preprocessed chunks: [${Array.from(updated).sort().join(", ")}]`);
        return updated;
      });
    } catch (error) {
      console.error(`[Preprocessing] ❌ Error in chunk ${chunkNumber}:`, error);
      setLoadingMessage(`Error preprocessing chunk ${chunkNumber}`);
    } finally {
      preprocessingInProgressRef.current = false;
    }
  };

  // ============================================================================
  // RETURN OBJECT
  // ============================================================================

  return {
    // Screen state
    currentScreen,
    setCurrentScreen,
    
    // Loading state
    isLoading,
    setIsLoading,
    loadingMessage,
    setLoadingMessage,
    preprocessingProgress,
    setPreprocessingProgress,
    
    // Question state
    queues,
    setQueues,
    currentQuestion,
    setCurrentQuestion,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    currentChunkNumber,
    setCurrentChunkNumber,
    totalQ1Questions,
    setTotalQ1Questions,
    preprocessedChunks,
    setPreprocessedChunks,
    stats,
    setStats,
    closingMessage,
    setClosingMessage,
    
    // Media state
    isRecording,
    setIsRecording,
    isSpeaking,
    setIsSpeaking,
    isUserMuted,
    setIsUserMuted,
    timeRemaining,
    setTimeRemaining,
    hasConsent,
    setHasConsent,
    modelsLoaded,
    setModelsLoaded,
    speechRecognitionAvailable,
    setSpeechRecognitionAvailable,
    interimTranscript,
    setInterimTranscript,
    finalTranscript,
    setFinalTranscript,
    
    // Refs (for direct access)
    mediaRecorderRef,
    speechRecognitionRef,
    streamRef,
    timerRef,
    evaluationStartedRef,
    transcriptBufferRef,
    answerBufferRef,
    pauseTimeoutRef,
    preprocessingInProgressRef,
    askedQuestionsRef,
    currentQuestionRef,
    isSpeakingRef,
    currentScreenRef,
    sttRestartTimeoutRef,
    isUserMutedRef,
    hasStartedSpeakingRef,
    isSubmittingRef,
    
    // Helper functions
    loadAskedQuestions,
    generateAndUploadTTS,
    preprocessChunk,
    
    // Constants
    PAUSE_THRESHOLD,
    TESTING_MODE,
  };
}
