'use server';

import { connectToDatabase } from '@/utils/connectDb';
import TechnicalInterviewModel from '@/models/technicalInterview.model';
import TechnicalInterviewEvaluationModel from '@/models/technicalInterviewEvaluation.model';
import CandidateModel from '@/models/candidate.model';
import AssessmentModel from '@/models/assesment.model';
import ApplicationModel from '@/models/application.model';
import JobOpportunityModel from '@/models/jobOpportunity.model';
import ResumeModel from '@/models/resume.model';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export interface FetchInterviewSessionResponse {
  success: boolean;
  data?: {
    _id: string;
    duration: number;
    mode: 'live' | 'async';
    language: string;
    difficulty: 'junior' | 'mid' | 'senior';
    topics: string[];
    consentRequired: boolean;
    proctoring: {
      cameraRequired: boolean;
      micRequired: boolean;
      screenShareRequired: boolean;
    };
    status: string;
    jobData?: any;
    resumeData?: any;
  };
  error?: string;
}

/**
 * Fetch technical interview session and validate candidate authorization
 */
export async function fetchInterviewSession(interviewId: string): Promise<FetchInterviewSessionResponse> {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    
    if (!session) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }

    if (!interviewId) {
      return { 
        success: false, 
        error: 'Interview ID is required' 
      };
    }

    // Ensure interviewId is a valid string and not an object representation
    let cleanInterviewId = interviewId;
    if (typeof cleanInterviewId !== 'string') {
      cleanInterviewId = String(cleanInterviewId);
    }
    
    // Remove any URL encoding artifacts
    cleanInterviewId = cleanInterviewId.trim();
    if (cleanInterviewId.includes('%5B') || cleanInterviewId.includes('object')) {
      console.error('Invalid interviewId format:', cleanInterviewId);
      return { 
        success: false, 
        error: 'Invalid interview ID format' 
      };
    }

    const authenticatedCandidateId = session.user?._id;
    
    if (!authenticatedCandidateId) {
      return { 
        success: false, 
        error: 'User ID not found in session' 
      };
    }
    
    console.log('✓ Validating candidate:', authenticatedCandidateId);
    console.log('✓ For technical interview:', cleanInterviewId);

    const interview = await TechnicalInterviewModel.findById(cleanInterviewId).lean();
    
    if (!interview) {
      return { 
        success: false, 
        error: 'No technical interview found for the provided ID' 
      };
    }

    // Validate candidate exists
    const candidate = await CandidateModel.findById(authenticatedCandidateId).lean();
    if (!candidate) {
      return {
        success: false,
        error: 'Candidate not found. Please check your candidate ID.'
      };
    }

    // Check if candidate is authorized for this interview
    const isAuthorized = interview.candidateIds.some(id => id.toString() === String(candidate._id));
    
    if (!isAuthorized) {
      return {
        success: false,
        error: 'You are not authorized to take this interview.'
      };
    }

    // Check if candidate has already attempted this interview
    const existingEvaluation = await TechnicalInterviewEvaluationModel.findOne({
      candidateId: authenticatedCandidateId,
      technicalInterviewId: interviewId
    }).lean();

    // TESTING MODE: Allow retaking completed interviews for development
    const TESTING_MODE = process.env.NEXT_PUBLIC_INTERVIEW_TESTING_MODE === 'true';

    if (existingEvaluation) {
      // Block if interview is completed (unless in testing mode)
      if (existingEvaluation.status === 'completed') {
        if (!TESTING_MODE) {
          return {
            success: false,
            error: 'already_attempted'
          };
        } else {
          console.log('[Testing Mode] Allowing access to completed interview for testing');
          // In testing mode, reset the evaluation to allow retaking
          await TechnicalInterviewEvaluationModel.findByIdAndUpdate(existingEvaluation._id, {
            status: 'in_progress',
            endedAt: null,
            startedAt: new Date()
          });
        }
      }
      
      if (existingEvaluation.status === 'in_progress') {
        // Check if interview time has expired
        const elapsed = new Date().getTime() - existingEvaluation.startedAt.getTime();
        const totalDurationMs = interview.duration * 60 * 1000;
        const timeLeft = Math.max(0, totalDurationMs - elapsed);
        
        // If time expired, mark as completed and block access (unless in testing mode)
        if (timeLeft <= 0 && !TESTING_MODE) {
          await TechnicalInterviewEvaluationModel.findByIdAndUpdate(existingEvaluation._id, {
            status: 'completed',
            endedAt: new Date()
          });
          
          return {
            success: false,
            error: 'Interview time has expired. You cannot continue this interview.'
          };
        }
        
        // Time is still valid, allow continuation
        // OR testing mode is enabled, so ignore time expiration
      }
    }

    // Fetch job and resume data if assessmentId exists
    let jobData = null;
    let resumeData = null;

    if (interview.assessmentId) {
      // Don't use populate to avoid circular references
      const assessment = await AssessmentModel.findById(interview.assessmentId).lean();
      
      if (assessment && assessment.jobOpportunity) {
        const job = await JobOpportunityModel.findById(assessment.jobOpportunity).lean();
        if (job) {
          jobData = {
            title: job.title,
            position: job.position,
            department: job.department,
            seniority: job.seniority,
            techStack: job.techStack,
            description: job.description,
            requirements: job.requirements,
            experience: job.experience,
          };
        }
      }
    }

    // Fetch resume data from application
    const application = await ApplicationModel.findOne({
      candidateId: authenticatedCandidateId
    }).sort({ applicationDate: -1 }).lean();

    if (application && application.resumeId) {
      const resume = await ResumeModel.findById(application.resumeId).lean();
      if (resume && resume.parsedData) {
        resumeData = resume.parsedData;
      }
    }

    const interviewData = {
      _id: String(interview._id),
      duration: Number(interview.duration),
      mode: interview.mode,
      language: interview.language,
      difficulty: interview.difficulty,
      topics: Array.isArray(interview.topics) ? interview.topics : [],
      consentRequired: Boolean(interview.consentRequired),
      proctoring: {
        cameraRequired: Boolean(interview.proctoring?.cameraRequired),
        micRequired: Boolean(interview.proctoring?.micRequired),
        screenShareRequired: Boolean(interview.proctoring?.screenShareRequired)
      },
      status: interview.status,
      jobData: jobData ? { ...jobData } : null,
      resumeData: resumeData ? { ...resumeData } : null
    };

    return {
      success: true,
      data: interviewData
    };

  } catch (error) {
    console.error('❌ Error in fetchInterviewSession:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}
