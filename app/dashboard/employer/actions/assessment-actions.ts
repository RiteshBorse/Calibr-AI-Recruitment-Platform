"use server";

import AssessmentModel, { Assessment } from '@/models/assesment.model';
import AptitudeModel, { Aptitude } from '@/models/aptitude.model';
import CodingModel from '@/models/coding.model';
import TechnicalInterviewModel from '@/models/technicalInterview.model';
import HRInterviewModel from '@/models/hrInterview.model';
import JobOpportunityModel from '@/models/jobOpportunity.model';
import { Document } from 'mongoose';
import mongoose from 'mongoose';
import { 
  safeAction, 
  createSuccessResponse, 
  createErrorResponse, 
  withDatabase, 
  logSuccess,
  type ActionResponse 
} from '@/utils/action-helpers';
import { requireAuth } from '@/utils/auth-helpers';
import { generateAptitudeQuestionIds } from './aptitude-actions';

// Create a clean type for assessment creation
export type AssessmentCreationData = Omit<Assessment, keyof Document | 'createdAt' | 'updatedAt'>;

// Export Aptitude type for use in forms
export type { Aptitude };

// Simplified job data for assessment selection
export interface JobForAssessment {
  _id: string;
  title: string;
  department: string;
  position: string;
  employmentType: string;
  seniority: string;
  locationType: string;
  location: string;
  openings: number;
  createdAt: string;
  status: string;
}

// Fetch job postings for assessment selection
export async function fetchJobPostingsForAssessment(): Promise<ActionResponse<JobForAssessment[]>> {
  return safeAction(async () => {
    // Get authenticated employer ID - throws if not authenticated
    const employerId = await requireAuth();
    
    return await withDatabase(async () => {
      // Fetch only jobs created by this employer
      // Security: Filter ensures employer can only see their own jobs
      const jobs = await JobOpportunityModel.find({ 
        employer: employerId
      })
        .select('title department position employmentType seniority locationType location openings createdAt employer')
        .sort({ createdAt: -1 })
        .lean();

      // Double-check ownership (defense in depth) - filters out any jobs that might not have employer set
      const verifiedJobs = jobs.filter(job => 
        (job as any).employer?.toString() === employerId
      );

      // Get all job IDs that already have assessments
      const jobIdsWithAssessments = await AssessmentModel.find({
        employer: employerId,
        jobOpportunity: { $exists: true, $ne: null }
      })
        .select('jobOpportunity')
        .lean();

      const jobIdsWithAssessmentsSet = new Set(
        jobIdsWithAssessments.map((assessment: any) => assessment.jobOpportunity?.toString())
      );

      // Filter out jobs that already have assessments
      const jobsWithoutAssessments = verifiedJobs.filter(job => 
        !jobIdsWithAssessmentsSet.has(job._id.toString())
      );

      const formattedJobs: JobForAssessment[] = jobsWithoutAssessments.map(job => ({
        _id: job._id.toString(),
        title: job.title,
        department: job.department,
        position: job.position,
        employmentType: job.employmentType,
        seniority: job.seniority,
        locationType: job.locationType,
        location: job.location,
        openings: job.openings,
        createdAt: (job as any).createdAt?.toISOString() || new Date().toISOString(),
        status: 'active' // Add status logic if needed
      }));

      logSuccess("fetchJobPostingsForAssessment", `Fetched ${formattedJobs.length} jobs without assessments for employer ${employerId}`);
      return createSuccessResponse("Jobs fetched", formattedJobs);
    }, "Failed to connect to database");
  }, "Failed to fetch job postings for assessment");
}

// ========================================
// HELPER FUNCTIONS FOR ASSESSMENT CREATION
// ========================================

function convertIdsToObjectIds(assessmentData: AssessmentCreationData, employerId: string): any {
  return {
    ...assessmentData,
    jobOpportunity: assessmentData.jobOpportunity 
      ? new mongoose.Types.ObjectId(assessmentData.jobOpportunity as unknown as string) 
      : undefined,
    // SECURITY: Always use authenticated employerId, never trust client input
    employer: new mongoose.Types.ObjectId(employerId)
  };
}

/**
 * Verifies that a job belongs to the authenticated employer
 * Single responsibility: Job ownership verification
 * @throws Error if job doesn't exist or doesn't belong to employer
 */
async function verifyJobOwnership(jobId: mongoose.Types.ObjectId, employerId: string): Promise<void> {
  const job = await JobOpportunityModel.findById(jobId).select('employer').lean();
  
  if (!job) {
    throw new Error('Job opportunity not found');
  }
  
  if ((job as any).employer?.toString() !== employerId) {
    throw new Error('Unauthorized - Job opportunity does not belong to this employer');
  }
}

