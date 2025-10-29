"use server";

import { connectToDatabase } from "@/utils/connectDb";
import HRInterviewEvaluationModel from "@/models/hrInterviewEvaluation.model";

/**
 * HR Interview Storage Actions
 * Handles Q1 questions storage, asked questions management, and chunk preprocessing state
 * Mirrors technical interview structure but NO Q2 questions
 */

// ============================================================================
// Q1 Questions Storage
// ============================================================================

export async function storeQ1Questions(
  interviewId: string,
  q1Questions: Array<{
    id: string;
    question: string;
    category: 'technical' | 'non-technical';
    difficulty?: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();

    const evaluation = await HRInterviewEvaluationModel.findOne({
      hrInterviewId: interviewId,
      status: 'in_progress'
    });

    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    evaluation.q1Questions = q1Questions;
    await evaluation.save();

    console.log(`[HR Storage] Stored ${q1Questions.length} Q1 questions for interview ${interviewId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[HR Storage] Error storing Q1 questions:', error);
    return { success: false, error: error.message };
  }
}

export async function getQ1QuestionsForChunk(
  interviewId: string,
  chunkNumber: number
): Promise<{
  success: boolean;
  questions?: Array<{
    id: string;
    question: string;
    category: 'technical' | 'non-technical';
    difficulty?: string;
  }>;
  error?: string;
}> {
  try {
    await connectToDatabase();

    const evaluation = await HRInterviewEvaluationModel.findOne({
      hrInterviewId: interviewId,
      status: 'in_progress'
    }).lean();

    if (!evaluation || !evaluation.q1Questions) {
      return { success: false, error: 'Q1 questions not found' };
    }

    // Mod 5 chunking: chunk 0 = questions 0-4, chunk 1 = questions 5-9, etc.
    const startIndex = chunkNumber * 5;
    const endIndex = startIndex + 5;
    const chunkQuestions = evaluation.q1Questions.slice(startIndex, endIndex);

    // Serialize to plain JSON-safe objects
    const serializedQuestions = JSON.parse(JSON.stringify(chunkQuestions));

    console.log(`[HR Storage] Retrieved ${chunkQuestions.length} Q1 questions for chunk ${chunkNumber}`);
    return { success: true, questions: serializedQuestions };
  } catch (error: any) {
    console.error('[HR Storage] Error retrieving Q1 questions for chunk:', error);
    return { success: false, error: error.message };
  }
}

export async function getQ1Questions(
  interviewId: string
): Promise<{
  success: boolean;
  q1Questions?: Array<{
    id: string;
    question: string;
    category: 'technical' | 'non-technical';
    difficulty?: string;
  }>;
  preprocessedChunks?: number[];
  error?: string;
}> {
  try {
    await connectToDatabase();

    const evaluation = await HRInterviewEvaluationModel.findOne({
      hrInterviewId: interviewId,
      status: 'in_progress'
    }).lean();

    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    const serializedQ1 = JSON.parse(JSON.stringify(evaluation.q1Questions || []));
    const preprocessedChunks = evaluation.preprocessedChunks || [];

    return {
      success: true,
      q1Questions: serializedQ1,
      preprocessedChunks: preprocessedChunks
    };
  } catch (error: any) {
    console.error('[HR Storage] Error retrieving Q1 questions:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Asked Questions Management
// ============================================================================

export async function addAskedQuestion(
  interviewId: string,
  question: {
    id: string;
    question: string;
    category: 'technical' | 'non-technical';
    difficulty?: string;
    queueType: 'Q1' | 'Q2' | 'Q3';
    parentQuestionId?: string;
    askedAt?: Date;
    preprocessed: boolean;
    answer?: string;
    source_urls?: string[];
    audioUrl?: string;
    userAnswer?: string;
  },
  insertAfterQuestionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();

    const evaluation = await HRInterviewEvaluationModel.findOne({
      hrInterviewId: interviewId,
      status: 'in_progress'
    });

    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    if (!evaluation.askedQuestions) {
      evaluation.askedQuestions = [];
    }

    if (insertAfterQuestionId) {
      const parentIndex = evaluation.askedQuestions.findIndex(
        q => q.id === insertAfterQuestionId
      );
      
      if (parentIndex !== -1) {
        evaluation.askedQuestions.splice(parentIndex + 1, 0, question as any);
      } else {
        evaluation.askedQuestions.push(question as any);
      }
    } else {
      evaluation.askedQuestions.push(question as any);
    }

    await evaluation.save();

    console.log(`[HR Storage] Added question ${question.id} to askedQuestions (queueType: ${question.queueType})`);
    return { success: true };
  } catch (error: any) {
    console.error('[HR Storage] Error adding asked question:', error);
    return { success: false, error: error.message };
  }
}

export async function markQuestionAsked(
  interviewId: string,
  questionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();

    const result = await HRInterviewEvaluationModel.findOneAndUpdate(
      {
        hrInterviewId: interviewId,
        status: 'in_progress',
        'askedQuestions.id': questionId
      },
      {
        $set: {
          'askedQuestions.$.askedAt': new Date()
        }
      },
      { new: true }
    );

    if (!result) {
      return { success: false, error: 'Question not found to mark askedAt' };
    }

    console.log(`[HR Storage] Marked question ${questionId} as asked`);
    return { success: true };
  } catch (error: any) {
    console.error('[HR Storage] Error marking question askedAt:', error);
    return { success: false, error: error.message };
  }
}

export async function updateAskedQuestionAnswer(
  interviewId: string,
  questionId: string,
  userAnswer: string,
  evaluation?: {
    correctness: number;
    reason: string;
    route_action: 'followup_negative' | 'normal_flow' | 'followup_positive';
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();

    const evalModel = await HRInterviewEvaluationModel.findOne({
      hrInterviewId: interviewId,
      status: 'in_progress'
    });

    if (!evalModel) {
      return { success: false, error: 'Evaluation not found' };
    }

    const currentQuestion = evalModel.askedQuestions.find((q: any) => q.id === questionId);
    if (!currentQuestion) {
      return { success: false, error: 'Question not found in askedQuestions' };
    }

    currentQuestion.userAnswer = userAnswer;
    
    // Store the entire evaluation object
    if (evaluation) {
      currentQuestion.evaluation = {
        correctness: evaluation.correctness,
        reason: evaluation.reason,
        route_action: evaluation.route_action,
      };
    }

    await evalModel.save();
    
    console.log(`[HR Storage] Updated answer for question ${questionId} (score: ${evaluation?.correctness})`);
    return { success: true };
  } catch (error: any) {
    console.error('[HR Storage] Error updating answer:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update specific fields of an asked question (for preprocessing or evaluation)
 */
export async function updateAskedQuestion(
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
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();

    const evaluation = await HRInterviewEvaluationModel.findOne({
      hrInterviewId: interviewId,
      status: 'in_progress'
    });

    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    const question = evaluation.askedQuestions.find((q: any) => q.id === questionId);
    if (!question) {
      return { success: false, error: 'Question not found in askedQuestions' };
    }

    // Update only provided fields
    if (updates.answer !== undefined) question.answer = updates.answer;
    if (updates.source_urls !== undefined) question.source_urls = updates.source_urls;
    if (updates.audioUrl !== undefined) question.audioUrl = updates.audioUrl;
    if (updates.preprocessed !== undefined) question.preprocessed = updates.preprocessed;
    if (updates.askedAt !== undefined) question.askedAt = updates.askedAt;
    if (updates.userAnswer !== undefined) question.userAnswer = updates.userAnswer;
    if (updates.evaluation !== undefined) {
      question.evaluation = {
        correctness: updates.evaluation.correctness,
        reason: updates.evaluation.reason,
        route_action: updates.evaluation.route_action,
      };
    }

    await evaluation.save();
    return { success: true };
  } catch (error: any) {
    console.error('[HR Storage] Error updating asked question:', error);
    return { success: false, error: error.message };
  }
}

export async function removeAskedQuestion(
  interviewId: string,
  questionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();

    const evaluation = await HRInterviewEvaluationModel.findOne({
      hrInterviewId: interviewId,
      status: 'in_progress'
    });

    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    evaluation.askedQuestions = evaluation.askedQuestions.filter((q: any) => q.id !== questionId);
    await evaluation.save();

    console.log(`[HR Storage] Removed question ${questionId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[HR Storage] Error removing asked question:', error);
    return { success: false, error: error.message };
  }
}

export async function getAskedQuestions(
  interviewId: string
): Promise<{
  success: boolean;
  questions?: any[];
  error?: string;
}> {
  try {
    await connectToDatabase();

    const evaluation = await HRInterviewEvaluationModel.findOne({
      hrInterviewId: interviewId,
      status: 'in_progress'
    }).lean();

    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    const serialized = JSON.parse(JSON.stringify(evaluation.askedQuestions || []));
    return { success: true, questions: serialized };
  } catch (error: any) {
    console.error('[HR Storage] Error retrieving asked questions:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Chunk Preprocessing State
// ============================================================================

export async function markChunkPreprocessed(
  interviewId: string,
  chunkNumber: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();

    const result = await HRInterviewEvaluationModel.findOneAndUpdate(
      {
        hrInterviewId: interviewId,
        status: 'in_progress'
      },
      {
        $addToSet: { preprocessedChunks: chunkNumber }
      },
      { new: true }
    );

    if (!result) {
      return { success: false, error: 'Evaluation not found' };
    }

    console.log(`[HR Storage] Marked chunk ${chunkNumber} as preprocessed`);
    return { success: true };
  } catch (error: any) {
    console.error('[HR Storage] Error marking chunk as preprocessed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Video Logs Storage
// ============================================================================

export async function storeVideoLogs(
  interviewId: string,
  logs: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase();

    await HRInterviewEvaluationModel.findOneAndUpdate(
      { hrInterviewId: interviewId },
      { $push: { videoLogs: { $each: logs } } },
      { new: true }
    );

    console.log(`[HR Storage] Stored ${logs.length} video logs`);
    return { success: true };
  } catch (error: any) {
    console.error('[HR Storage] Error storing video logs:', error);
    return { success: false, error: error.message };
  }
}
