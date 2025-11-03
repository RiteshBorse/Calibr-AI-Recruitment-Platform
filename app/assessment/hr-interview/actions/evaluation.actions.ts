"use server";

import { connectToDatabase } from "@/utils/connectDb";
import HRInterviewEvaluationModel from "@/models/hrInterviewEvaluation.model";
import mongoose from "mongoose";
import { requireAuth } from "@/utils/auth-helpers";
import type { QuestionEntry } from "@/lib/interview/types";

/**
 * HR Interview Evaluation Actions
 * Handles evaluation lifecycle (start, append QA, complete)
 */

export async function startEvaluation(
  hrInterviewId: string,
  assessmentId?: string | null,
  jobId?: string | null
) {
  try {
    await connectToDatabase();
    const candidateId = await requireAuth();
    
    // Check if evaluation already exists for this interview and candidate
    const existingEvaluation = await HRInterviewEvaluationModel.findOne({
      hrInterviewId: new mongoose.Types.ObjectId(hrInterviewId),
      status: { $in: ['in_progress', 'not_started'] }
    });

    if (existingEvaluation) {
      const existingId = (existingEvaluation as any)._id.toString();
      console.log('[HR Evaluation] Using existing evaluation:', existingId);
      return { 
        success: true, 
        evaluationId: existingId,
        resumed: true 
      };
    }

    // Create new evaluation only if none exists
    const doc = await HRInterviewEvaluationModel.create({
      candidateId: new mongoose.Types.ObjectId(candidateId),
      hrInterviewId: new mongoose.Types.ObjectId(hrInterviewId),
      assessmentId: assessmentId ? new mongoose.Types.ObjectId(assessmentId) : undefined,
      jobId: jobId ? new mongoose.Types.ObjectId(jobId) : undefined,
      startedAt: new Date(),
      status: 'in_progress',
      q1Questions: [],  // Initialize empty arrays
      askedQuestions: [],
      preprocessedChunks: [],
    });
    const id = (doc && (doc as any)._id) ? (doc as any)._id.toString() : undefined;
    console.log('[HR Evaluation] Created new evaluation:', id);
    return { success: true, evaluationId: id, resumed: false };
  } catch (error) {
    console.error('[HR Evaluation] Error starting evaluation:', error);
    return { success: false, error: 'Failed to start evaluation' };
  }
}

export async function appendQA(
  hrInterviewId: string, 
  entry: QuestionEntry
) {
  try {
    await connectToDatabase();
    
    // Map QuestionEntry fields to database schema
    const dbEntry = {
      question: entry.question_text,
      correctAnswer: entry.ideal_answer,
      userAnswer: entry.user_answer,
      correctness: entry.correctness_score,
      askedAt: entry.timestamp || new Date(),
      // Store new fields
      question_text: entry.question_text,
      user_answer: entry.user_answer,
      ideal_answer: entry.ideal_answer,
      correctness_score: entry.correctness_score,
      source_urls: entry.source_urls,
      question_type: entry.question_type,
      queue_number: entry.queue_number,
      timestamp: entry.timestamp || new Date(),
      mood_state: entry.mood_state,
      violation_snapshot: entry.violation_snapshot
    };

    await HRInterviewEvaluationModel.findOneAndUpdate(
      { hrInterviewId: new mongoose.Types.ObjectId(hrInterviewId) },
      { $push: { entries: dbEntry } },
      { upsert: true, new: true }
    ).lean();
    
    return { success: true };
  } catch (error) {
    console.error('[HR Evaluation] Error appending QA:', error);
    return { success: false, error: 'Failed to append QA' };
  }
}

export async function completeInterview(interviewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();
    
    const result = await HRInterviewEvaluationModel.findOneAndUpdate(
      { hrInterviewId: new mongoose.Types.ObjectId(interviewId) },
      { 
        status: 'completed',
        endedAt: new Date()
      },
      { new: true }
    );

    if (!result) {
      return { success: false, error: 'Evaluation not found' };
    }

    console.log(`[HR Evaluation] ✓ Interview ${interviewId} marked as completed`);
    return { success: true };
  } catch (error) {
    console.error('[HR Evaluation] Error completing interview:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
