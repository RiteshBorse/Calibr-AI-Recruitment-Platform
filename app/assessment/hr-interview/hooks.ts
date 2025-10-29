"use client";

/**
 * HR Interview Hooks
 * Client-side wrappers for HR interview server actions
 * Mirrors technical interview hooks structure
 */

import {
  getInterviewConfig as getInterviewConfigAction,
  fetchInterviewSession as fetchInterviewSessionAction,
  startEvaluation as startEvaluationAction,
  appendQA as appendQAAction,
  completeInterview as completeInterviewAction,
  generateQuestions as generateQuestionsAction,
  preprocessQuestion as preprocessQuestionAction,
  analyzeAnswer as analyzeAnswerAction,
  checkVideoViolations as checkVideoViolationsAction,
  storeQ1Questions as storeQ1QuestionsAction,
  getQ1QuestionsForChunk as getQ1QuestionsForChunkAction,
  getQ1Questions as getQ1QuestionsAction,
  addAskedQuestion as addAskedQuestionAction,
  markQuestionAsked as markQuestionAskedAction,
  updateAskedQuestionAnswer as updateAskedQuestionAnswerAction,
  updateAskedQuestion as updateAskedQuestionAction,
  removeAskedQuestion as removeAskedQuestionAction,
  getAskedQuestions as getAskedQuestionsAction,
  markChunkPreprocessed as markChunkPreprocessedAction,
  storeVideoLogs as storeVideoLogsAction,
  deleteInterviewAudio as deleteInterviewAudioAction,
  type FetchInterviewSessionResponse,
  type JobData,
  type ResumeData,
} from "./actions";

export function useHRInterviewActions() {
  // Config Actions
  const getInterviewConfig = async (interviewId: string) => {
    return await getInterviewConfigAction(interviewId);
  };

  // Session Actions
  const fetchInterviewSession = async (
    interviewId: string
  ): Promise<FetchInterviewSessionResponse> => {
    return await fetchInterviewSessionAction(interviewId);
  };

  // Evaluation Actions
  const startEvaluation = async (
    hrInterviewId: string,
    assessmentId?: string | null,
    jobId?: string | null
  ) => {
    return await startEvaluationAction(hrInterviewId, assessmentId, jobId);
  };

  const appendQA = async (
    hrInterviewId: string,
    entry: { 
      question_text: string; 
      ideal_answer?: string; 
      user_answer: string; 
      correctness_score?: number; 
      question_type: 'technical' | 'non-technical' | 'followup' | 'mood-triggered';
      queue_number: 0 | 1 | 2 | 3;
      timestamp: Date;
      source_urls?: string[];
      mood_state?: string;
      violation_snapshot?: { violation_count: number; current_violations: string[] };
    }
  ) => {
    return await appendQAAction(hrInterviewId, entry);
  };

  const completeInterview = async (
    hrInterviewId: string
  ) => {
    return await completeInterviewAction(hrInterviewId);
  };

  // Question Generation Actions
  const generateQuestions = async (context: {
    jobData?: JobData;
    resumeData?: ResumeData;
  }) => {
    return await generateQuestionsAction(context);
  };

  const preprocessQuestion = async (questionText: string) => {
    return await preprocessQuestionAction(questionText);
  };

  // Analysis Actions
  const analyzeAnswer = async (
    question: string,
    evaluationCriteria: string,
    userAnswer: string,
    currentQueues: any,
    currentQuestion: any,
    interviewId?: string
  ) => {
    return await analyzeAnswerAction(
      question,
      evaluationCriteria,
      userAnswer,
      currentQueues,
      currentQuestion,
      interviewId
    );
  };

  const checkVideoViolations = async (interviewId: string) => {
    return await checkVideoViolationsAction(interviewId);
  };

  // Storage Actions
  const storeQ1Questions = async (
    interviewId: string,
    questions: Array<{
      id: string;
      question: string;
      category: 'technical' | 'non-technical';
      difficulty?: string;
    }>
  ) => {
    return await storeQ1QuestionsAction(interviewId, questions);
  };

  const getQ1QuestionsForChunk = async (
    interviewId: string,
    chunkNumber: number
  ) => {
    return await getQ1QuestionsForChunkAction(interviewId, chunkNumber);
  };

  const getQ1Questions = async (interviewId: string) => {
    return await getQ1QuestionsAction(interviewId);
  };

  const addAskedQuestion = async (
    interviewId: string,
    question: any,
    insertAfterQuestionId?: string
  ) => {
    return await addAskedQuestionAction(interviewId, question, insertAfterQuestionId);
  };

  const markQuestionAsked = async (
    interviewId: string,
    questionId: string
  ) => {
    return await markQuestionAskedAction(interviewId, questionId);
  };

  const updateAskedQuestionAnswer = async (
    interviewId: string,
    questionId: string,
    userAnswer: string,
    evaluation?: { 
      correctness: number; 
      reason: string; 
      route_action: 'followup_negative' | 'normal_flow' | 'followup_positive' 
    }
  ) => {
    return await updateAskedQuestionAnswerAction(interviewId, questionId, userAnswer, evaluation);
  };

  const updateAskedQuestion = async (
    interviewId: string,
    questionId: string,
    updates: {
      answer?: string;
      source_urls?: string[];
      audioUrl?: string;
      preprocessed?: boolean;
      askedAt?: Date;
      userAnswer?: string;
      evaluation?: {
        correctness: number;
        reason: string;
        route_action: 'followup_negative' | 'normal_flow' | 'followup_positive';
      };
    }
  ) => {
    return await updateAskedQuestionAction(interviewId, questionId, updates);
  };

  const removeAskedQuestion = async (
    interviewId: string,
    questionId: string
  ) => {
    return await removeAskedQuestionAction(interviewId, questionId);
  };

  const getAskedQuestions = async (interviewId: string) => {
    return await getAskedQuestionsAction(interviewId);
  };

  const markChunkPreprocessed = async (
    interviewId: string,
    chunkNumber: number
  ) => {
    return await markChunkPreprocessedAction(interviewId, chunkNumber);
  };

  const storeVideoLogs = async (
    interviewId: string,
    logs: any[]
  ) => {
    return await storeVideoLogsAction(interviewId, logs);
  };

  // Media Actions
  const deleteInterviewAudio = async (interviewId: string) => {
    return await deleteInterviewAudioAction(interviewId);
  };

  return {
    // Config
    getInterviewConfig,
    // Session
    fetchInterviewSession,
    // Evaluation
    startEvaluation,
    appendQA,
    completeInterview,
    // Question Generation
    generateQuestions,
    preprocessQuestion,
    // Analysis
    analyzeAnswer,
    checkVideoViolations,
    // Storage
    storeQ1Questions,
    getQ1QuestionsForChunk,
    getQ1Questions,
    addAskedQuestion,
    markQuestionAsked,
    updateAskedQuestionAnswer,
    updateAskedQuestion,
    removeAskedQuestion,
    getAskedQuestions,
    markChunkPreprocessed,
    storeVideoLogs,
    // Media
    deleteInterviewAudio,
  };
}
