"use server";

import JobOpportunityModel from '@/models/jobOpportunity.model';
import AssessmentModel from '@/models/assesment.model';
import ApplicationModel from '@/models/application.model';
import CandidateModel from '@/models/candidate.model';
import AptitudeModel from '@/models/aptitude.model';
import CodingModel from '@/models/coding.model';
import TechnicalInterviewModel from '@/models/technicalInterview.model';
import HRInterviewModel from '@/models/hrInterview.model';
import mongoose from 'mongoose';
import {
  safeAction,
  createSuccessResponse,
  createErrorResponse,
  withDatabase,
  type ActionResponse
} from '@/utils/action-helpers';
import { requireAuth } from '@/utils/auth-helpers';

export interface JobWithAssessment {
  _id: string;
  title: string;
  department: string;
  position: string;
  employmentType: string;
  applicantsCount: number;
  assessment: {
    _id: string;
    title: string;
    status: string;
    aptitudeId?: string;
    codingRoundId?: string;
    technicalInterviewId?: string;
    hrInterviewId?: string;
  };
}

export interface CandidateApplication {
  _id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  applicationDate: string;
  status: string;
  resumeId?: string;
  rounds: {
    aptitude: 'pending' | 'shortlisted' | 'rejected' | 'completed';
    coding: 'pending' | 'shortlisted' | 'rejected' | 'completed';
    technicalInterview: 'pending' | 'shortlisted' | 'rejected' | 'completed';
    hrInterview: 'pending' | 'shortlisted' | 'rejected' | 'completed';
  };
}

export interface RoundInfo {
  type: 'aptitude' | 'coding' | 'technicalInterview' | 'hrInterview';
  id: string;
  alreadySelectedCount: number;
}


//Fetches all jobs belonging to the employer that have assessments created
 
export async function fetchJobsWithAssessments(): Promise<ActionResponse<JobWithAssessment[]>> {
  return safeAction(async () => {
    const employerId = await requireAuth();

    return await withDatabase(async () => {
      // Find all jobs with assessments for this employer
      const jobs = await JobOpportunityModel.find({ 
        employer: employerId 
      }).lean();

      if (!jobs || jobs.length === 0) {
        return createSuccessResponse('No jobs found', []);
      }

      const jobIds = jobs.map(job => job._id);

      // Find assessments for these jobs
      const assessments = await AssessmentModel.find({
        jobOpportunity: { $in: jobIds },
        employer: employerId
      }).lean();

      // Create a map of jobId -> assessment
      const assessmentMap = new Map();
      assessments.forEach(assessment => {
        if (assessment.jobOpportunity) {
          assessmentMap.set(assessment.jobOpportunity.toString(), assessment);
        }
      });

      // Filter jobs that have assessments and get applicant counts
      const jobsWithAssessments: JobWithAssessment[] = [];

      for (const job of jobs) {
        const assessment = assessmentMap.get(job._id.toString());
        
        if (assessment) {
          const applicantsCount = await ApplicationModel.countDocuments({
            jobId: job._id
          });

          jobsWithAssessments.push({
            _id: job._id.toString(),
            title: job.title,
            department: job.department,
            position: job.position,
            employmentType: job.employmentType,
            applicantsCount,
            assessment: {
              _id: assessment._id.toString(),
              title: assessment.title,
              status: assessment.status,
              aptitudeId: assessment.aptitudeId?.toString(),
              codingRoundId: assessment.codingRoundId?.toString(),
              technicalInterviewId: assessment.technicalInterviewId?.toString(),
              hrInterviewId: assessment.hrInterviewId?.toString(),
            }
          });
        }
      }

      return createSuccessResponse(
        `Found ${jobsWithAssessments.length} jobs with assessments`,
        jobsWithAssessments
      );
    });
  });
}


