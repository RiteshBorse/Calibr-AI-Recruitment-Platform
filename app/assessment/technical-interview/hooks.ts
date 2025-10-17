"use client";

import {
  getInterviewConfig as getInterviewConfigAction,
  generateQuestionsBatch as generateQuestionsBatchAction,
  analyzeAnswer as analyzeAnswerAction,
  startEvaluation as startEvaluationAction,
  appendQA as appendQAAction,
} from "./actions";

export function useInterviewActions() {
  const getInterviewConfig = async (interviewId: string) => {
    return await getInterviewConfigAction(interviewId);
  };

  const generateQuestionsBatch = async (resume: string, count: number) => {
    return await generateQuestionsBatchAction(resume, count);
  };

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

  return {
    getInterviewConfig,
    generateQuestionsBatch,
    analyzeAnswer,
    startEvaluation,
    appendQA,
  };
}


