"use server";

import { connectToDatabase } from "@/utils/connectDb";
import TechnicalInterviewModel from "@/models/technicalInterview.model";

/**
 * Config Actions
 * Handles interview configuration retrieval
 */

export async function getInterviewConfig(interviewId: string) {
  try {
    await connectToDatabase();
    const config = await TechnicalInterviewModel.findById(interviewId).lean();
    
    if (!config) {
      return { success: false, error: 'Interview configuration not found' };
    }

    // Serialize to plain JSON-safe object (convert ObjectIds/Dates to strings)
    const serialized = JSON.parse(JSON.stringify(config));
    return { success: true, config: serialized };
  } catch (error) {
    console.error('Error fetching interview config:', error);
    return { success: false, error: 'Failed to fetch interview configuration' };
  }
}
