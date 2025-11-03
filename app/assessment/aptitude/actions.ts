'use server'
import { connectToDatabase } from '@/utils/connectDb'
import Aptitude from '@/models/aptitude.model'
import Candidate from '@/models/candidate.model'
import TestResult from '@/models/aptitudeEvaluation.model'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import questionsData from './aptitude_questions.json'
import type { 
  FetchTestSessionResponse, 
  AptitudeQuestion, 
  ProcessedQuestion,
  AptitudeData 
} from './types'

// Type guard to check if questions data is valid
function isValidQuestionsData(data: any): data is { questions: AptitudeQuestion[] } {
  return data && Array.isArray(data.questions) && data.questions.length > 0;
}

// Process raw question data to match interface
function processQuestion(question: AptitudeQuestion): ProcessedQuestion {
  return {
    id: question.id,
    text: question.question,
    options: question.options,
    correctAnswer: question.options.findIndex(option => option === question.correct_answer)
  };
}

export async function fetchTestSession(aptitudeId: string): Promise<FetchTestSessionResponse> {
  try {
    await connectToDatabase()

   
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }

    if (!aptitudeId) {
      return { 
        success: false, 
        error: 'Aptitude ID is required' 
      };
    }

  
    const authenticatedCandidateId = session.user?._id;
    
    if (!authenticatedCandidateId) {
      return { 
        success: false, 
        error: 'User ID not found in session' 
      };
    }
    
    console.log(' Validating candidate:', authenticatedCandidateId);
    console.log(' For aptitude assessment:', aptitudeId);

    const aptitude = await Aptitude.findById(aptitudeId);
    
    if (!aptitude) {
      // Aptitude assessment not found
      return { 
        success: false, 
        error: 'No aptitude assessment found for the provided ID' 
      };
    }

    

    // Validate candidate exists
    const candidate = await Candidate.findById(authenticatedCandidateId);
    if (!candidate) {
      return {
        success: false,
        error: 'Candidate not found. Please check your candidate ID.'
      };
    }


    // Check if candidate is authorized for this assessment
    const isAuthorized = aptitude.candidateIds.some(id => id.toString() === String(candidate._id));
    // Checking candidate authorization
    
    if (!isAuthorized) {
      // Candidate not authorized for this assessment
      return {
        success: false,
        error: 'You are not authorized to take this assessment.'
      };
    }

  

    // Check if candidate has already attempted this assessment
    const existingResult = await TestResult.findOne({
      candidateId: authenticatedCandidateId,
      aptitudeId: aptitudeId
    });

    if (existingResult) {
      // Block if exam is completed OR terminated due to warnings
      if (existingResult.status === 'completed' || existingResult.status === 'terminated' || existingResult.terminatedDueToWarnings) {
        return {
          success: false,
          error: 'already_attempted'
        };
      }
      
      if (existingResult.status === 'incomplete' && !existingResult.terminatedDueToWarnings) {
        // Check if test time has expired
        const elapsed = new Date().getTime() - existingResult.startTime.getTime();
        const aptitude = await Aptitude.findById(aptitudeId);
        
        if (aptitude) {
          const totalDurationMs = aptitude.duration * 60 * 1000;
          const timeLeft = Math.max(0, totalDurationMs - elapsed);
          
          // If time expired, mark as completed and block access
          if (timeLeft <= 0) {
            await TestResult.findByIdAndUpdate(existingResult._id, {
              status: 'completed',
              submittedAt: new Date(),
              terminationReason: 'Time expired'
            });
            
            return {
              success: false,
              error: 'Test time has expired. You cannot continue this test.'
            };
          }
        }
        
        // Time is still valid, allow continuation
        // Continue with normal flow to return test data
      }
    }

    if (!isValidQuestionsData(questionsData)) {
      return { 
        success: false, 
        error: 'Invalid questions data structure' 
      };
    }

    const questionsArray = questionsData.questions as AptitudeQuestion[];
    const questionIds = aptitude.questionIds || [];
    
    // Filter questions based on aptitude 
    const matchingQuestions = questionsArray
      .filter((q: AptitudeQuestion) => questionIds.includes(q.id))
      .map(processQuestion);
    
    // Questions loaded successfully
    
    const aptitudeData: AptitudeData = {
      _id: String(aptitude._id),
      totalQuestions: aptitude.totalQuestions,
      passingScore: aptitude.passingScore,
      duration: aptitude.duration,
      status: aptitude.status,
      sections: aptitude.sections.map(section => ({
        name: section.name,
        description: section.description || '',
        questionIds: section.questionIds,
        timeLimit: section.timeLimit || undefined
      })),
      warnings: {
        fullscreen: aptitude.warnings.fullscreen,
        tabSwitch: aptitude.warnings.tabSwitch,
        audio: aptitude.warnings.audio
      },
      matchingQuestions: matchingQuestions.length,
      allQuestions: matchingQuestions
    };

    return {
      success: true,
      data: aptitudeData
    };

  } catch (error) {
    console.error('❌ Error in fetchTestSession:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}


export async function submitTest(
  aptitudeId: string, 
  candidateId: string, 
  answers: Record<string, number>,
  timeTaken: number,
  warnings?: {
    tabSwitch: { count: number; maxAllowed: number; exceeded: boolean };
    fullscreen: { count: number; maxAllowed: number; exceeded: boolean };
    audio: { count: number; maxAllowed: number; exceeded: boolean };
  },
  terminatedDueToWarnings?: boolean,
  terminationReason?: string
): Promise<{success: boolean, data?: any, error?: string}> {
  try {
    console.log('📝 Actions: submitTest called with warnings:', warnings);
    await connectToDatabase();
    
    // Get server session for authentication
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }

    // Verify the candidateId matches the authenticated user
    if (session.user?._id !== candidateId) {
      return { 
        success: false, 
        error: 'Unauthorized: Candidate ID mismatch' 
      };
    }
    
    // Submitting test with candidate data

    // Get aptitude details
    const aptitude = await Aptitude.findById(aptitudeId);
    if (!aptitude) {
      return { success: false, error: 'Aptitude assessment not found' };
    }

    // Get questions data
    if (!isValidQuestionsData(questionsData)) {
      return { success: false, error: 'Invalid questions data' };
    }

    const questionsArray = questionsData.questions as AptitudeQuestion[];
    const questionIds = aptitude.questionIds || [];
    
    // Filter questions based on aptitude
    const matchingQuestions = questionsArray
      .filter((q: AptitudeQuestion) => questionIds.includes(q.id))
      .map(processQuestion);

    // Calculate score
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    // Create sections for scoring
    const sections = [
      { name: 'A', questions: matchingQuestions.slice(0, Math.ceil(matchingQuestions.length / 4)) },
      { name: 'B', questions: matchingQuestions.slice(Math.ceil(matchingQuestions.length / 4), Math.ceil(matchingQuestions.length / 2)) },
      { name: 'C', questions: matchingQuestions.slice(Math.ceil(matchingQuestions.length / 2), Math.ceil(3 * matchingQuestions.length / 4)) },
      { name: 'D', questions: matchingQuestions.slice(Math.ceil(3 * matchingQuestions.length / 4)) }
    ];

    sections.forEach(section => {
      section.questions.forEach((question, idx) => {
        const questionKey = `${section.name}-${idx + 1}`;
        const userAnswer = answers[questionKey];
        const correctAnswer = question.correctAnswer ?? -1;
        
        if (userAnswer === undefined) {
          unattemptedCount++;
        } else if (userAnswer === correctAnswer) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      });
    });

    const totalQuestions = matchingQuestions.length;
    const score = correctCount;
    const percentage = (score / totalQuestions) * 100;
    const passed = percentage >= aptitude.passingScore;

    // Score calculation completed

    // Save test result (without storing correct answers - they're in questions data)
    const warningsToSave = warnings || {
      tabSwitch: { count: 0, maxAllowed: aptitude.warnings.tabSwitch, exceeded: false },
      fullscreen: { count: 0, maxAllowed: aptitude.warnings.fullscreen, exceeded: false },
      audio: { count: 0, maxAllowed: aptitude.warnings.audio, exceeded: false }
    };
    
    console.log('💾 Actions: Saving warnings to database:', warningsToSave);
    
    // Find and UPDATE existing test result instead of creating new one
    const existingTestResult = await TestResult.findOne({
      candidateId,
      aptitudeId,
      status: 'incomplete'
    });

    if (!existingTestResult) {
      return { success: false, error: 'No active test session found. Please start the test first.' };
    }

   
    const finalStatus = terminatedDueToWarnings ? 'terminated' : 'completed';

    
    await TestResult.findByIdAndUpdate(
      existingTestResult._id,
      {
        answers, 
        score,
        totalQuestions,
        correctCount,
        incorrectCount,
        unattemptedCount,
        percentage,
        passed,
        passingScore: aptitude.passingScore,
        timeTaken,
        submittedAt: new Date(),
        status: finalStatus,
        warnings: warningsToSave,
        terminatedDueToWarnings: terminatedDueToWarnings || false,
        terminationReason: terminationReason
      },
      { new: true }
    );

    console.log(' Test result updated successfully');
    // Test result updated in database

    return {
      success: true,
      data: {
        score,
        totalQuestions,
        correctCount,
        incorrectCount,
        unattemptedCount,
        percentage,
        passed,
        passingScore: aptitude.passingScore,
        timeTaken
      }
    };

  } catch (error) {
    console.error(' Error in submitTest:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Auto-save test when warnings exceeded
export async function autoSaveTest(
  aptitudeId: string,
  candidateId: string,
  answers: Record<string, number>,
  timeTaken: number,
  warnings: {
    tabSwitch: { count: number; maxAllowed: number; exceeded: boolean };
    fullscreen: { count: number; maxAllowed: number; exceeded: boolean };
    audio: { count: number; maxAllowed: number; exceeded: boolean };
  },
  terminationReason: string
): Promise<{success: boolean, data?: any, error?: string}> {
  try {
    await connectToDatabase();
    
    // Get server session for authentication
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }

    // Verify the candidateId matches the authenticated user
    if (session.user?._id !== candidateId) {
      return { 
        success: false, 
        error: 'Unauthorized: Candidate ID mismatch' 
      };
    }
    
    // Auto-saving test due to warnings exceeded

    // Get aptitude details
    const aptitude = await Aptitude.findById(aptitudeId);
    if (!aptitude) {
      return { success: false, error: 'Aptitude assessment not found' };
    }

    // Get questions data for validation
    if (!isValidQuestionsData(questionsData)) {
      return { success: false, error: 'Invalid questions data' };
    }

    const questionsArray = questionsData.questions as AptitudeQuestion[];
    const questionIds = aptitude.questionIds || [];
    
    // Filter questions based on aptitude
    const matchingQuestions = questionsArray
      .filter((q: AptitudeQuestion) => questionIds.includes(q.id))
      .map(processQuestion);

    // Calculate score with current answers
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    // Create sections for scoring
    const sections = [
      { name: 'A', questions: matchingQuestions.slice(0, Math.ceil(matchingQuestions.length / 4)) },
      { name: 'B', questions: matchingQuestions.slice(Math.ceil(matchingQuestions.length / 4), Math.ceil(matchingQuestions.length / 2)) },
      { name: 'C', questions: matchingQuestions.slice(Math.ceil(matchingQuestions.length / 2), Math.ceil(3 * matchingQuestions.length / 4)) },
      { name: 'D', questions: matchingQuestions.slice(Math.ceil(3 * matchingQuestions.length / 4)) }
    ];

    sections.forEach(section => {
      section.questions.forEach((question, idx) => {
        const questionKey = `${section.name}-${idx + 1}`;
        const userAnswer = answers[questionKey];
        const correctAnswer = question.correctAnswer ?? -1;
        
        if (userAnswer === undefined) {
          unattemptedCount++;
        } else if (userAnswer === correctAnswer) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      });
    });

    const totalQuestions = matchingQuestions.length;
    const score = correctCount;
    const percentage = (score / totalQuestions) * 100;
    const passed = percentage >= aptitude.passingScore;

    // Auto-save score calculation completed

    // Find and UPDATE existing test result instead of creating new one
    const existingTestResult = await TestResult.findOne({
      candidateId,
      aptitudeId,
      status: 'incomplete'
    });

    if (!existingTestResult) {
      return { success: false, error: 'No active test session found. Please start the test first.' };
    }

    // UPDATE existing record instead of creating new one
    await TestResult.findByIdAndUpdate(
      existingTestResult._id,
      {
        answers,
        score,
        totalQuestions,
        correctCount,
        incorrectCount,
        unattemptedCount,
        percentage,
        passed,
        passingScore: aptitude.passingScore,
        timeTaken,
        submittedAt: new Date(),
        status: 'terminated', 
        warnings,
        terminatedDueToWarnings: true,
        terminationReason
      },
      { new: true }
    );

    

    return {
      success: true,
      data: {
        score,
        totalQuestions,
        correctCount,
        incorrectCount,
        unattemptedCount,
        percentage,
        passed,
        passingScore: aptitude.passingScore,
        timeTaken,
        terminatedDueToWarnings: true,
        terminationReason
      }
    };

  } catch (error) {
    console.error('Error in autoSaveTest:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Secure server-side test session management
export async function startTestSession(aptitudeId: string): Promise<{success: boolean, data?: { startTime: string; timeLeft: number }, error?: string}> {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?._id) {
      return { success: false, error: 'Authentication required' };
    }

    const candidateId = session.user._id;

    // Check if test already started (incomplete and not terminated due to warnings)
    const existingResult = await TestResult.findOne({
      candidateId,
      aptitudeId,
      status: 'incomplete',
      terminatedDueToWarnings: { $ne: true }
    });

    if (existingResult) {
      // Return existing start time and calculate remaining time from server
      const startTime = existingResult.startTime;
      const now = new Date();
      const elapsed = now.getTime() - startTime.getTime();
      const aptitude = await Aptitude.findById(aptitudeId);
      
      if (!aptitude) {
        return { success: false, error: 'Aptitude not found' };
      }

      const totalDurationMs = aptitude.duration * 60 * 1000;
      const timeLeft = Math.max(0, totalDurationMs - elapsed);

      // If time has expired, mark test as completed and return error
      if (timeLeft <= 0) {
        // Auto-submit the test as expired
        await TestResult.findByIdAndUpdate(existingResult._id, {
          status: 'completed',
          submittedAt: new Date(),
          terminatedDueToWarnings: false,
          terminationReason: 'Time expired'
        });
        
        return { 
          success: false, 
          error: 'Test time has expired. You cannot continue this test.' 
        };
      }

      // Time is still valid, continue with existing session
      return {
        success: true,
        data: {
          startTime: startTime.toISOString(),
          timeLeft
        }
      };
    }

    // Create new test session with server timestamp
    const startTime = new Date();
    const aptitude = await Aptitude.findById(aptitudeId);
    
    if (!aptitude) {
      return { success: false, error: 'Aptitude not found' };
    }

    // Create test result record with start time
    await TestResult.create({
      candidateId,
      aptitudeId,
      answers: {},
      score: 0,
      totalQuestions: aptitude.totalQuestions,
      correctCount: 0,
      incorrectCount: 0,
      unattemptedCount: aptitude.totalQuestions,
      percentage: 0,
      passed: false,
      passingScore: aptitude.passingScore,
      timeTaken: 0,
      startTime, // Server timestamp
      status: 'incomplete',
      warnings: {
        tabSwitch: { count: 0, maxAllowed: aptitude.warnings.tabSwitch, exceeded: false },
        fullscreen: { count: 0, maxAllowed: aptitude.warnings.fullscreen, exceeded: false },
        audio: { count: 0, maxAllowed: aptitude.warnings.audio, exceeded: false }
      },
      terminatedDueToWarnings: false
    });

    const totalDurationMs = aptitude.duration * 60 * 1000;

    return {
      success: true,
      data: {
        startTime: startTime.toISOString(),
        timeLeft: totalDurationMs
      }
    };

  } catch (error) {
    console.error(' Error starting test session:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function getServerTimeLeft(aptitudeId: string): Promise<{success: boolean, data?: { timeLeft: number; isValid: boolean }, error?: string}> {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?._id) {
      return { success: false, error: 'Authentication required' };
    }

    const candidateId = session.user._id;

    const testResult = await TestResult.findOne({
      candidateId,
      aptitudeId,
      status: { $ne: 'completed' }
    });

    if (!testResult) {
      return { success: false, error: 'Test session not found' };
    }

    const aptitude = await Aptitude.findById(aptitudeId);
    if (!aptitude) {
      return { success: false, error: 'Aptitude not found' };
    }

    // Calculate time left using server time
    const now = new Date();
    const elapsed = now.getTime() - testResult.startTime.getTime();
    const totalDurationMs = aptitude.duration * 60 * 1000;
    const timeLeft = Math.max(0, totalDurationMs - elapsed);

    return {
      success: true,
      data: {
        timeLeft,
        isValid: timeLeft > 0
      }
    };

  } catch (error) {
    console.error('Error getting server time left:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

