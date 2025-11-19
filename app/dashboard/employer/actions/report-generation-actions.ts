'use server';

import { 
  safeAction, 
  createSuccessResponse,
  createErrorResponse,
  withDatabase,
  type ActionResponse 
} from '@/utils/action-helpers';
import { requireAuth } from '@/utils/auth-helpers';
import mongoose from 'mongoose';
import ApplicationModel from '@/models/application.model';
import CandidateModel from '@/models/candidate.model';
import CandidateProfileModel from '@/models/candidateProfile.model';
import TestResultModel from '@/models/aptitudeEvaluation.model';
import CodingEvaluationModel from '@/models/codingEvaluation.model';
import TechnicalInterviewEvaluationModel from '@/models/technicalInterviewEvaluation.model';
import HRInterviewEvaluationModel from '@/models/hrInterviewEvaluation.model';
import JobOpportunityModel from '@/models/jobOpportunity.model';
import AptitudeModel from '@/models/aptitude.model';
import CodingModel from '@/models/coding.model';

export interface CandidateReportData {
  candidate: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  job: {
    title: string;
    position: string;
    department: string;
    company?: string;
  };
  application: {
    applicationDate: string;
    status: string;
    rounds: {
      aptitude: string;
      coding: string;
      technicalInterview: string;
      hrInterview: string;
    };
  };
  aptitudeEvaluation?: {
    score: number;
    percentage: number;
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    unattemptedCount: number;
    passed: boolean;
    passingScore: number;
    timeTaken: number;
    submittedAt: string;
    status: string;
    warnings: {
      tabSwitch: { count: number; maxAllowed: number; exceeded: boolean };
      fullscreen: { count: number; maxAllowed: number; exceeded: boolean };
      audio: { count: number; maxAllowed: number; exceeded: boolean };
    };
    terminatedDueToWarnings: boolean;
    terminationReason?: string;
    questionDetails?: Array<{
      questionId: number;
      userAnswer?: number;
      correctAnswer: number;
      isCorrect: boolean;
      section?: string;
    }>;
  };
  codingEvaluation?: {
    language: string;
    isSubmitted: boolean;
    timeLeft: number;
    problemStatus: { [problemId: number]: string };
    totalProblems: number;
    solvedProblems: number;
    attemptedProblems: number;
    codeSubmissions: Array<{
      problemId: number;
      code: string;
      language: string;
      timestamp: string;
      passed?: boolean;
      results?: any;
    }>;
    codeRuns: Array<{
      problemId: number;
      code: string;
      language: string;
      timestamp: string;
      passed?: boolean;
      results?: any;
    }>;
    createdAt: string;
    updatedAt: string;
  };
  technicalInterviewEvaluation?: {
    status: string;
    startedAt: string;
    endedAt?: string;
    overallScore?: number;
    verdict?: string;
    aiSummary?: string;
    totalQuestions: number;
    askedQuestions: Array<{
      question: string;
      category: string;
      difficulty?: string;
      queueType: string;
      userAnswer?: string;
      evaluation?: {
        correctness: number;
        reason?: string;
      };
    }>;
    videoLogs?: {
      totalLogs: number;
      violations: number;
    };
  };
  hrInterviewEvaluation?: {
    status: string;
    startedAt: string;
    endedAt?: string;
    overallScore?: number;
    verdict?: string;
    aiSummary?: string;
    aiScores?: Array<{ key: string; score: number }>;
    totalQuestions: number;
    askedQuestions: Array<{
      question: string;
      category: string;
      difficulty?: string;
      queueType: string;
      userAnswer?: string;
      evaluation?: {
        correctness: number;
        reason?: string;
      };
    }>;
  };
}

