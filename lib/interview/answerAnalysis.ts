"use server";

import { generateId, callGeminiAPI } from "@/utils/interview";

/**
 * Shared answer analysis logic for both technical and HR interviews
 * Handles Q2 deletion and Q3 generation based on correctness thresholds
 */

interface AnalysisResult {
  shouldDeleteQ2: boolean;
  shouldGenerateQ3: boolean;
  q3Question?: {
    id: string;
    question: string;
    category: string;
    parentQuestionId: string;
  };
  q2IdsToDelete: string[];
}

/**
 * Analyze answer and determine next actions based on correctness
 * @param correctness - Score percentage (0-100)
 * @param currentQuestionId - ID of the current question being answered
 * @param question - The question text
 * @param userAnswer - The user's answer
 * @param allAskedQuestions - All questions in the database (to find next Q2s in serial order)
 * @param buildFollowupPrompt - Function to build the Q3 followup prompt
 */
export async function analyzeAnswerFlow(
  correctness: number,
  currentQuestionId: string,
  question: string,
  userAnswer: string,
  allAskedQuestions: any[],
  buildFollowupPrompt: (question: string, userAnswer: string) => string
): Promise<AnalysisResult> {
  const result: AnalysisResult = {
    shouldDeleteQ2: false,
    shouldGenerateQ3: false,
    q2IdsToDelete: [],
  };

  // Find the index of the current question
  const currentIndex = allAskedQuestions.findIndex(q => q.id === currentQuestionId);
  
  if (currentIndex === -1) {
    console.warn('[analyzeAnswerFlow] Current question not found in asked questions');
    return result;
  }

  // Score < 20%: Generate Q3 followup + Delete next Q2s
  if (correctness < 20) {
    console.log(`[analyzeAnswerFlow] Score ${correctness}% < 20% - generating Q3 followup and deleting Q2s`);
    
    result.shouldGenerateQ3 = true;
    result.shouldDeleteQ2 = true;

    // Generate Q3 followup question
    try {
      const followupPrompt = buildFollowupPrompt(question, userAnswer);
      const followupResult = await callGeminiAPI(followupPrompt);
      
      if (followupResult) {
        const jsonMatch = followupResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const followup = JSON.parse(jsonMatch[0]);
          result.q3Question = {
            id: generateId(),
            question: followup.question,
            category: 'followup',
            parentQuestionId: currentQuestionId,
          };
          console.log(`[analyzeAnswerFlow] ✓ Generated Q3 followup question`);
        }
      }
    } catch (error) {
      console.error('[analyzeAnswerFlow] Error generating Q3:', error);
    }

    // Find next 2 Q2 questions in serial order (medium + hard)
    const nextQ2s = allAskedQuestions
      .slice(currentIndex + 1) // Questions after current
      .filter(q => q.queueType === 'Q2' && (!q.userAnswer || q.userAnswer.trim().length === 0))
      .slice(0, 2); // Take first 2 unanswered Q2s

    result.q2IdsToDelete = nextQ2s.map(q => q.id);
    console.log(`[analyzeAnswerFlow] Found ${result.q2IdsToDelete.length} Q2 questions to delete: ${result.q2IdsToDelete.join(', ')}`);
  }
  // Score 20-50%: Just delete next Q2s (no Q3)
  else if (correctness < 50) {
    console.log(`[analyzeAnswerFlow] Score ${correctness}% between 20-50% - deleting Q2s only`);
    
    result.shouldDeleteQ2 = true;

    // Find next 2 Q2 questions in serial order (medium + hard)
    const nextQ2s = allAskedQuestions
      .slice(currentIndex + 1) // Questions after current
      .filter(q => q.queueType === 'Q2' && (!q.userAnswer || q.userAnswer.trim().length === 0))
      .slice(0, 2); // Take first 2 unanswered Q2s

    result.q2IdsToDelete = nextQ2s.map(q => q.id);
    console.log(`[analyzeAnswerFlow] Found ${result.q2IdsToDelete.length} Q2 questions to delete: ${result.q2IdsToDelete.join(', ')}`);
  }
  // Score >= 50%: Keep Q2s, proceed normally
  else {
    console.log(`[analyzeAnswerFlow] Score ${correctness}% >= 50% - keeping Q2 questions`);
  }

  return result;
}
