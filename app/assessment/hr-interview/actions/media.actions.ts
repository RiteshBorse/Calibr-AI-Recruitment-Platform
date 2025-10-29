"use server";

import { S3Service } from "@/lib/s3Service";

/**
 * HR Interview Media Actions
 * Handles S3 audio cleanup
 */

export async function deleteInterviewAudio(interviewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const prefix = `hr-interview/${interviewId}/`;
    
    await S3Service.deleteByPrefix(prefix);
    
    console.log(`[HR Media] ✓ Deleted all audio for interview ${interviewId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[HR Media] Error deleting interview audio:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to delete audio files'
    };
  }
}