/**
 * Prepares aptitude data for creation with default values
 * Single responsibility: Aptitude data preparation
 */
function prepareAptitudeData(aptitudeData: any): any {
  return {
    ...aptitudeData,
    candidateIds: aptitudeData.candidateIds || [],
    expiredQuestionIds: aptitudeData.expiredQuestionIds || [],
  };
}

/**
 * Creates an aptitude round and returns its ID
 * Single responsibility: Aptitude round creation
 */
async function createAptitudeRoundForAssessment(aptitudeData: any): Promise<mongoose.Types.ObjectId> {
  // Prepare aptitude data with defaults
  const preparedData = prepareAptitudeData(aptitudeData);
  
  // Generate question IDs
  preparedData.questionIds = await generateAptitudeQuestionIds(preparedData.totalQuestions);
  
  // Note: assessmentId will be set to null initially and updated after assessment creation
  preparedData.assessmentId = null;
  
  // Create and save aptitude document
  const newAptitude = new AptitudeModel(preparedData);
  const savedAptitude = await newAptitude.save();
  
  return savedAptitude._id as mongoose.Types.ObjectId;
}

/**
 * Creates a coding round and returns its ID
 * Single responsibility: Coding round creation
 */
async function createCodingRoundForAssessment(codingData: any): Promise<mongoose.Types.ObjectId> {
  const prepared = {
    totalProblems: codingData.totalProblems,
    duration: codingData.duration,
    passingScore: codingData.passingScore,
    warnings: codingData.warnings,
    addManualProblem: !!codingData.addManualProblem,
    difficultyWeightage: codingData.difficultyWeightage,
    candidateIds: [],
    problemPool: codingData.problemPool,
    randomizeProblems: !!codingData.randomizeProblems,
    manuallyAddProblems: !!codingData.manuallyAddProblems,
    showResultImmediately: !!codingData.showResultImmediately,
    allowReviewBeforeSubmit: !!codingData.allowReviewBeforeSubmit,
    languages: codingData.languages,
    compilerTimeout: codingData.compilerTimeout,
    memoryLimit: codingData.memoryLimit,
    assessmentId: null,
    // If manually adding problems, use the selected problem IDs, otherwise empty array for randomization
    problemIds: codingData.manuallyAddProblems ? (codingData.selectedProblemIds || []) : [],
    expiredProblemIds: [],
    sections: [],
    status: 'inactive'
  };
  const newCoding = new CodingModel(prepared as any);
  const saved = await newCoding.save();
  return saved._id as mongoose.Types.ObjectId;
}

/**
 * Creates a technical interview round and returns its ID
 */
async function createTechnicalInterviewForAssessment(techData: any): Promise<mongoose.Types.ObjectId> {
  const prepared = {
    ...techData,
    assessmentId: null,
    status: techData?.status || 'inactive'
  };
  const doc = new TechnicalInterviewModel(prepared);
  const saved = await doc.save();
  return saved._id as mongoose.Types.ObjectId;
}

/**
 * Creates an HR interview round and returns its ID
 */
async function createHrInterviewForAssessment(hrData: any): Promise<mongoose.Types.ObjectId> {
  const prepared = {
    ...hrData,
    assessmentId: null,
    status: hrData?.status || 'inactive'
  };
  const doc = new HRInterviewModel(prepared);
  const saved = await doc.save();
  return saved._id as mongoose.Types.ObjectId;
}

/**
 * Cleans assessment data by removing embedded objects and disabled rounds
 * Single responsibility: Data sanitization
 */
function sanitizeAssessmentData(assessmentData: any): any {
  const cleanData = { ...assessmentData };
  
  // Remove embedded aptitude object (we store only the reference ID)
  if (cleanData.aptitude) {
    delete cleanData.aptitude;
  }
  
  // Remove aptitudeId if aptitude round is not enabled
  if (assessmentData.toConductRounds && !assessmentData.toConductRounds.aptitude) {
    delete cleanData.aptitudeId;
  }

  // Remove embedded technical/hr objects (we store only reference IDs)
  if (cleanData.technicalInterview) {
    delete cleanData.technicalInterview;
  }
  if (cleanData.hrInterview) {
    delete cleanData.hrInterview;
  }

  // Remove technical/hr IDs if disabled
  if (assessmentData.toConductRounds && !assessmentData.toConductRounds.technicalInterview) {
    delete cleanData.technicalInterviewId;
  }
  if (assessmentData.toConductRounds && !assessmentData.toConductRounds.hrInterview) {
    delete cleanData.hrInterviewId;
  }
  
  return cleanData;
}

