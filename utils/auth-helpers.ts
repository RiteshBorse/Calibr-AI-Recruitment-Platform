import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAction, logError } from "@/utils/action-helpers";

// Helper function for session validation
export async function validateSession(): Promise<{ success: boolean; candidateId?: string; error?: string }> {
  const session = await getServerSession(authOptions);
  const candidateId = session?.user._id;
  
  if (!candidateId) {
    logError("Session validation failed - no user ID");
    return {
      success: false,
      error: "User session not found"
    };
  }
  
  return { success: true, candidateId };
}

// Helper function for authentication that can be used in any action
export async function requireAuth(): Promise<string> {
  const { success, candidateId, error } = await validateSession();
  if (!success || !candidateId) {
    throw new Error(error || "Unauthorized - Please log in");
  }
  return candidateId;
}
