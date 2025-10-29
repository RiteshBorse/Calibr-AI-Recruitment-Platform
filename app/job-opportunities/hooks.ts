"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { JobOpportunity, JobFilters } from './types.d.ts';
import { getJobOpportunities, getTechStackOptions, getJobOpportunityById} from './actions';

export const useJobOpportunities = () => {
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getJobOpportunities();
      setJobs(result);
    } catch (err) {
      setError('Failed to load job opportunities');
      console.error('Error fetching jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  return { jobs, isLoading, error, reload: loadJobs };
};

export const useTechStackOptions = () => {
  const [techStack, setTechStack] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTechStack = async () => {
    setIsLoading(true);
    try {
      const result = await getTechStackOptions();
      setTechStack(result);
    } catch (error) {
      console.error('Error fetching tech stack options:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTechStack();
  }, []);

  return { techStack, isLoading };
};

export const useJobFilters = () => {
  const [filters, setFilters] = useState<JobFilters>({
    techStack: [],
    experience: [0],
    location: ''
  });

  const updateTechStack = (tech: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      techStack: checked 
        ? [...prev.techStack, tech]
        : prev.techStack.filter(item => item !== tech)
    }));
  };

  const updateExperience = (experience: number[]) => {
    setFilters(prev => ({ ...prev, experience }));
  };

  const updateLocation = (location: string) => {
    setFilters(prev => ({ ...prev, location }));
  };

  const clearFilters = () => {
    setFilters({
      techStack: [],
      experience: [0],
      location: ''
    });
  };

  return {
    filters,
    updateTechStack,
    updateExperience,
    updateLocation,
    clearFilters
  };
};

export const useJobOpportunity = (id: string) => {
  const [job, setJob] = useState<JobOpportunity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJob = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getJobOpportunityById(id);
      setJob(result);
    } catch (err) {
      setError('Failed to load job details');
      console.error('Error fetching job:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadJob();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { job, isLoading, error, reload: loadJob };
};

export const useResumes = () => {
  const [resumes, setResumes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const loadResumes = async () => {
    if (!session?.user?._id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Import the fetchCandidateProfile action which already filters by profile.resumes
      const { fetchCandidateProfile } = await import('@/app/profile/candidate/actions/profile-actions');
      const profileResult = await fetchCandidateProfile(session.user._id);
      
      if (profileResult.success && profileResult.data?.resume) {
        // The resume data is already filtered by the profile's resumes array
        const formattedResumes = profileResult.data.resume.map((resume: any) => ({
          id: resume.id,
          name: resume.fileName.replace(/\.[^/.]+$/, ""),
          fileName: resume.fileName,
          uploadedAt: new Date().toISOString().split('T')[0], // Default since uploadedAt not in response
          size: formatFileSize(resume.fileSize),
          url: resume.url,
          version: 1, // Default since version not in response
          mimeType: resume.mimeType
        }));
        
        console.log(`[useResumes] Loaded ${formattedResumes.length} resumes from profile`);
        setResumes(formattedResumes);
      } else {
        console.log('[useResumes] No resumes in profile');
        setResumes([]);
      }
    } catch (err) {
      setError('Failed to load resumes');
      console.error('Error fetching resumes:', err);
      setResumes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, [session?.user?._id]); // Re-run when session changes

  return { resumes, isLoading, error, reload: loadResumes };
};

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const useCandidateProfile = () => {
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const loadProfile = async () => {
    if (!session?.user?._id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { fetchCandidateProfile } = await import('@/app/profile/candidate/actions/profile-actions');
      const profileResult = await fetchCandidateProfile(session.user._id);
      
      if (profileResult.success) {
        setProfile(profileResult.data);
      } else {
        setError(profileResult.error || 'Failed to load profile');
      }
    } catch (err) {
      setError('Failed to load candidate profile');
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [session?.user?._id]);

  return { profile, isLoading, error, reload: loadProfile };
};