/**
 * Links the aptitude round to the assessment by updating the assessmentId
 * Single responsibility: Aptitude-Assessment relationship
 */
async function linkAptitudeToAssessment(
  aptitudeId: mongoose.Types.ObjectId, 
  assessmentId: mongoose.Types.ObjectId
): Promise<void> {
  await AptitudeModel.findByIdAndUpdate(
    aptitudeId, 
    { assessmentId },
    { runValidators: true }
  );
}

/**
 * Converts Mongoose document to plain object, removing internal fields
 * Single responsibility: Document serialization
 */
function toPlainAssessment(assessment: any): any {
  // Use toObject() method instead of JSON stringify for better performance
  const plainAssessment = assessment.toObject 
    ? assessment.toObject() 
    : JSON.parse(JSON.stringify(assessment));
  
  // Remove internal Mongoose fields
  delete plainAssessment.__v;
  delete plainAssessment.createdAt;
  delete plainAssessment.updatedAt;
  
  return plainAssessment;
}

// MAIN CREATE ASSESSMENT FUNCTION

/**
 * Creates a new assessment with optional aptitude round
 * Orchestrates the assessment creation workflow
 */
export async function createAssessment(assessmentData: AssessmentCreationData): Promise<ActionResponse<Assessment>> {
  return safeAction(async () => {
    // Step 1: Authenticate and get employer ID
    const employerId = await requireAuth();
    
    return await withDatabase(async () => {
      // Step 2: Verify job ownership if jobOpportunity is provided (SECURITY CHECK)
      if (assessmentData.jobOpportunity) {
        await verifyJobOwnership(
          new mongoose.Types.ObjectId(assessmentData.jobOpportunity as unknown as string),
          employerId
        );
      }
      
      // Step 3: Convert string IDs to ObjectIds (use authenticated employerId)
      const processedData = convertIdsToObjectIds(assessmentData, employerId);
      
      // Step 4: Handle round creations (aptitude/coding) if enabled
      let aptitudeId: mongoose.Types.ObjectId | undefined;
      let codingId: mongoose.Types.ObjectId | undefined;
      let technicalId: mongoose.Types.ObjectId | undefined;
      let hrId: mongoose.Types.ObjectId | undefined;
      
      if (assessmentData.toConductRounds?.aptitude && (assessmentData as any).aptitude) {
        // Support fullData pattern for aptitude (already sanitized on client)
        aptitudeId = await createAptitudeRoundForAssessment((assessmentData as any).aptitude);
        processedData.aptitudeId = aptitudeId;
      }

      // Accept coding fullData passed from client flow
      if ((assessmentData as any).coding && assessmentData.toConductRounds?.coding) {
        codingId = await createCodingRoundForAssessment((assessmentData as any).coding);
        (processedData as any).codingRoundId = codingId;
      }

      // Create technical interview when provided via fullData
      if ((assessmentData as any).technicalInterview && assessmentData.toConductRounds?.technicalInterview) {
        technicalId = await createTechnicalInterviewForAssessment((assessmentData as any).technicalInterview);
        (processedData as any).technicalInterviewId = technicalId;
      }

      // Create HR interview when provided via fullData
      if ((assessmentData as any).hrInterview && assessmentData.toConductRounds?.hrInterview) {
        hrId = await createHrInterviewForAssessment((assessmentData as any).hrInterview);
        (processedData as any).hrInterviewId = hrId;
      }
      
      // Step 5: Sanitize assessment data (remove embedded objects and disabled rounds)
      const cleanAssessmentData = sanitizeAssessmentData(processedData);
      
      // Step 6: Create and save assessment
      const newAssessment = new AssessmentModel(cleanAssessmentData);
      const savedAssessment = await newAssessment.save();
      
      // Step 7: Link rounds to assessment (update assessmentId from null to actual ID)
      if (aptitudeId) {
        await linkAptitudeToAssessment(aptitudeId, savedAssessment._id as mongoose.Types.ObjectId);
      }
      if (codingId) {
        await CodingModel.findByIdAndUpdate(
          codingId,
          { assessmentId: savedAssessment._id },
          { runValidators: true }
        );
      }
      if (technicalId) {
        await TechnicalInterviewModel.findByIdAndUpdate(
          technicalId,
          { assessmentId: savedAssessment._id },
          { runValidators: true }
        );
      }
      if (hrId) {
        await HRInterviewModel.findByIdAndUpdate(
          hrId,
          { assessmentId: savedAssessment._id },
          { runValidators: true }
        );
      }
      
      // Step 8: Convert to plain object and remove internal fields
      const assessmentPlain = toPlainAssessment(savedAssessment);
      
      // Step 9: Log and return success response
      logSuccess("createAssessment", `Assessment created: ${savedAssessment._id}`);
      return createSuccessResponse("Assessment created", assessmentPlain);
    }, "Failed to connect to database");
  }, "Failed to create assessment");
}

