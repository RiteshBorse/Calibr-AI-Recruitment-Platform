"use client";

import {
  getInterviewConfig as getInterviewConfigAction,
  fetchInterviewSession as fetchInterviewSessionAction,
  analyzeAnswer as analyzeAnswerAction,
  startEvaluation as startEvaluationAction,
  appendQA as appendQAAction,
  completeInterview as completeInterviewAction,
  generateQuestions as generateQuestionsAction,
  generateQ2Questions as generateQ2QuestionsAction,
  generateFollowupQuestion as generateFollowupQuestionAction,
  preprocessQuestion as preprocessQuestionAction,
  storeQ1Questions as storeQ1QuestionsAction,
  getQ1QuestionsForChunk as getQ1QuestionsForChunkAction,
  getQ1Questions as getQ1QuestionsAction,
  addAskedQuestion as addAskedQuestionAction,
  markQuestionAsked as markQuestionAskedAction,
  updateAskedQuestionAnswer as updateAskedQuestionAnswerAction,
  removeAskedQuestion as removeAskedQuestionAction,
  getAskedQuestions as getAskedQuestionsAction,
  markChunkPreprocessed as markChunkPreprocessedAction,
  storeVideoLogs as storeVideoLogsAction,
  checkVideoViolations as checkVideoViolationsAction,
  deleteInterviewAudio as deleteInterviewAudioAction,
  type FetchInterviewSessionResponse,
  type JobData,
  type ResumeData,
 // type Question,
  //type InterviewConfig,
} from "./actions";

export function useInterviewActions() {
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
    technicalInterviewId: string,
    assessmentId?: string | null,
    jobId?: string | null
  ) => {
    return await startEvaluationAction(technicalInterviewId, assessmentId, jobId);
  };

  const appendQA = async (
    technicalInterviewId: string,
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
    return await appendQAAction(technicalInterviewId, entry);
  };

  const completeInterview = async (
    technicalInterviewId: string
  ) => {
    return await completeInterviewAction(technicalInterviewId);
  };

  // Question Generation Actions
  const generateQuestions = async (context: {
    jobData?: JobData;
    resumeData?: ResumeData;
  }) => {
    return await generateQuestionsAction(context);
  };

  const generateQ2Questions = async (
    q1Question: string,
    q1Answer: string,
    topicId: string
  ) => {
    return await generateQ2QuestionsAction(q1Question, q1Answer, topicId);
  };

  const generateFollowupQuestion = async (
    originalQuestion: string,
    userAnswer: string
  ) => {
    return await generateFollowupQuestionAction(originalQuestion, userAnswer);
  };

  const preprocessQuestion = async (
    questionText: string
  ) => {
    return await preprocessQuestionAction(questionText);
  };

  // Analysis Actions
  const analyzeAnswer = async (
    question: string,
    correctAnswer: string,
    userAnswer: string,
    currentQueues: any,
    currentQuestion: any
  ) => {
    return await analyzeAnswerAction(
      question,
      correctAnswer,
      userAnswer,
      currentQueues,
      currentQuestion
    );
  };

  const checkVideoViolations = async (
    interviewId: string
  ) => {
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
    question: any
  ) => {
    return await addAskedQuestionAction(interviewId, question);
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
    evaluation?: { correctness: number; reason: string; route_action: 'next_difficulty' | 'normal_flow' | 'followup' }
  ) => {
    return await updateAskedQuestionAnswerAction(interviewId, questionId, userAnswer, evaluation);
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
    generateQ2Questions,
    generateFollowupQuestion,
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
    removeAskedQuestion,
    getAskedQuestions,
    markChunkPreprocessed,
    storeVideoLogs,
    // Media
    deleteInterviewAudio,
  };
}


