"use server";

import { connectToDatabase } from "@/utils/connectDb";
import TechnicalInterviewModel from "@/models/technicalInterview.model";
import { buildQueue1Prompt, buildQueue2Prompt, buildAnalysisPrompt, buildFollowupPrompt, buildQueue1BatchPrompt } from "@/ai-engine/prompts/technicalInterview";
import TechnicalInterviewEvaluationModel from "@/models/technicalInterviewEvaluation.model";
import mongoose from "mongoose";
import { requireAuth } from "@/utils/auth-helpers";
import { Question, Queues, generateId, ensureIds, callGeminiAPI, randomizeQueue1 } from "@/utils/interview";
import type { QuestionEntry } from "@/lib/interview/types";

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

export async function generateQuestions(resume: string): Promise<{ success: boolean; queues?: Queues; error?: string }> {
  try {
    // Generate Queue 1 questions
    const q1Prompt = buildQueue1Prompt(resume);

    const q1Result = await callGeminiAPI(q1Prompt);
    let queue1: Question[] = [];

    if (q1Result) {
      try {
        const jsonMatch = q1Result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          queue1 = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    }

    queue1 = ensureIds(queue1);

    // Randomize Queue 1 while maintaining intro/outro and 20% non-technical limit
    queue1 = randomizeQueue1(queue1);

    // Generate Queue 2 questions for technical topics
    const technicalQuestions = queue1.filter(q => q.category === "technical" && q.answer);
    let queue2: Question[] = [];

    for (const tq of technicalQuestions) {
      const q2Prompt = buildQueue2Prompt(tq.question, tq.answer!);

      const q2Result = await callGeminiAPI(q2Prompt);
      
      if (q2Result) {
        try {
          const jsonMatch = q2Result.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const questions = JSON.parse(jsonMatch[0]);
            const deepDiveQuestions = questions.map((q: any) => ({
              question: q.question,
              category: 'technical' as const,
              difficulty: q.difficulty,
              answer: q.answer,
              parentQuestion: tq.question,
              topicId: tq.topicId, // Link to parent topic
              id: generateId()
            }));
            queue2.push(...deepDiveQuestions);
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
    }

    return {
      success: true,
      queues: {
        queue1,
        queue2,
        queue3: []
      }
    };

  } catch (error) {
    console.error('Error generating questions:', error);
    return { success: false, error: 'Failed to generate questions' };
  }
}

// Batched generation: generate a limited number of questions (e.g., 20% of target)
export async function generateQuestionsBatch(resume: string, count: number): Promise<{ success: boolean; questions?: Question[]; error?: string }> {
  try {
    const prompt = buildQueue1BatchPrompt(resume, count);
    const result = await callGeminiAPI(prompt);
    let questions: Question[] = [];
    if (result) {
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    }
    questions = ensureIds(questions);
    questions = randomizeQueue1(questions);
    return { success: true, questions };
  } catch (error) {
    console.error('Error generating batch questions:', error);
    return { success: false, error: 'Failed to generate batch questions' };
  }
}

// Evaluation lifecycle
export async function startEvaluation(technicalInterviewId: string, assessmentId?: string | null, jobId?: string | null) {
  try {
    await connectToDatabase();
    const candidateId = await requireAuth();
    const doc = await TechnicalInterviewEvaluationModel.create({
      candidateId: new mongoose.Types.ObjectId(candidateId),
      technicalInterviewId: new mongoose.Types.ObjectId(technicalInterviewId),
      assessmentId: assessmentId ? new mongoose.Types.ObjectId(assessmentId) : undefined,
      jobId: jobId ? new mongoose.Types.ObjectId(jobId) : undefined,
      startedAt: new Date(),
    });
    const id = (doc && (doc as any)._id) ? (doc as any)._id.toString() : undefined;
    return { success: true, evaluationId: id };
  } catch (error) {
    console.error('Error starting evaluation:', error);
    return { success: false, error: 'Failed to start evaluation' };
  }
}

export async function appendQA(
  technicalInterviewId: string, 
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

    await TechnicalInterviewEvaluationModel.findOneAndUpdate(
      { technicalInterviewId: new mongoose.Types.ObjectId(technicalInterviewId) },
      { $push: { entries: dbEntry } },
      { upsert: true, new: true }
    ).lean();
    
    return { success: true };
  } catch (error) {
    console.error('Error appending QA:', error);
    return { success: false, error: 'Failed to append QA' };
  }
}

export async function analyzeAnswer(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  currentQueues: Queues,
  currentQuestion: Question
): Promise<{ updatedQueues?: Queues; correctness?: number }> {
  try {
    // Analyze correctness
    const analysisPrompt = buildAnalysisPrompt(question, correctAnswer, userAnswer);

    const analysisResult = await callGeminiAPI(analysisPrompt);
    let correctness = 50;

    if (analysisResult) {
      try {
        const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          correctness = analysis.correctness || 50;
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    }

    const updatedQueues = { ...currentQueues };

    // Apply flow rules based on correctness and question type
    if (correctness <= 10) {
      // Generate follow-up for very wrong answer
      const followupPrompt = buildFollowupPrompt(question, userAnswer);

      const followupResult = await callGeminiAPI(followupPrompt);
      
      if (followupResult) {
        try {
          const jsonMatch = followupResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const followup = JSON.parse(jsonMatch[0]);
            updatedQueues.queue3.push({
              question: followup.question,
              category: 'followup',
              parentQuestion: question,
              topicId: currentQuestion.topicId,
              id: generateId()
            });

            // Discard all depth questions for this topic (Queue 2)
            if (currentQuestion.topicId) {
              updatedQueues.queue2 = updatedQueues.queue2.filter(
                q => q.topicId !== currentQuestion.topicId
              );
            }
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
    } else if (correctness >= 80 && currentQuestion.category === 'technical') {
      // Progress to next difficulty level
      const topicId = currentQuestion.topicId;
      
      if (!currentQuestion.difficulty) {
        // Base question with high score → move MEDIUM to Queue 1
        const mediumQ = updatedQueues.queue2.find(
          q => q.topicId === topicId && q.difficulty === 'medium'
        );
        if (mediumQ) {
          updatedQueues.queue2 = updatedQueues.queue2.filter(q => q.id !== mediumQ.id);
          updatedQueues.queue1.unshift(mediumQ); // Add to front of Queue 1
        }
      } else if (currentQuestion.difficulty === 'medium') {
        // Medium question with high score → move HARD to Queue 1
        const hardQ = updatedQueues.queue2.find(
          q => q.topicId === topicId && q.difficulty === 'hard'
        );
        if (hardQ) {
          updatedQueues.queue2 = updatedQueues.queue2.filter(q => q.id !== hardQ.id);
          updatedQueues.queue1.unshift(hardQ); // Add to front of Queue 1
        }
      }
    }
    // 10-80%: Just proceed to next question (no special action)

    return { updatedQueues, correctness };

  } catch (error) {
    console.error('Error analyzing answer:', error);
    return {};
  }
}

/**
 * Check video processing violations from localStorage/session
 * This should be called from client-side video processing component
 */
// This function is server-side but needs client data
// For now it's a placeholder - actual implementation should use a client-side hook
export async function checkVideoViolations(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _interviewId: string
) {
  // NOTE: This is a server action and cannot directly access client-side videoQueueIntegration
  // The video state should be passed from client or stored in a way accessible to server
  // For now, returning default values - actual implementation needs client-server bridge
  
  return {
    violation_count: 0,
    mood_state: 'neutral',
    should_end: false,
    mood_changed: false
  };
}