// Fetch assessments for a specific job
export async function fetchAssessmentsForJob(jobId: string): Promise<ActionResponse<Assessment[]>> {
  return safeAction(async () => {
    // Get authenticated employer ID
    const employerId = await requireAuth();
    
    return await withDatabase(async () => {
      // Filter by employer to ensure data isolation
      const assessments = await AssessmentModel.find({ 
        jobOpportunity: jobId,
        employer: employerId 
      })
        .populate('aptitudeId') // Populate the aptitude data
        .sort({ createdAt: -1 })
        .lean();

      const formattedAssessments = assessments.map(assessment => ({
        ...assessment,
        _id: assessment._id.toString()
      })) as Assessment[];

      return createSuccessResponse("Assessments fetched", formattedAssessments);
    }, "Failed to connect to database");
  }, "Failed to fetch assessments for job");
}

// Fetch single assessment with aptitude data
export async function fetchAssessmentById(assessmentId: string): Promise<ActionResponse<Assessment>> {
  return safeAction(async () => {
    // Get authenticated employer ID
    const employerId = await requireAuth();
    
    return await withDatabase(async () => {
      const assessment = await AssessmentModel.findById(assessmentId)
        .populate('aptitudeId')
        .lean();

      if (!assessment) {
        return createErrorResponse("Assessment not found");
      }

      // Verify ownership
      if ((assessment as any).employer?.toString() !== employerId) {
        return createErrorResponse("Unauthorized - You don't have access to this assessment");
      }

      const formattedAssessment = {
        ...assessment,
        _id: assessment._id.toString()
      } as Assessment;

      return createSuccessResponse("Assessment fetched", formattedAssessment);
    }, "Failed to connect to database");
  }, "Failed to fetch assessment");
}

// Update an existing assessment
export async function updateAssessment(
  assessmentId: string, 
  updateData: Partial<AssessmentCreationData>
): Promise<ActionResponse<Assessment>> {
  return safeAction(async () => {
    // Get authenticated employer ID
    const employerId = await requireAuth();
    
    return await withDatabase(async () => {
      // First check if assessment exists and belongs to this employer
      const existingAssessment = await AssessmentModel.findById(assessmentId).lean();
      
      if (!existingAssessment) {
        return createErrorResponse("Assessment not found");
      }
      
      // Verify ownership before updating
      if ((existingAssessment as any).employer?.toString() !== employerId) {
        return createErrorResponse("Unauthorized - You don't have access to this assessment");
      }
      
      const updatedAssessment = await AssessmentModel.findByIdAndUpdate(
        assessmentId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedAssessment) {
        return createErrorResponse("Assessment not found");
      }

      // Convert to plain object using helper (consistent with createAssessment)
      const assessmentPlain = toPlainAssessment(updatedAssessment);

      logSuccess("updateAssessment", `Assessment updated: ${assessmentId}`);
      return createSuccessResponse("Assessment updated", assessmentPlain);
    }, "Failed to connect to database");
  }, "Failed to update assessment");
}

// Fetch single job details for assessment creation
export async function fetchJobForAssessment(jobId: string): Promise<ActionResponse<JobForAssessment>> {
  return safeAction(async () => {
    // Get authenticated employer ID
    const employerId = await requireAuth();
    
    return await withDatabase(async () => {
      const job = await JobOpportunityModel.findById(jobId)
        .select('title department position employmentType seniority locationType location openings createdAt employer')
        .lean();

      if (!job) {
        return createErrorResponse("Job not found");
      }

      // Verify ownership
      if ((job as any).employer?.toString() !== employerId) {
        return createErrorResponse("Unauthorized - You don't have access to this job");
      }

      const formattedJob: JobForAssessment = {
        _id: job._id.toString(),
        title: job.title,
        department: job.department,
        position: job.position,
        employmentType: job.employmentType,
        seniority: job.seniority,
        locationType: job.locationType,
        location: job.location,
        openings: job.openings,
        createdAt: (job as any).createdAt?.toISOString() || new Date().toISOString(),
        status: 'active'
      };

      return createSuccessResponse("Job fetched", formattedJob);
    }, "Failed to connect to database");
  }, "Failed to fetch job for assessment");
}
