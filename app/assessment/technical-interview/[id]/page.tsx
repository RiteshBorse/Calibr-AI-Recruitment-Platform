import React, { Suspense } from 'react';
import RoleWrapper from '@/lib/RoleWrapper';
import AlreadyAttempted from '@/components/AlreadyAttempted';
import { fetchInterviewSession } from '../actions';
import TechnicalInterviewClient from './TechnicalInterviewClient';

interface TechnicalInterviewPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TechnicalInterviewPage({ params }: TechnicalInterviewPageProps) {
  const resolvedParams = await params;
  let interviewId = resolvedParams.id;
  
  // Ensure interviewId is a string
  if (typeof interviewId !== 'string') {
    interviewId = String(interviewId);
  }
  
  // Fetch interview session data and validate authorization
  const interviewSession = await fetchInterviewSession(interviewId);
  
  if (!interviewSession.success || !interviewSession.data) {
    // Check if it's an already attempted interview
    if (interviewSession.error === 'already_attempted') {
      return (
        <RoleWrapper role={["candidate"]}>
          <AlreadyAttempted />
        </RoleWrapper>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] via-[#0D0D20] to-[#0A0A18] flex items-center justify-center">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 max-w-md">
          <h2 className="text-white text-xl font-bold mb-4">Access Denied</h2>
          <p className="text-white/70">
            {interviewSession.error || 'Failed to load interview session'}
          </p>
        </div>
      </div>
    );
  }

  const interviewConfig = {
    duration: interviewSession.data.duration,
    mode: interviewSession.data.mode,
    language: interviewSession.data.language,
    difficulty: interviewSession.data.difficulty,
    topics: interviewSession.data.topics,
    consentRequired: interviewSession.data.consentRequired,
    proctoring: interviewSession.data.proctoring,
    // Add missing required fields with defaults
    recordingEnabled: true,
    questionStyle: "structured" as const,
    allowInterruptions: true,
    rubric: {
      passThreshold: 60,
      categories: []
    },
    status: interviewSession.data.status as "inactive" | "active" | "completed"
  };

  return (
    <RoleWrapper role={["candidate"]}>
      <Suspense fallback={<TechnicalInterviewSkeleton />}>
        <TechnicalInterviewClient 
          interviewId={interviewId}
          interviewConfig={interviewConfig}
          jobData={interviewSession.data.jobData}
          resumeData={interviewSession.data.resumeData}
        />
      </Suspense>
    </RoleWrapper>
  );
}

function TechnicalInterviewSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] via-[#0D0D20] to-[#0A0A18] flex items-center justify-center">
      <div className="text-white/70">Loading technical interview...</div>
    </div>
  );
}