export async function fetchCandidatesForJob(jobId: string): Promise<ActionResponse<CandidateApplication[]>> {
  return safeAction(async () => {
    const employerId = await requireAuth();

    // Validate jobId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return createErrorResponse('Invalid job ID');
    }

    return await withDatabase(async () => {
      // Verify job belongs to employer
      const job = await JobOpportunityModel.findOne({
        _id: jobId,
        employer: employerId
      });

      if (!job) {
        return createErrorResponse('Job not found or unauthorized');
      }

      // Fetch all applications for this job
      const applications = await ApplicationModel.find({ 
        jobId: new mongoose.Types.ObjectId(jobId)
      })
      .populate('candidateId', 'firstName lastName email')
      .lean();

      if (!applications || applications.length === 0) {
        return createSuccessResponse('No applications found for this job', []);
      }

      // Transform data
      const candidateApplications: CandidateApplication[] = applications.map(app => {
        const candidate = app.candidateId as any;
        return {
          _id: app._id.toString(),
          candidateId: candidate._id.toString(),
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          candidateEmail: candidate.email,
          applicationDate: app.applicationDate.toISOString(),
          status: app.status,
          resumeId: app.resumeId?.toString(),
          rounds: app.rounds || {
            aptitude: 'pending',
            coding: 'pending',
            technicalInterview: 'pending',
            hrInterview: 'pending'
          }
        };
      });

      return createSuccessResponse(
        `Found ${candidateApplications.length} candidates`,
        candidateApplications
      );
    });
  });
}

export async function fetchRoundInfo(
  roundType: 'aptitude' | 'coding' | 'technicalInterview' | 'hrInterview',
  roundId: string
): Promise<ActionResponse<RoundInfo>> {
  return safeAction(async () => {
    const employerId = await requireAuth();

    if (!mongoose.Types.ObjectId.isValid(roundId)) {
      return createErrorResponse('Invalid round ID');
    }

    return await withDatabase(async () => {
      if (roundType === 'aptitude') {
        const aptitude = await AptitudeModel.findById(roundId).lean();

        if (!aptitude) {
          return createErrorResponse('Aptitude round not found');
        }

        // Verify the assessment belongs to this employer
        const assessment = await AssessmentModel.findOne({
          _id: aptitude.assessmentId,
          employer: employerId
        });

        if (!assessment) {
          return createErrorResponse('Unauthorized access to this round');
        }

        return createSuccessResponse('Round info fetched', {
          type: 'aptitude',
          id: aptitude._id.toString(),
          alreadySelectedCount: aptitude.candidateIds?.length || 0
        });
      }

      if (roundType === 'coding') {
        const coding = await CodingModel.findById(roundId).lean();
        if (!coding) {
          return createErrorResponse('Coding round not found');
        }
        const assessment = await AssessmentModel.findOne({
          _id: (coding as any).assessmentId,
          employer: employerId
        }).lean();
        if (!assessment) {
          return createErrorResponse('Unauthorized access to this round');
        }
        return createSuccessResponse('Round info fetched', {
          type: 'coding',
          id: roundId,
          alreadySelectedCount: (coding as any).candidateIds?.length || 0
        });
      }

      if (roundType === 'technicalInterview') {
        const technicalInterview = await TechnicalInterviewModel.findById(roundId).lean();
        if (!technicalInterview) {
          return createErrorResponse('Technical interview round not found');
        }
        const assessment = await AssessmentModel.findOne({
          _id: technicalInterview.assessmentId,
          employer: employerId
        }).lean();
        if (!assessment) {
          return createErrorResponse('Unauthorized access to this round');
        }
        return createSuccessResponse('Round info fetched', {
          type: 'technicalInterview',
          id: roundId,
          alreadySelectedCount: 0 // Technical interviews don't pre-select candidates in the same way
        });
      }

      if (roundType === 'hrInterview') {
        const hrInterview = await HRInterviewModel.findById(roundId).lean();
        if (!hrInterview) {
          return createErrorResponse('HR interview round not found');
        }
        const assessment = await AssessmentModel.findOne({
          _id: hrInterview.assessmentId,
          employer: employerId
        }).lean();
        if (!assessment) {
          return createErrorResponse('Unauthorized access to this round');
        }
        return createSuccessResponse('Round info fetched', {
          type: 'hrInterview',
          id: roundId,
          alreadySelectedCount: 0 // HR interviews don't pre-select candidates in the same way
        });
      }

      return createErrorResponse(`Unknown round type: ${roundType}`);
    });
  });
}