export async function fetchCandidateEvaluationData(
  candidateId: string,
  jobId: string
): Promise<ActionResponse<CandidateReportData>> {
  return safeAction(async () => {
    const employerId = await requireAuth();
    
    if (!employerId) {
      return createErrorResponse('User not authenticated');
    }

    return await withDatabase(async () => {
      // Verify job belongs to employer
      const job = await JobOpportunityModel.findOne({
        _id: new mongoose.Types.ObjectId(jobId),
        employer: new mongoose.Types.ObjectId(employerId)
      }).lean();

      if (!job) {
        return createErrorResponse('Job not found or unauthorized');
      }

      // Fetch application
      const application = await ApplicationModel.findOne({
        candidateId: new mongoose.Types.ObjectId(candidateId),
        jobId: new mongoose.Types.ObjectId(jobId)
      }).lean();

      if (!application) {
        return createErrorResponse('Application not found');
      }

      // Fetch candidate info
      const [candidate, candidateProfile] = await Promise.all([
        CandidateModel.findById(candidateId).select('email firstName lastName avatar').lean(),
        CandidateProfileModel.findOne({ candidate: new mongoose.Types.ObjectId(candidateId) }).lean()
      ]);

      if (!candidate) {
        return createErrorResponse('Candidate not found');
      }

      const candidateName = candidateProfile?.name || 
        [candidate.firstName, candidate.lastName].filter(Boolean).join(' ') || 
        'Unknown';

      // Fetch all evaluations in parallel
      const [aptitudeEval, codingEval, technicalEval, hrEval] = await Promise.all([
        TestResultModel.findOne({
          candidateId: new mongoose.Types.ObjectId(candidateId)
        }).sort({ submittedAt: -1 }).lean(),
        
        CodingEvaluationModel.findOne({
          candidateId: new mongoose.Types.ObjectId(candidateId),
          jobId: new mongoose.Types.ObjectId(jobId)
        }).sort({ createdAt: -1 }).lean(),
        
        TechnicalInterviewEvaluationModel.findOne({
          candidateId: new mongoose.Types.ObjectId(candidateId),
          jobId: new mongoose.Types.ObjectId(jobId)
        }).sort({ createdAt: -1 }).lean(),
        
        HRInterviewEvaluationModel.findOne({
          candidateId: new mongoose.Types.ObjectId(candidateId),
          jobId: new mongoose.Types.ObjectId(jobId)
        }).sort({ createdAt: -1 }).lean()
      ]);

      // Build report data
      const reportData: CandidateReportData = {
        candidate: {
          id: candidateId,
          name: candidateName,
          email: candidate.email,
          profileImage: candidateProfile?.profileImage || candidate.avatar
        },
        job: {
          title: job.title,
          position: job.position,
          department: job.department
        },
        application: {
          applicationDate: application.applicationDate.toISOString(),
          status: application.status,
          rounds: {
            aptitude: application.rounds?.aptitude || 'pending',
            coding: application.rounds?.coding || 'pending',
            technicalInterview: application.rounds?.technicalInterview || 'pending',
            hrInterview: application.rounds?.hrInterview || 'pending'
          }
        }
      };

      // Add aptitude evaluation if exists
      if (aptitudeEval) {
        // Fetch aptitude round details to get question IDs
        const aptitudeRound = await AptitudeModel.findById(aptitudeEval.aptitudeId).lean();
        
        // Build question details with user answers and correct answers
        const questionDetails = aptitudeRound?.questionIds.map((qId: number) => {
          const userAnswer = aptitudeEval.answers instanceof Map 
            ? aptitudeEval.answers.get(qId.toString())
            : (aptitudeEval.answers as any)?.[qId];
          
          // Note: We don't have correct answers in the database for security reasons
          // This would need to be fetched from your question bank API
          return {
            questionId: qId,
            userAnswer: userAnswer,
            correctAnswer: -1, // Placeholder - would need question bank API
            isCorrect: false, // Would be calculated with actual correct answer
            section: undefined // Could be added if section info is available
          };
        }) || [];

        reportData.aptitudeEvaluation = {
          score: aptitudeEval.score,
          percentage: aptitudeEval.percentage,
          totalQuestions: aptitudeEval.totalQuestions,
          correctCount: aptitudeEval.correctCount,
          incorrectCount: aptitudeEval.incorrectCount,
          unattemptedCount: aptitudeEval.unattemptedCount,
          passed: aptitudeEval.passed,
          passingScore: aptitudeEval.passingScore,
          timeTaken: aptitudeEval.timeTaken,
          submittedAt: aptitudeEval.submittedAt.toISOString(),
          status: aptitudeEval.status,
          warnings: {
            tabSwitch: aptitudeEval.warnings.tabSwitch,
            fullscreen: aptitudeEval.warnings.fullscreen,
            audio: aptitudeEval.warnings.audio
          },
          terminatedDueToWarnings: aptitudeEval.terminatedDueToWarnings,
          terminationReason: aptitudeEval.terminationReason,
          questionDetails
        };
      }

      // Add coding evaluation if exists
      if (codingEval) {
        const problemStatus = codingEval.problemStatus instanceof Map
          ? Object.fromEntries(codingEval.problemStatus)
          : codingEval.problemStatus || {};

        const solvedCount = Object.values(problemStatus).filter(s => s === 'solved').length;
        const attemptedCount = Object.values(problemStatus).filter(s => s === 'attempted').length;

        reportData.codingEvaluation = {
          language: codingEval.language,
          isSubmitted: codingEval.isSubmitted,
          timeLeft: codingEval.timeLeft,
          problemStatus,
          totalProblems: Object.keys(problemStatus).length,
          solvedProblems: solvedCount,
          attemptedProblems: attemptedCount,
          codeSubmissions: (codingEval.codeSubmissions || []).map(sub => ({
            problemId: sub.problemId,
            code: sub.code,
            language: sub.language,
            timestamp: sub.timestamp.toISOString(),
            passed: sub.passed,
            results: sub.results
          })),
          codeRuns: (codingEval.codeRuns || []).map(run => ({
            problemId: run.problemId,
            code: run.code,
            language: run.language,
            timestamp: run.timestamp.toISOString(),
            passed: run.passed,
            results: run.results
          })),
          createdAt: codingEval.createdAt.toISOString(),
          updatedAt: codingEval.updatedAt.toISOString()
        };
      }

      // Add technical interview evaluation if exists
      if (technicalEval) {
        const violations = (technicalEval.videoLogs || []).filter(
          (log: any) => log.violationType
        ).length;

        reportData.technicalInterviewEvaluation = {
          status: technicalEval.status,
          startedAt: technicalEval.startedAt.toISOString(),
          endedAt: technicalEval.endedAt?.toISOString(),
          overallScore: technicalEval.overallScore,
          verdict: technicalEval.verdict,
          aiSummary: technicalEval.aiSummary,
          totalQuestions: (technicalEval.askedQuestions || []).length,
          askedQuestions: (technicalEval.askedQuestions || []).map((q: any) => ({
            question: q.question,
            category: q.category,
            difficulty: q.difficulty,
            queueType: q.queueType,
            userAnswer: q.userAnswer,
            evaluation: q.evaluation ? {
              correctness: q.evaluation.correctness,
              reason: q.evaluation.reason
            } : undefined
          })),
          videoLogs: {
            totalLogs: (technicalEval.videoLogs || []).length,
            violations
          }
        };
      }

      // Add HR interview evaluation if exists
      if (hrEval) {
        reportData.hrInterviewEvaluation = {
          status: hrEval.status,
          startedAt: hrEval.startedAt.toISOString(),
          endedAt: hrEval.endedAt?.toISOString(),
          overallScore: hrEval.overallScore,
          verdict: hrEval.verdict,
          aiSummary: hrEval.aiSummary,
          aiScores: hrEval.aiScores,
          totalQuestions: (hrEval.askedQuestions || []).length,
          askedQuestions: (hrEval.askedQuestions || []).map((q: any) => ({
            question: q.question,
            category: q.category,
            difficulty: q.difficulty,
            queueType: q.queueType,
            userAnswer: q.userAnswer,
            evaluation: q.evaluation ? {
              correctness: q.evaluation.correctness,
              reason: q.evaluation.reason
            } : undefined
          }))
        };
      }

      return createSuccessResponse('Evaluation data fetched successfully', reportData);
    });
  });
}
