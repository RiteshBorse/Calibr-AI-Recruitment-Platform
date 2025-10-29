"use client";

import React from "react";
import { buildInterviewClosingPrompt } from "@/ai-engine/prompts/technicalInterview";
import { callGeminiAPI } from "@/utils/interview";
import type { BaseQuestion, BaseQueues } from "./base-types";

interface UseInterviewFlowOptions {
  interviewId: string;
  
  // State setters
  setCurrentScreen: (screen: "setup" | "loading" | "ready" | "interview" | "complete") => void;
  setIsLoading: (value: boolean) => void;
  setLoadingMessage: (value: string) => void;
  setPreprocessingProgress: (value: number) => void;
  setQueues: (queues: BaseQueues | ((prev: BaseQueues) => BaseQueues)) => void;
  setCurrentQuestion: (question: BaseQuestion | null) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setCurrentChunkNumber: (chunk: number) => void;
  setTotalQ1Questions: (total: number) => void;
  setPreprocessedChunks: (chunks: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  setStats: (stats: any | ((prev: any) => any)) => void;
  setClosingMessage: (message: string) => void;
  setFinalTranscript: (value: string) => void;
  setInterimTranscript: (value: string) => void;
  setIsRecording: (value: boolean) => void;
  
  // Refs
  evaluationStartedRef: React.MutableRefObject<boolean>;
  currentQuestionRef: React.MutableRefObject<BaseQuestion | null>;
  pauseTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  transcriptBufferRef: React.MutableRefObject<string>;
  answerBufferRef: React.MutableRefObject<string>;
  hasStartedSpeakingRef: React.MutableRefObject<boolean>;
  isSubmittingRef: React.MutableRefObject<boolean>;
  preprocessingInProgressRef: React.MutableRefObject<boolean>;
  timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  speechRecognitionRef: React.MutableRefObject<any>;
  
  // Current state values (for reading)
  currentScreen: string;
  modelsLoaded: boolean;
  totalQ1Questions: number;
  currentChunkNumber: number;
  
  // Config
  hasConsent: boolean;
  consentRequired: boolean;
  hasQueue2: boolean;
  
  // Actions
  actions: {
    getAskedQuestions: (interviewId: string) => Promise<any>;
    storeQ1Questions: (interviewId: string, questions: any[]) => Promise<any>;
    getQ1Questions: (interviewId: string) => Promise<any>;
    addAskedQuestion: (interviewId: string, question: any) => Promise<any>;
    updateAskedQuestionAnswer: (interviewId: string, questionId: string, answer: string, evaluation?: { correctness: number; reason: string; route_action: 'next_difficulty' | 'normal_flow' | 'followup' }) => Promise<any>;
    generateQuestions: (context: any) => Promise<any>;
    deleteInterviewAudio: (interviewId: string) => Promise<any>;
    completeInterview: (interviewId: string) => Promise<any>;
    markChunkPreprocessed: (interviewId: string, chunkNumber: number) => Promise<any>;
  };
  
  // Adapter
  adapter: {
    startEvaluation: (interviewId: string) => Promise<void>;
    analyze: (question: string, idealAnswer: string, userAnswer: string, queues: any, currentQuestion: any, interviewId: string) => Promise<any>;
  };
  
  // Helper functions
  loadAskedQuestions: () => Promise<any[]>;
  preprocessChunk: (chunkNumber: number) => Promise<void>;
  
  // Media functions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  playQuestionAudio: (audioUrl?: string, questionText?: string) => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  
  // Data
  jobData?: any;
  resumeData?: any;
  queues: BaseQueues;
}

export function useInterviewFlow(options: UseInterviewFlowOptions) {
  const {
    interviewId,
    setCurrentScreen,
    setIsLoading,
    setLoadingMessage,
    setPreprocessingProgress,
    setQueues,
    setCurrentQuestion,
    setCurrentQuestionIndex,
    setCurrentChunkNumber,
    setTotalQ1Questions,
    setPreprocessedChunks,
    setStats,
    setClosingMessage,
    setFinalTranscript,
    setInterimTranscript,
    setIsRecording,
    evaluationStartedRef,
    currentQuestionRef,
    pauseTimeoutRef,
    transcriptBufferRef,
    answerBufferRef,
    hasStartedSpeakingRef,
    isSubmittingRef,
    preprocessingInProgressRef,
    timerRef,
    speechRecognitionRef,
    currentScreen,
    modelsLoaded,
    totalQ1Questions,
    currentChunkNumber,
    hasConsent,
    consentRequired,
    hasQueue2,
    actions,
    adapter,
    loadAskedQuestions,
    preprocessChunk,
    startRecording,
    stopRecording,
    playQuestionAudio,
    pauseRecording,
    jobData,
    resumeData,
    queues,
  } = options;

  const CHUNK_SIZE = 5;

  /**
   * Begin the actual interview (called from ready screen)
   */
  const beginInterview = async () => {
    console.log("[Interview] Starting interview from ready screen...");
    
    // Load Q1 questions from database
    console.log("[Interview] Loading Q1 questions for chunk preprocessing...");
    const q1Result = await actions.getQ1Questions(interviewId);
    
    if (q1Result.success && q1Result.q1Questions) {
      console.log(`[Interview] ✓ Loaded ${q1Result.q1Questions.length} Q1 questions from database`);
      setQueues((prev: BaseQueues) => ({
        ...prev,
        queue1: q1Result.q1Questions
      }));
      setPreprocessedChunks(new Set(q1Result.preprocessedChunks || []));
    } else {
      console.warn("[Interview] ⚠️ Failed to load Q1 questions, chunk preprocessing may not work");
    }
    
    setCurrentScreen("interview");

    // Start recording infrastructure but don't start STT yet
    await startRecording();
    pauseRecording();

    // Play the first question
    if (currentQuestionRef.current) {
      await playQuestionAudio(
        (currentQuestionRef.current as any).audioUrl,
        currentQuestionRef.current.question
      );
    }
  };

  /**
   * Start interview (called from setup screen)
   */
  const startInterview = async () => {
    if (consentRequired && !hasConsent) {
      alert("Please provide consent to continue.");
      return;
    }

    setIsLoading(true);
    setCurrentScreen("loading");
    setLoadingMessage("Initializing interview...");

    try {
      if (!evaluationStartedRef.current) {
        await adapter.startEvaluation(interviewId);
        evaluationStartedRef.current = true;
      }

      console.log("[Interview] Checking for existing questions...");
      setLoadingMessage("Checking for previous progress...");
      const existingQuestions = await loadAskedQuestions();

      if (existingQuestions.length > 0) {
        console.log(`[Interview] ✓ Found ${existingQuestions.length} existing questions - resuming interview`);

        // Load Q1 questions and preprocessed chunks
        const q1Result = await actions.getQ1Questions(interviewId);

        if (q1Result.success && q1Result.q1Questions) {
          console.log(`[Interview] Loaded ${q1Result.q1Questions.length} Q1 questions from database`);
          
          setQueues({
            queue1: q1Result.q1Questions,
            queue2: hasQueue2 ? [] : undefined,
            queue3: [],
          });
          setTotalQ1Questions(q1Result.q1Questions.length);
          setPreprocessedChunks(new Set(q1Result.preprocessedChunks || []));
        }

        // Find first unanswered question
        const firstUnanswered = existingQuestions.find(
          (q) => !q.userAnswer || q.userAnswer.trim().length === 0
        );

        if (firstUnanswered) {
          const resumeIndex = existingQuestions.indexOf(firstUnanswered);
          console.log(`[Interview] 📍 Resuming at question #${resumeIndex + 1}`);

          setCurrentQuestionIndex(resumeIndex);
          setCurrentQuestion(firstUnanswered);
          currentQuestionRef.current = firstUnanswered;
          setStats({ questionsAsked: resumeIndex });
          setCurrentChunkNumber(Math.floor(resumeIndex / CHUNK_SIZE));
        } else {
          // All questions answered
          console.log("[Interview] ✅ All questions answered, interview complete");
          setCurrentScreen("complete");
          setIsLoading(false);
          return;
        }

        // Wait for chunk 0 to be preprocessed
        const isChunk0Ready = q1Result.preprocessedChunks?.includes(0);
        if (!isChunk0Ready) {
          console.log("[Interview] ⚠️ Chunk 0 not preprocessed yet, waiting...");
          setLoadingMessage("📋 Waiting for initial questions to be prepared...");

          let waitAttempts = 0;
          while (waitAttempts < 60) {
            const updatedResult = await actions.getQ1Questions(interviewId);
            if (updatedResult.success && updatedResult.preprocessedChunks?.includes(0)) {
              console.log("[Interview] ✅ Chunk 0 is now ready");
              setPreprocessedChunks(new Set(updatedResult.preprocessedChunks));
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            waitAttempts++;
          }

          if (waitAttempts >= 60) {
            console.error("[Interview] ❌ Chunk 0 preprocessing timeout");
          }
        }

        // Wait for models
        let modelWaitAttempts = 0;
        const maxWaitTime = 10;

        if (!modelsLoaded) {
          setLoadingMessage("Checking proctoring models...");
          while (!modelsLoaded && modelWaitAttempts < maxWaitTime) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            modelWaitAttempts++;
          }
        }

        console.log("[Interview] ✓ Resuming interview - showing ready screen");
        setCurrentScreen("ready");
        setIsLoading(false);
        return;
      }

      // Generate new questions
      console.log("[Interview] Generating questions...");
      setLoadingMessage("AI is generating personalized questions...");

      const result = await actions.generateQuestions({ jobData, resumeData });

      if (!result.success || !result.queues) {
        console.error("[Interview] ❌ Question generation failed:", result.error);
        alert(`Failed to generate questions: ${result.error || "Unknown error"}. Please try again.`);
        setCurrentScreen("setup");
        setIsLoading(false);
        return;
      }

      console.log("[Interview] ✓ Questions generated successfully");

      const q1Questions = result.queues.queue1.map((q: any) => ({
        id: q.id,
        question: q.question,
        category: q.category,
        difficulty: q.difficulty,
      }));

      await actions.storeQ1Questions(interviewId, q1Questions);
      setTotalQ1Questions(q1Questions.length);

      setQueues({
        queue1: result.queues.queue1,
        queue2: hasQueue2 ? result.queues.queue2 : undefined,
        queue3: result.queues.queue3,
      });

      console.log("[Interview] Starting preprocessing of Chunk 0...");
      setLoadingMessage("🔄 Analyzing your resume and skills...");
      setPreprocessingProgress(5);

      preprocessChunk(0);

      // Wait for chunk 0 to complete
      const expectedCount = Math.min(CHUNK_SIZE, q1Questions.length);
      let attempts = 0;

      while (attempts < 60) {
        const askedQuestions = await loadAskedQuestions();
        const progress = Math.round(5 + (askedQuestions.length / expectedCount) * 85);

        if (askedQuestions.length >= expectedCount) {
          console.log(`[Interview] ✓ Chunk 0 ready: ${askedQuestions.length}/${expectedCount} questions`);
          setPreprocessingProgress(100);
          setLoadingMessage("✅ All questions ready! Starting interview...");
          break;
        }

        setLoadingMessage(`📋 Generating ideal answers & sources: ${askedQuestions.length}/${expectedCount} questions prepared`);
        setPreprocessingProgress(progress);

        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      // Verify chunk 0 is marked as preprocessed
      console.log("[Interview] Verifying chunk 0 is marked as preprocessed...");
      setLoadingMessage("Finalizing preprocessing...");
      let chunkCheckAttempts = 0;
      while (chunkCheckAttempts < 10) {
        const q1Result = await actions.getQ1Questions(interviewId);
        
        if (q1Result.success && q1Result.preprocessedChunks?.includes(0)) {
          console.log("[Interview] ✅ Chunk 0 confirmed as preprocessed in database");
          setPreprocessedChunks(new Set(q1Result.preprocessedChunks));
          break;
        }
        
        await new Promise((resolve) => setTimeout(resolve, 500));
        chunkCheckAttempts++;
      }

      const askedQuestions = await loadAskedQuestions();
      if (askedQuestions.length === 0) {
        alert("No questions available. Please try again.");
        setCurrentScreen("setup");
        setIsLoading(false);
        return;
      }

      setCurrentQuestion(askedQuestions[0]);
      currentQuestionRef.current = askedQuestions[0];
      setCurrentQuestionIndex(0);
      setCurrentChunkNumber(0);
      setStats({ questionsAsked: 1 });

      // Wait for models
      console.log("[Interview] Waiting for proctoring models...");
      setLoadingMessage("Loading proctoring models (facial & object detection)...");

      let modelWaitAttempts = 0;
      const maxWaitTime = 10;

      if (!modelsLoaded) {
        while (!modelsLoaded && modelWaitAttempts < maxWaitTime) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          modelWaitAttempts++;
        }
      }

      setCurrentScreen("ready");
      setIsLoading(false);
    } catch (error) {
      console.error("Error starting interview:", error);
      alert("An error occurred. Please try again.");
      setCurrentScreen("setup");
      setIsLoading(false);
    }
  };

  /**
   * Ask next question
   */
  const askNextQuestion = async () => {
    try {
      console.log('[NextQ] Loading questions from database...');
      const askedQuestions = await loadAskedQuestions();

      if (!askedQuestions || askedQuestions.length === 0) {
        console.log('[NextQ] No questions found, ending interview');
        endInterview();
        return;
      }

      // Load Q1 questions for chunk calculation
      const q1Result = await actions.getQ1Questions(interviewId);
      
      if (!q1Result.success || !q1Result.q1Questions) {
        console.error('[NextQ] ❌ Failed to load Q1 questions from database');
      }
      
      const q1Questions = q1Result.success ? (q1Result.q1Questions || []) : [];
      const dbPreprocessedChunks = new Set(q1Result.preprocessedChunks || []);

      // Find first question without a user answer
      const nextQuestion = askedQuestions.find(q => !q.userAnswer || q.userAnswer.trim().length === 0);

      if (!nextQuestion) {
        console.log('[NextQ] All questions answered, ending interview');
        endInterview();
        return;
      }

      console.log(`[NextQ] Next question ID: ${nextQuestion.id}, queueType: ${nextQuestion.queueType || 'Q1'}`);

      // Chunk preprocessing trigger
      const isQ1Question = nextQuestion.queueType === 'Q1' || !nextQuestion.queueType;
      
      let q1Index = -1;
      if (isQ1Question) {
        q1Index = q1Questions.findIndex((q: any) => q.id === nextQuestion.id);
      } else if (nextQuestion.parentQuestionId) {
        q1Index = q1Questions.findIndex((q: any) => q.id === nextQuestion.parentQuestionId);
      }

      if (q1Index !== -1) {
        const chunkNumber = Math.floor(q1Index / CHUNK_SIZE);
        const nextChunkToPreprocess = chunkNumber + 1;

        const nextChunkExists = nextChunkToPreprocess * CHUNK_SIZE < q1Questions.length;
        const nextChunkNotPreprocessed = !dbPreprocessedChunks.has(nextChunkToPreprocess);

        if (nextChunkExists && nextChunkNotPreprocessed && !preprocessingInProgressRef.current) {
          console.log(`[NextQ] 🔄 Triggering chunk ${nextChunkToPreprocess} preprocessing`);
          setTimeout(() => preprocessChunk(nextChunkToPreprocess), 100);
        }
      }

      // Get overall index
      const nextQuestionIndex = askedQuestions.indexOf(nextQuestion);
      let nextChunkNum = currentChunkNumber;
      
      if (isQ1Question && q1Index !== -1) {
        nextChunkNum = Math.floor(q1Index / CHUNK_SIZE);
      }

      const queueType = nextQuestion.queueType || 'Q1';
      console.log(`\n🎯 === ASKING ${queueType} ===`);
      console.log(`📝 ${nextQuestion.question.substring(0, 120)}${nextQuestion.question.length > 120 ? '...' : ''}`);

      // Reset transcripts for new question
      setFinalTranscript("");
      setInterimTranscript("");
      transcriptBufferRef.current = "";
      answerBufferRef.current = "";
      hasStartedSpeakingRef.current = false;

      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }

      // Wait for new chunk if needed
      if (nextChunkNum > currentChunkNumber) {
        console.log(`[Interview] Moving to chunk ${nextChunkNum}`);
        
        const currentChunkStart = nextChunkNum * CHUNK_SIZE;
        const currentChunkEnd = Math.min(currentChunkStart + CHUNK_SIZE, totalQ1Questions);
        const currentChunkQ1Count = currentChunkEnd - currentChunkStart;

        const expectedChunkQ1Ids = q1Questions.slice(currentChunkStart, currentChunkEnd).map((q: any) => q.id);
        const currentChunkQuestions = askedQuestions.filter((q: any) =>
          q.queueType === 'Q1' && expectedChunkQ1Ids.includes(q.id)
        );

        if (currentChunkQuestions.length < currentChunkQ1Count) {
          console.log(`[Interview] ⏳ Waiting for chunk ${nextChunkNum} to complete preprocessing...`);
          
          let attempts = 0;
          const maxAttempts = 60;

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const updated = await loadAskedQuestions();
            const updatedChunkQuestions = updated.filter((q: any) =>
              q.queueType === 'Q1' && expectedChunkQ1Ids.includes(q.id)
            );

            if (updatedChunkQuestions.length >= currentChunkQ1Count) {
              console.log(`[Interview] ✓ Chunk ${nextChunkNum} ready`);
              break;
            }

            attempts++;
          }

          if (attempts >= maxAttempts) {
            console.warn(`[Interview] ⚠️ Chunk ${nextChunkNum} preprocessing timeout, continuing anyway`);
          }
        }

        setCurrentChunkNumber(nextChunkNum);
      }

      setCurrentQuestion(nextQuestion);
      currentQuestionRef.current = nextQuestion;
      setCurrentQuestionIndex(nextQuestionIndex);
      setStats((prev: any) => ({ ...prev, questionsAsked: prev.questionsAsked + 1 }));

      await playQuestionAudio(nextQuestion.audioUrl, nextQuestion.question);
    } catch (error) {
      console.error("Error asking next question:", error);
      endInterview();
    }
  };

  /**
   * Submit answer
   */
  const submitAnswer = async () => {
    if (isSubmittingRef.current) {
      console.log("[Answer] ⚠️ Submission already in progress");
      return;
    }

    const answer = answerBufferRef.current.trim();
    const questionToSubmit = currentQuestionRef.current;

    if (!answer || !questionToSubmit) {
      console.log("[Answer] No answer to submit or no current question");
      return;
    }

    isSubmittingRef.current = true;
    console.log("[Answer] 🔒 Locked submission, processing answer...");

    setIsRecording(false);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (error) {
        console.warn("[STT] Error stopping recognition:", error);
      }
    }

    answerBufferRef.current = "";
    transcriptBufferRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
    hasStartedSpeakingRef.current = false;

    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }

    try {
      const hasIdealAnswer = questionToSubmit.answer && questionToSubmit.answer.trim().length > 0;
      let correctness: number | undefined = undefined;
      let analysis: any = undefined;

      // Analyze answer for BOTH technical AND non-technical (HR) questions
      // Technical: Evaluate against ideal answer
      // HR: Evaluate based on behavioral criteria
      if (hasIdealAnswer) {
        console.log(`[Answer] Analyzing ${questionToSubmit.category} answer...`);
        analysis = await adapter.analyze(
          questionToSubmit.question,
          questionToSubmit.answer || "",
          answer,
          queues,
          questionToSubmit,
          interviewId
        );
        correctness = analysis?.correctness;
        console.log(`[Answer] Analysis complete, correctness: ${correctness !== undefined ? correctness + "%" : "N/A"}`);
        
        // Log route_action for debugging (important for HR Q3 followups)
        if (analysis?.evaluation?.route_action) {
          console.log(`[Answer] Route action: ${analysis.evaluation.route_action}`);
        }
      } else {
        console.log(`[Answer] Skipping analysis - no ideal answer/criteria available`);
      }

      console.log("[Answer] Storing answer in database...");
      // Pass full evaluation object if available from analysis, or construct it if not
      const evaluationToStore = analysis?.evaluation ? {
        correctness: analysis.evaluation.score,
        reason: analysis.evaluation.reason || '',
        route_action: analysis.evaluation.route_action,
      } : undefined;
      
      await actions.updateAskedQuestionAnswer(interviewId, questionToSubmit.id, answer, evaluationToStore);

      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log("[Answer] Proceeding to next question...");
      await askNextQuestion();
    } catch (error) {
      console.error("[Answer] ❌ Error processing answer:", error);
      await askNextQuestion();
    } finally {
      isSubmittingRef.current = false;
      setIsRecording(true);

      if (currentScreen === "interview" && speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch (error: any) {
          if (!error.message?.includes("already started")) {
            console.error("[STT] Restart error:", error);
          }
        }
      }
    }
  };

  /**
   * End interview
   */
  const endInterview = async () => {
    try {
      const prompt = buildInterviewClosingPrompt("candidate", "Completed all questions");
      const rawResponse = await callGeminiAPI(prompt);

      if (rawResponse) {
        try {
          const parsed = JSON.parse(rawResponse);
          setClosingMessage(parsed.closingMessage || "Thank you for completing the interview!");
        } catch (parseError) {
          // parseError intentionally unused - we use fallback message
          console.debug("Error parsing closing message:", parseError);
          setClosingMessage("Thank you for completing the technical interview. Your responses have been recorded and will be evaluated shortly. We appreciate your time and effort!");
        }
      } else {
        setClosingMessage("Thank you for completing the technical interview. Your responses have been recorded and will be evaluated shortly. We appreciate your time and effort!");
      }
    } catch (error) {
      console.error("Error generating closing message:", error);
      setClosingMessage("Thank you for completing the technical interview. Your responses have been recorded and will be evaluated shortly. We appreciate your time and effort!");
    } finally {
      setCurrentScreen("complete");
      stopRecording();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      console.log("[Interview] Marking interview as completed...");
      await actions.completeInterview(interviewId);

      console.log("[Interview] Deleting all TTS audio files...");
      await actions.deleteInterviewAudio(interviewId);
    }
  };

  return {
    beginInterview,
    startInterview,
    askNextQuestion,
    submitAnswer,
    endInterview,
  };
}
