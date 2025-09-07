'use server'
import { connectToDatabase } from '@/utils/connectDb'
import Aptitude from '@/models/aptitude.model'
import questionsData from './aptitude_questions_31k.json'



export async function fetchTestSession(assessmentId?: string) {
  try {
    await connectToDatabase()
    
    
    const assessment = assessmentId
      ? await Aptitude.findOne({ assessmentId })
      : null;
    
    if (assessment) {
      
      try {
        const questionsArray = (questionsData as any).questions;
        if (Array.isArray(questionsArray)) {
          const questionIds = assessment.questionIds || [];
          
          
          const matchingQuestions = questionsArray
            .filter((q: any) => questionIds.includes(q.id));
          
          console.log(` Loaded ${matchingQuestions.length} questions for assessment`);
          
          return {
            success: true,
            data: {
              assessmentId: (assessment._id as any).toString(),
              totalQuestions: assessment.totalQuestions,
              duration: assessment.duration,
              matchingQuestions: matchingQuestions.length,
              allQuestions: matchingQuestions.map((q: any) => ({
                id: q.id,
                topic: q.topic,
                subtopic: q.subtopic,
                question: q.question,
                options: q.options,
                correctAnswer: q.correct_answer
              }))
            }
          };
        } else {
          return { success: false, error: 'Invalid JSON structure' };
        }
      } catch (jsonError) {
        console.error('❌ Error loading questions:', jsonError);
        return { success: false, error: 'Failed to load questions data' };
      }
    } else {
      return { success: false, error: 'No assessment found for the provided assessmentId' };
    }
  } catch (error) {
    console.error('❌ Error in fetchTestSession:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

