'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  createAssessment, 
  fetchJobPostingsForAssessment,
  createJobPosting,
  fetchStats,
  fetchCandidates,
  fetchLiveMonitoring,
  fetchJobs,
  fetchActivities,
  fetchJobsWithAssessments,
  fetchCandidatesForJob,
  fetchRoundInfo,
  updateCandidatesForRound,
  fetchEmployerJobs,
  fetchJobDetails,
  updateJobDetails,
  updateAssessmentDetails,
  type JobCreationData,
  type JobWithAssessment,
  type CandidateApplication,
  type RoundInfo,
  type JobOpening,
  type JobDetailedInfo,
  type JobUpdateData,
  type AssessmentUpdateData,
} from './actions';
import { toast } from 'sonner';
import mongoose from 'mongoose';
import { DashboardData } from './types';

// Types
export interface AssessmentFormData {
  title: string;
  description: string;
  jobId: string;
  jobTitle: string;
  timeLimit: number;
  maxAttempts: number;
  rounds: {
    aptitude?: {
      enabled: boolean;
      fullData?: any; 
    };
    coding?: {
      enabled: boolean;
      fullData?: any;
    };
    technicalInterview?: {
      enabled: boolean;
      fullData?: any; 
    };
    hrInterview?: {
      enabled: boolean;
      fullData?: any; 
    };
  };
}