export async function updateCandidatesForRound(
  roundType: 'aptitude' | 'coding' | 'technicalInterview' | 'hrInterview',
  roundId: string,
  candidateIds: string[]
): Promise<ActionResponse<{ updatedCount: number }>> {
  return safeAction(async () => {
    const employerId = await requireAuth();

    // Validate roundId
    if (!mongoose.Types.ObjectId.isValid(roundId)) {
      return createErrorResponse('Invalid round ID');
    }

    // Validate all candidateIds
    const invalidIds = candidateIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return createErrorResponse(`Invalid candidate IDs: ${invalidIds.join(', ')}`);
    }

    return await withDatabase(async () => {
      if (roundType === 'aptitude') {
        const aptitude = await AptitudeModel.findById(roundId);

        if (!aptitude) {
          return createErrorResponse('Aptitude round not found');
        }

        // Verify the assessment belongs to this employer
        const assessment = await AssessmentModel.findOne({
          _id: aptitude.assessmentId,
          employer: employerId
        });

        if (!assessment) {
          return createErrorResponse('Unauthorized access to this round');
        }

        // Verify all candidates exist
        const candidateObjectIds = candidateIds.map(id => new mongoose.Types.ObjectId(id));
        const candidatesCount = await CandidateModel.countDocuments({
          _id: { $in: candidateObjectIds }
        });

        if (candidatesCount !== candidateIds.length) {
          return createErrorResponse('Some candidate IDs are invalid');
        }

        // Get the job ID from the assessment
        if (!assessment.jobOpportunity) {
          return createErrorResponse('Job opportunity not found for this assessment');
        }

        // Update the candidateIds array in aptitude round
        aptitude.candidateIds = candidateObjectIds;
        await aptitude.save();

        // Update application rounds.aptitude status to 'shortlisted' for selected candidates
        const updateResult = await ApplicationModel.updateMany(
          {
            candidateId: { $in: candidateObjectIds },
            jobId: assessment.jobOpportunity
          },
          {
            $set: { 
              status: 'shortlisted',
              'rounds.aptitude': 'shortlisted'
            }
          }
        );

        return createSuccessResponse(
          `Successfully selected ${candidateIds.length} candidates for aptitude round and updated application status`,
          { 
            updatedCount: candidateIds.length,
            applicationsUpdated: updateResult.modifiedCount
          }
        );
      }

      if (roundType === 'coding') {
        const coding = await CodingModel.findById(roundId);
        if (!coding) {
          return createErrorResponse('Coding round not found');
        }

        // Verify the assessment belongs to this employer
        const assessment = await AssessmentModel.findOne({
          _id: (coding as any).assessmentId,
          employer: employerId
        });

        if (!assessment) {
          return createErrorResponse('Unauthorized access to this round');
        }

        // Verify all candidates exist
        const candidateObjectIds = candidateIds.map(id => new mongoose.Types.ObjectId(id));
        const candidatesCount = await CandidateModel.countDocuments({
          _id: { $in: candidateObjectIds }
        });

        if (candidatesCount !== candidateIds.length) {
          return createErrorResponse('Some candidate IDs are invalid');
        }

        // Update the candidateIds array in coding round
        (coding as any).candidateIds = candidateObjectIds;
        await coding.save();

        // Update application rounds.coding status to 'shortlisted' for selected candidates
        const updateResult = await ApplicationModel.updateMany(
          {
            candidateId: { $in: candidateObjectIds },
            jobId: assessment.jobOpportunity
          },
          {
            $set: {
              status: 'shortlisted',
              'rounds.coding': 'shortlisted'
            }
          }
        );

        return createSuccessResponse(
          `Successfully selected ${candidateIds.length} candidates for coding round and updated application status`,
          {
            updatedCount: candidateIds.length,
            applicationsUpdated: updateResult.modifiedCount
          }
        );
      }

      if (roundType === 'technicalInterview') {
        const technicalInterview = await TechnicalInterviewModel.findById(roundId);
        if (!technicalInterview) {
          return createErrorResponse('Technical interview round not found');
        }

        // Verify the assessment belongs to this employer
        const assessment = await AssessmentModel.findOne({
          _id: technicalInterview.assessmentId,
          employer: employerId
        });

        if (!assessment) {
          return createErrorResponse('Unauthorized access to this round');
        }

        // Verify all candidates exist
        const candidateObjectIds = candidateIds.map(id => new mongoose.Types.ObjectId(id));
        const candidatesCount = await CandidateModel.countDocuments({
          _id: { $in: candidateObjectIds }
        });

        if (candidatesCount !== candidateIds.length) {
          return createErrorResponse('Some candidate IDs are invalid');
        }

        // Add candidates to technicalInterview.candidateIds array
        await TechnicalInterviewModel.findByIdAndUpdate(
          roundId,
          {
            $addToSet: { candidateIds: { $each: candidateObjectIds } }
          }
        );

        // Update application rounds.technicalInterview status to 'shortlisted' for selected candidates
        const updateResult = await ApplicationModel.updateMany(
          {
            candidateId: { $in: candidateObjectIds },
            jobId: assessment.jobOpportunity
          },
          {
            $set: {
              status: 'shortlisted',
              'rounds.technicalInterview': 'shortlisted'
            }
          }
        );

        return createSuccessResponse(
          `Successfully selected ${candidateIds.length} candidates for technical interview round and updated application status`,
          {
            updatedCount: candidateIds.length,
            applicationsUpdated: updateResult.modifiedCount
          }
        );
      }

      if (roundType === 'hrInterview') {
        const hrInterview = await HRInterviewModel.findById(roundId);
        if (!hrInterview) {
          return createErrorResponse('HR interview round not found');
        }

        // Verify the assessment belongs to this employer
        const assessment = await AssessmentModel.findOne({
          _id: hrInterview.assessmentId,
          employer: employerId
        });

        if (!assessment) {
          return createErrorResponse('Unauthorized access to this round');
        }

        // Verify all candidates exist
        const candidateObjectIds = candidateIds.map(id => new mongoose.Types.ObjectId(id));
        const candidatesCount = await CandidateModel.countDocuments({
          _id: { $in: candidateObjectIds }
        });

        if (candidatesCount !== candidateIds.length) {
          return createErrorResponse('Some candidate IDs are invalid');
        }

        // Add candidates to hrInterview.candidateIds array
        await HRInterviewModel.findByIdAndUpdate(
          roundId,
          {
            $addToSet: { candidateIds: { $each: candidateObjectIds } }
          }
        );

        // Update application rounds.hrInterview status to 'shortlisted' for selected candidates
        const updateResult = await ApplicationModel.updateMany(
          {
            candidateId: { $in: candidateObjectIds },
            jobId: assessment.jobOpportunity
          },
          {
            $set: {
              status: 'shortlisted',
              'rounds.hrInterview': 'shortlisted'
            }
          }
        );

        return createSuccessResponse(
          `Successfully selected ${candidateIds.length} candidates for HR interview round and updated application status`,
          {
            updatedCount: candidateIds.length,
            applicationsUpdated: updateResult.modifiedCount
          }
        );
      }

      return createErrorResponse(`Unknown round type: ${roundType}`);
    });
  });
}
