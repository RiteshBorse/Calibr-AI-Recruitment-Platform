"use server";

import TechnicalInterviewModel, { TechnicalInterview } from '@/models/technicalInterview.model';
import { Document } from 'mongoose';
import { 
  safeAction, 
  createSuccessResponse, 
  createErrorResponse, 
  withDatabase, 
  logSuccess,
  type ActionResponse 
} from '@/utils/action-helpers';

// Export TechnicalInterview type for use in forms
export type { TechnicalInterview };

// Create technical interview round
export async function createTechnicalInterviewRound(
  interviewData: Omit<TechnicalInterview, keyof Document | 'createdAt' | 'updatedAt'>
): Promise<ActionResponse<TechnicalInterview>> {
  return safeAction(async () => {
    return await withDatabase(async () => {
      const newInterview = new TechnicalInterviewModel(interviewData);
      const savedInterview = await newInterview.save();

      const interviewPlain = JSON.parse(JSON.stringify(savedInterview));
      delete interviewPlain.__v;

      logSuccess("Technical interview round created", interviewPlain._id);
      return createSuccessResponse("Technical interview round created successfully!", interviewPlain);
    }, "Failed to connect to database");
  }, "Failed to create technical interview round");
}

// Update technical interview round
export async function updateTechnicalInterviewRound(
  interviewId: string, 
  updateData: Partial<Omit<TechnicalInterview, keyof Document | 'createdAt' | 'updatedAt'>>
): Promise<ActionResponse<TechnicalInterview>> {
  return safeAction(async () => {
    return await withDatabase(async () => {
      const updatedInterview = await TechnicalInterviewModel.findByIdAndUpdate(
        interviewId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedInterview) {
        return createErrorResponse("Technical interview round not found");
      }

      const interviewPlain = JSON.parse(JSON.stringify(updatedInterview));
      delete interviewPlain.__v;

      logSuccess("Technical interview round updated", interviewId);
      return createSuccessResponse("Technical interview round updated successfully!", interviewPlain);
    }, "Failed to connect to database");
  }, "Failed to update technical interview round");
}

// Fetch technical interview round by ID
export async function fetchTechnicalInterviewById(interviewId: string): Promise<ActionResponse<TechnicalInterview>> {
  return safeAction(async () => {
    return await withDatabase(async () => {
      const interview = await TechnicalInterviewModel.findById(interviewId).lean();

      if (!interview) {
        return createErrorResponse("Technical interview round not found");
      }

      const interviewPlain = JSON.parse(JSON.stringify(interview));
      delete interviewPlain.__v;

      return createSuccessResponse("Technical interview round fetched successfully", interviewPlain);
    }, "Failed to connect to database");
  }, "Failed to fetch technical interview round");
}
