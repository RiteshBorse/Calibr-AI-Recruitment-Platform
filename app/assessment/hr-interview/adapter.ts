import { EngineAdapter } from "@/lib/interview/types";
import { getInterviewConfig, startEvaluation, analyzeAnswer, appendQA } from "./actions";
import { checkVideoViolationsClient } from "@/lib/interview/clientVideoAdapter";

export const hrInterviewAdapter: EngineAdapter = {
  getConfig: (interviewId: string) => getInterviewConfig(interviewId),
  startEvaluation: (interviewId: string) => startEvaluation(interviewId),
  analyze: (question, correctAnswer, userAnswer, queues, currentQuestion, interviewId) =>
    analyzeAnswer(question, correctAnswer, userAnswer, queues as any, currentQuestion as any, interviewId),
  persistQA: (interviewId, entry) => appendQA(interviewId, entry),
  checkVideoViolations: () => checkVideoViolationsClient(), // Use client-side check
};