// Custom hook for managing assessment creation
export function useAssessmentCreation() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AssessmentFormData | null>(null);

  const createNewAssessment = useCallback(async (data: AssessmentFormData) => {
    setLoading(true);
    try {
      // Transform the form data to match the Assessment model structure
      const assessmentData = {
        title: data.title,
        description: data.description,
        jobOpportunity: new mongoose.Types.ObjectId(data.jobId),
        employer: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // TODO: Get from auth context
        status: 'draft' as const,
        
        toConductRounds: {
          aptitude: data.rounds.aptitude?.enabled || false,
          coding: data.rounds.coding?.enabled || false,
          technicalInterview: data.rounds.technicalInterview?.enabled || false,
          hrInterview: data.rounds.hrInterview?.enabled || false,
        },

        // Configure rounds based on enabled status
        ...(data.rounds.aptitude?.enabled && data.rounds.aptitude.fullData ? { aptitude: data.rounds.aptitude.fullData } : {}),

        // Pass through coding fullData when present (from CreateAssessmentFlow)
        ...(data.rounds.coding?.enabled && (data.rounds.coding.fullData ? { coding: data.rounds.coding.fullData } : {})),

        ...(data.rounds.technicalInterview?.enabled && {
          technicalInterview: data.rounds.technicalInterview.fullData || undefined
        }),

        ...(data.rounds.hrInterview?.enabled && {
          hrInterview: data.rounds.hrInterview.fullData || undefined
        }),

        overallPassingCriteria: {
          minimumRoundsToPass: 1,
          weightagePerRound: {
            // Only set aptitude to 100% when it's the only enabled round
            ...(data.rounds.aptitude?.enabled && { aptitude: 100 })
            // Other rounds commented out for now
            // ...(data.rounds.coding?.enabled && { coding: data.rounds.coding.weightage }),
            // ...(data.rounds.technicalInterview?.enabled && { technicalInterview: data.rounds.technicalInterview.weightage }),
            // ...(data.rounds.hrInterview?.enabled && { hrInterview: data.rounds.hrInterview.weightage })
          }
        },

        totalCandidates: 0,
        completedCandidates: 0,
        passingCandidates: 0,
        sendReminders: true,
        reminderTimings: [24, 2],
        publishResults: false,
        allowMultipleAttempts: data.maxAttempts > 1,
        maxAttempts: data.maxAttempts,
        ipRestrictions: [],
        browserRestrictions: [],
        instructions: data.description
      };

      // Convert ObjectIds to strings to avoid serialization issues
      const cleanAssessmentData = {
        ...assessmentData,
        jobOpportunity: assessmentData.jobOpportunity.toString(),
        employer: assessmentData.employer.toString()
      };

      const result = await createAssessment(cleanAssessmentData as any);
      
      if (result.success) {
        setFormData(null);
        return { success: true, data: result.data };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create assessment';
      console.error('Assessment creation error:', error);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFormData = useCallback((data: Partial<AssessmentFormData>) => {
    setFormData(prev => prev ? { ...prev, ...data } : null);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(null);
  }, []);

  return {
    loading,
    formData,
    createNewAssessment,
    updateFormData,
    resetForm
  };
}

// Custom hook for fetching job postings
export function useJobPostings() {
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchJobPostingsForAssessment();
      if (result.success) {
        setJobs(result.data || []);
        return { success: true, data: result.data || [] };
      } else {
        throw new Error(result.message || 'Failed to fetch jobs');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch jobs';
      toast.error(message);
      setJobs([]);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    jobs,
    fetchJobs
  };
}

// Custom hook for creating job postings
export function useCreateJob() {
  const [isLoading, setIsLoading] = useState(false);

  const createJob = async (jobData: JobCreationData) => {
    setIsLoading(true);
    try {
      const result = await createJobPosting(jobData);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      };
    } finally {
      setIsLoading(false);
    }
  };

  return { createJob, isLoading };
}

// Custom hook for fetching dashboard data
export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [statsRes, candidatesRes, monitoringRes, jobsRes, activitiesRes] =
        await Promise.all([
          fetchStats(),
          fetchCandidates(),
          fetchLiveMonitoring(),
          fetchJobs(),
          fetchActivities(),
        ]);

      // Build DashboardData object
      const dashboard: DashboardData = {
        stats: statsRes.success ? (statsRes.data || []) : [],
        candidatesByStage: candidatesRes.success
          ? (candidatesRes.data || {
              applied: [],
              screening: [],
              interview: [],
              offer: [],
              hired: [],
            })
          : {
              applied: [],
              screening: [],
              interview: [],
              offer: [],
              hired: [],
            },
        codePreview: monitoringRes.success ? (monitoringRes.data || []) : [],
        jobs: jobsRes.success ? (jobsRes.data || []) : [],
        activities: activitiesRes.success ? (activitiesRes.data || []) : [],
      };

      setData(dashboard);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
      console.error("❌ Error loading dashboard:", err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refetch: loadData
  };
}

// ========================================
// CANDIDATE MANAGEMENT HOOKS
// ========================================

/**
 * Hook to fetch jobs with assessments
 */
export function useFetchJobsWithAssessments() {
  const [jobs, setJobs] = useState<JobWithAssessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchJobsWithAssessments();
      
      if (result.success) {
        setJobs(result.data || []);
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch jobs';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobs
  };
}

/**
 * Hook to fetch candidates for a job
 */
export function useFetchCandidatesForJob(jobId: string | null) {
  const [candidates, setCandidates] = useState<CandidateApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    if (!jobId) {
      setCandidates([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchCandidatesForJob(jobId);
      
      if (result.success) {
        setCandidates(result.data || []);
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch candidates';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  return {
    candidates,
    loading,
    error,
    refetch: fetchCandidates
  };
}

/**
 * Hook to fetch round info
 */
export function useFetchRoundInfo(
  roundType: 'aptitude' | 'coding' | 'technicalInterview' | 'hrInterview' | null,
  roundId: string | null
) {
  const [roundInfo, setRoundInfo] = useState<RoundInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    if (!roundType || !roundId) {
      setRoundInfo(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchRoundInfo(roundType, roundId);
      
      if (result.success) {
        setRoundInfo(result.data || null);
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch round info';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [roundType, roundId]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return {
    roundInfo,
    loading,
    error,
    refetch: fetchInfo
  };
}

/**
 * Hook to update candidates for round
 */
export function useUpdateCandidatesForRound() {
  const [loading, setLoading] = useState(false);

  const updateCandidates = useCallback(async (
    roundType: 'aptitude' | 'coding' | 'technicalInterview' | 'hrInterview',
    roundId: string,
    candidateIds: string[]
  ) => {
    setLoading(true);
    
    try {
      const result = await updateCandidatesForRound(roundType, roundId, candidateIds);
      
      if (result.success) {
        toast.success(result.message);
        return { success: true, data: result.data };
      } else {
        toast.error(result.message);
        return { success: false, message: result.message };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update candidates';
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateCandidates,
    loading
  };
}

// ========================================
// JOB MANAGEMENT HOOKS
// ========================================

/**
 * Hook to fetch employer jobs with optional filter
 */
export function useFetchEmployerJobs(statusFilter?: 'all' | 'active' | 'draft' | 'archived') {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchEmployerJobs(statusFilter);
      
      if (result.success) {
        setJobs(result.data || []);
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch jobs';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobs
  };
}

/**
 * Hook to fetch detailed job information
 */
export function useFetchJobDetails(jobId: string | null) {
  const [jobDetails, setJobDetails] = useState<JobDetailedInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!jobId) {
      setJobDetails(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchJobDetails(jobId);
      
      if (result.success) {
        setJobDetails(result.data || null);
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch job details';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    jobDetails,
    loading,
    error,
    refetch: fetchDetails
  };
}

/**
 * Hook to update job details
 */
export function useUpdateJobDetails() {
  const [loading, setLoading] = useState(false);

  const updateJob = useCallback(async (jobId: string, updates: JobUpdateData) => {
    setLoading(true);
    
    try {
      const result = await updateJobDetails(jobId, updates);
      
      if (result.success) {
        toast.success(result.message);
        return { success: true };
      } else {
        toast.error(result.message);
        return { success: false, message: result.message };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update job';
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateJob,
    loading
  };
}

/**
 * Hook to update assessment details
 */
export function useUpdateAssessmentDetails() {
  const [loading, setLoading] = useState(false);

  const updateAssessment = useCallback(async (assessmentId: string, updates: AssessmentUpdateData) => {
    setLoading(true);
    
    try {
      const result = await updateAssessmentDetails(assessmentId, updates);
      
      if (result.success) {
        toast.success(result.message);
        return { success: true };
      } else {
        toast.error(result.message);
        return { success: false, message: result.message };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update assessment';
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateAssessment,
    loading
  };
}

/**
 * Hook to fetch employer job opportunities for candidate evaluation
 */
export function useFetchEmployerJobOpportunities() {
  const [jobs, setJobs] = useState<Array<{ _id: string; title: string; department: string; position: string; location: string; employmentType: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Import the action dynamically to avoid circular dependencies
      const { fetchEmployerJobs } = await import('./actions/candidate-evaluation-actions');
      const result = await fetchEmployerJobs();
      
      if (result.success) {
        setJobs(result.data || []);
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch job opportunities';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobOpportunities();
  }, [fetchJobOpportunities]);

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobOpportunities
  };
}

export function useFetchShortlistedCandidates(jobId?: string) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { fetchShortlistedCandidates } = await import('./actions/candidate-evaluation-actions');
      const response = await fetchShortlistedCandidates(jobId);
      
      if (response.success && response.data) {
        setCandidates(response.data);
      } else {
        setError(response.error || 'Failed to fetch candidates');
        toast.error(response.error || 'Failed to fetch candidates');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  return { candidates, loading, error, refetch: fetchCandidates };
}


