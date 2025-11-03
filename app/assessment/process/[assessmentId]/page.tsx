"use client"
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CheckCircle, Lock, Play, Clock, BarChart3, Brain, Code, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { useSession } from "next-auth/react";
import { format } from 'date-fns';
import { fetchAssessmentDetails, AssessmentDetails } from '../actions';
import { toast } from 'sonner';

export interface InterviewRound {
  id: string;
  type: 'aptitude' | 'coding' | 'technical' | 'hr';
  name: string;
  isEnabled: boolean;
  duration?: number;
  questions?: Question[];
}

export interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'coding' | 'interview';
  options?: string[];
  correctAnswer?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

const InterviewProgress = () => {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const userName = session?.user?.name || "Candidate";
  const firstName = userName.split(" ")[0];
  
  // Assessment data states
  const [assessmentData, setAssessmentData] = useState<AssessmentDetails | null>(null);
  const [isLoadingAssessment, setIsLoadingAssessment] = useState(true);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  
  // System check validation states
  const [isValidatingSystemCheck, setIsValidatingSystemCheck] = useState(true);
  const [hasValidSystemCheck, setHasValidSystemCheck] = useState(true);
  
  // Fetch assessment data on component mount
  useEffect(() => {
    const loadAssessmentData = async () => {
      if (!params.assessmentId) {
        setAssessmentError('Assessment ID not provided');
        setIsLoadingAssessment(false);
        return;
      }

      console.log(hasValidSystemCheck);

      try {
        const result = await fetchAssessmentDetails(params.assessmentId as string);
        if (result.success && result.data) {
          setAssessmentData(result.data);
          
          // Determine current round based on application round statuses
          const rounds = result.data.applicationDetails?.rounds;
          const toConductRounds = result.data.toConductRounds;
          
          if (rounds && toConductRounds) {
            // Build list of enabled rounds only
            const roundOrder = ['aptitude', 'coding', 'technicalInterview', 'hrInterview'] as const;
            const enabledRoundStatuses = roundOrder
              .filter(roundType => toConductRounds[roundType])
              .map(roundType => ({
                type: roundType,
                status: rounds[roundType]
              }));
            
            // Find first non-completed enabled round
            let currentIndex = 0;
            for (let i = 0; i < enabledRoundStatuses.length; i++) {
              if (enabledRoundStatuses[i].status === 'completed') {
                currentIndex++;
              } else {
                // This is the current round (first non-completed)
                break;
              }
            }
            
            setCurrentRoundIndex(currentIndex);
          }
        } else {
          setAssessmentError(result.message || 'Failed to load assessment');
        }
      } catch (error) {
        console.error('Error fetching assessment:', error);
        setAssessmentError('Failed to load assessment');
      } finally {
        setIsLoadingAssessment(false);
      }
    };

    loadAssessmentData();
  }, [params.assessmentId]);

  // Validate system check on component mount
  useEffect(() => {
    const validateSystemCheck = () => {
      try {
        // Check if system check was completed
        const systemCheckResults = localStorage.getItem('calibr_system_check_results');
        
        if (!systemCheckResults) {
          setHasValidSystemCheck(false);
          setIsValidatingSystemCheck(false);
          return;
        }
        
        const parsedResults = JSON.parse(systemCheckResults);
        const timestamp = new Date(parsedResults.timestamp);
        const now = new Date();
        
        // Check if system check was done within the last 30 minutes
        const timeDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60); // minutes
        
        if (timeDiff > 30) {
          // System check is too old
          setHasValidSystemCheck(false);
        } else {
          // Validate that all checks passed
          const allChecksPass = parsedResults.results.every(
            (check: {status: string}) => check.status === 'success' || check.status === 'warning'
          );
          
          setHasValidSystemCheck(allChecksPass);
        }
      } catch {
        // Invalid system check results
        setHasValidSystemCheck(false);
      } finally {
        setIsValidatingSystemCheck(false);
      }
    };
    
    validateSystemCheck();
    
    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // User exited fullscreen, show warning
        alert('Warning: Exiting full-screen mode during an assessment may result in automatic submission. Please return to full-screen mode.');
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Generate rounds based on assessment data
  const generateRounds = (): InterviewRound[] => {
    if (!assessmentData) return [];
    
    const rounds: InterviewRound[] = [];
    
    if (assessmentData.toConductRounds.aptitude && assessmentData.aptitudeDetails) {
      rounds.push({
        id: 'aptitude',
        type: 'aptitude',
        name: 'Aptitude Round',
        isEnabled: true,
        duration: assessmentData.aptitudeDetails.duration
      });
    }
    
    if (assessmentData.toConductRounds.coding && assessmentData.codingDetails) {
      rounds.push({
        id: 'coding',
        type: 'coding',
        name: 'Coding Round',
        isEnabled: true,
        duration: assessmentData.codingDetails.duration
      });
    }
    
    if (assessmentData.toConductRounds.technicalInterview) {
      rounds.push({
        id: 'technical',
        type: 'technical',
        name: 'Technical Interview',
        isEnabled: true,
        duration: 60 // Default duration for technical interview
      });
    }
    
    if (assessmentData.toConductRounds.hrInterview) {
      rounds.push({
        id: 'hr',
        type: 'hr',
        name: 'HR Interview',
        isEnabled: true,
        duration: 30 // Default duration for HR interview
      });
    }
    
    return rounds;
  };

  const interviewRounds = generateRounds();
  const isMockMode = assessmentData?.status === 'draft'; // Mock mode for draft assessments
  const currentRound = currentRoundIndex; // Use dynamic current round index

  // Helper function to get the actual status of a round from application data
  const getActualRoundStatus = (roundType: string): 'pending' | 'shortlisted' | 'rejected' | 'completed' => {
    const rounds = assessmentData?.applicationDetails?.rounds;
    if (!rounds) return 'pending';
    
    const typeMap: Record<string, keyof typeof rounds> = {
      'aptitude': 'aptitude',
      'coding': 'coding',
      'technical': 'technicalInterview',
      'hr': 'hrInterview'
    };
    
    const mappedType = typeMap[roundType];
    return mappedType ? rounds[mappedType] : 'pending';
  };

  // Helper function to determine what action button to show
  const getRoundActionText = (roundType: string): string => {
    const status = getActualRoundStatus(roundType);
    
    if (status === 'completed') {
      return 'View Results';
    } else if (status === 'shortlisted') {
      return 'Start Round';
    } else if (status === 'pending') {
      // Check if there's any evaluation data (indicates in-progress)
      return 'Start Round'; // TODO: Check for partial completion to show "Resume"
    } else if (status === 'rejected') {
      return 'Not Eligible';
    }
    
    return 'Start Round';
  };

  const handleStartRound = async (roundIndex: number) => {
    if (!assessmentData) {
      toast.error('Assessment data not loaded');
      return;
    }

    try {
      // Ensure we're in fullscreen mode before starting the round
      if (!document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (err) {
          console.error('Error attempting to enable fullscreen mode:', err);
          if (!confirm('Fullscreen mode is recommended for the assessment. Continue anyway?')) {
            return;
          }
        }
      }
      
      const round = interviewRounds[roundIndex];
      if (!round) {
        toast.error('Invalid round selected');
        return;
      }

      // Navigate based on round type
      switch (round.type) {
        case 'aptitude':
          router.push(`/assessment/aptitude/${assessmentData.aptitudeDetails?._id}`);
          break;
        case 'coding':
          router.push(`/assessment/coding/${assessmentData.codingDetails?._id}`);
          break;
        case 'technical':
          if (!assessmentData.technicalInterviewId) {
            toast.error('Technical interview not configured');
            return;
          }
          console.log('Technical Interview ID:', assessmentData.technicalInterviewId);
          console.log('Type:', typeof assessmentData.technicalInterviewId);
          router.push(`/assessment/technical-interview/${assessmentData.technicalInterviewId}`);
          break;
        case 'hr':
          if (!assessmentData.hrInterviewId) {
            toast.error('HR interview not configured');
            return;
          }
          router.push(`/assessment/hr-interview/${assessmentData.hrInterviewId}`);
          break;
        default:
          toast.error('Unknown round type');
      }
    } catch (error) {
      console.error('Error starting round:', error);
      toast.error('There was an error starting this assessment round. Please try again.');
    }
  };

  const enabledRounds = interviewRounds.filter(round => round.isEnabled);

  const getRoundIcon = (index: number, type: string) => {
    const actualStatus = getActualRoundStatus(type);
    
    if (actualStatus === 'completed') {
      return <CheckCircle className="h-6 w-6 text-emerald-400" />;
    } else if (actualStatus === 'shortlisted' || actualStatus === 'pending') {
      // Show appropriate icon for active/available rounds
      switch(type) {
        case 'aptitude': return <Brain className="h-6 w-6 text-indigo-400" />;
        case 'coding': return <Code className="h-6 w-6 text-blue-400" />;
        case 'technical': return <BarChart3 className="h-6 w-6 text-purple-400" />;
        case 'hr': return <Users className="h-6 w-6 text-rose-400" />;
        default: return <Play className="h-6 w-6 text-indigo-400" />;
      }
    } else if (actualStatus === 'rejected') {
      return <Lock className="h-6 w-6 text-red-400" />;
    } else {
      return <Lock className="h-6 w-6 text-white/40" />;
    }
  };

  const getRoundStatus = (index: number) => {
    const round = enabledRounds[index];
    if (!round) return 'locked';
    
    const actualStatus = getActualRoundStatus(round.type);
    
    if (actualStatus === 'completed') return 'completed';
    if (actualStatus === 'shortlisted' || (actualStatus === 'pending' && isMockMode)) return 'active';
    if (actualStatus === 'rejected') return 'rejected';
    
    // For sequential rounds: only current round is active
    if (index === currentRound) return 'active';
    
    return 'locked';
  };

  const canStartRound = (index: number) => {
    if (isMockMode) return true;
    
    const round = enabledRounds[index];
    if (!round) return false;
    
    const actualStatus = getActualRoundStatus(round.type);
    
    // Can start if: completed (view results), shortlisted, or current pending round
    return actualStatus === 'completed' || 
           actualStatus === 'shortlisted' || 
           (actualStatus === 'pending' && index === currentRound);
  };

  const getRoundTypeDescription = (type: string, roundIndex: number) => {
    const round = enabledRounds[roundIndex];
    if (!round) return 'Complete this round to progress in your interview journey.';
  
    let aptitudeDetails, codingDetails;
  
    switch (type) {
      case 'aptitude': 
        aptitudeDetails = assessmentData?.aptitudeDetails;
        return `Test your logical reasoning and problem-solving abilities with ${aptitudeDetails?.totalQuestions || 0} multiple-choice questions. Duration: ${aptitudeDetails?.duration || 0} minutes.`;
      case 'coding': 
        codingDetails = assessmentData?.codingDetails;
        return `Solve ${codingDetails?.totalProblems || 0} programming challenges to demonstrate your technical skills. Duration: ${codingDetails?.duration || 0} minutes. Languages: ${codingDetails?.languages?.join(', ') || 'Multiple'}.`;
      case 'technical': 
        return 'Discuss technical concepts, system design, and your experience with our AI interviewer. Duration: 60 minutes.';
      case 'hr': 
        return 'Explore cultural fit, behavioral patterns, and career aspirations in this comprehensive interview. Duration: 30 minutes.';
      default: 
        return 'Complete this round to progress in your interview journey.';
    }
  };
  

  // Show loading state while fetching assessment data
  if (isLoadingAssessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] to-[#0D0D20] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-indigo-400" />
          <h2 className="text-2xl font-bold mb-2">Loading Assessment</h2>
          <p className="text-white/70">Please wait while we load your assessment details...</p>
        </div>
      </div>
    );
  }

  // Show error state if assessment failed to load
  if (assessmentError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] to-[#0D0D20] flex items-center justify-center">
        <div className="text-center text-white">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold mb-2">Assessment Not Found</h2>
          <p className="text-white/70 mb-6">{assessmentError}</p>
          <button 
            onClick={() => router.push('/dashboard/candidate')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Add early return if no rounds are available
  if (enabledRounds.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] to-[#0D0D20] flex items-center justify-center">
        <div className="text-center text-white/60">
          <p>No interview rounds available for this assessment.</p>
        </div>
      </div>
    );
  }

  // Add personalized messages based on progress
  const getProgressMessage = () => {
    const totalRounds = enabledRounds.length;
    const completedPercentage = (currentRound / totalRounds) * 100;

    if (completedPercentage === 0) return `Welcome ${firstName}! Ready to begin your journey?`;
    if (completedPercentage < 50) return `Great start ${firstName}! Keep up the momentum!`;
    if (completedPercentage < 100) return `You're doing great ${firstName}! Almost there!`;
    return `Congratulations ${firstName}! You've completed all rounds!`;
  };
  console.log(getProgressMessage());
  // Add time estimates
  const getRemainingTime = () => {
    const remainingRounds = enabledRounds.slice(currentRound);
    const totalMinutes = remainingRounds.reduce((acc, round) => acc + (round.duration || 0), 0);
    return totalMinutes;
  };

  // Add a formatted date function
  const getFormattedDate = () => {
    return format(new Date(), 'MM/dd/yyyy');
  };

  // Redirect to precheck if system check validation fails
  const handleRedirectToPrecheck = () => {
    router.push('/assessment/precheck');
  };

  // If still validating or system check failed, show appropriate UI
  if (isValidatingSystemCheck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] to-[#0D0D20] flex flex-col items-center justify-center p-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-indigo-400" />
          <h2 className="text-2xl font-bold mb-2">Validating System Requirements</h2>
          <p className="text-white/70 mb-4">Please wait while we verify your system compatibility...</p>
        </div>
      </div>
    );
  }

  if (hasValidSystemCheck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] to-[#0D0D20] flex flex-col items-center justify-center p-6 text-white">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-amber-500/20 p-3 rounded-full">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-center">System Check Required</h2>
          <p className="text-white/70 mb-6 text-center">
            Before proceeding with your assessment, we need to verify that your system meets all the necessary requirements.
          </p>
          <div className="space-y-4 mb-6">
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Why is this important?</h3>
              <p className="text-sm text-white/70">
                The system check ensures your camera, microphone, internet connection, and browser settings are properly configured for an optimal assessment experience.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="font-medium mb-2">What happens next?</h3>
              <p className="text-sm text-white/70">
                You&aposll be redirected to our system check page. Once all checks pass, you can return to continue with your assessment.
              </p>
            </div>
          </div>
          <button 
            onClick={handleRedirectToPrecheck}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center"
          >
            Proceed to System Check
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] to-[#0D0D20]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-12">
        {/* Enhanced Header with Personal Progress */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <span className="px-4 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-medium">
              {assessmentData?.status === 'draft' ? 'Practice Mode' : 'Assessment Mode'}
            </span>
            <span className="px-4 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm font-medium ml-2">
              {currentRound === enabledRounds.length ? "Final Round" : `Round ${currentRound + 1} of ${enabledRounds.length}`}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-indigo-300 to-rose-300 bg-clip-text text-transparent">
              {assessmentData?.title || 'Assessment'}
            </span>
          </h1>
          {assessmentData?.description && (
            <p className="text-white/70 max-w-3xl mx-auto text-lg mb-4">
              {assessmentData.description}
            </p>
          )}
          <p className="text-white/60 max-w-2xl mx-auto text-lg">
            {currentRound < enabledRounds.length ? (
              <span>
                Estimated time remaining: <span className="text-indigo-300 font-medium">{getRemainingTime()} minutes</span>
              </span>
            ) : (
              "All rounds completed! Check your results below."
            )}
          </p>
        </div>

        {/* Enhanced Progress Flow with Animations */}
        <div className="mb-12 relative">
          <div className="flex justify-between items-center mb-8">
            {enabledRounds.map((round, index) => {
              const status = getRoundStatus(index);
              return (
                <React.Fragment key={round.id}>
                  <div className="flex flex-col items-center text-center relative z-10 group">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 mb-4 transition-all duration-300 ${
                      status === 'completed' ? 'border-emerald-500 bg-emerald-500/20 group-hover:scale-110' :
                      status === 'active' ? 'border-indigo-500 bg-indigo-500/20 shadow-lg shadow-indigo-500/30 animate-pulse' :
                      'border-white/30 bg-white/5'
                    }`}>
                      {getRoundIcon(index, round.type)}
                    </div>
                    {/* Add tooltips */}
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-xs text-white whitespace-nowrap">
                        {status === 'completed' ? 'Completed ✓' : status === 'active' ? 'In Progress' : 'Upcoming'}
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${
                      status === 'completed' ? 'text-emerald-300' :
                      status === 'active' ? 'text-indigo-300' :
                      'text-white/60'
                    }`}>
                      {round.name}
                    </span>
                  </div>
                  
                  {/* Enhanced progress line */}
                  {index < enabledRounds.length - 1 && (
                    <div className="flex-1 mx-2 relative">
                      <div className="h-0.5 bg-white/10 absolute top-1/2 left-0 right-0 transform -translate-y-1/2"></div>
                      <div 
                        className={`h-0.5 absolute top-1/2 left-0 transform -translate-y-1/2 transition-all duration-1000 ${
                          index < currentRound ? 'bg-gradient-to-r from-emerald-500 to-indigo-500 w-full' : 'w-0'
                        }`}
                      ></div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          
          {/* Progress bar for mobile */}
          <div className="lg:hidden w-full bg-white/10 rounded-full h-2 mb-4">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-rose-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(currentRound / enabledRounds.length) * 100}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-sm">Your progress</span>
            <span className="text-white font-medium">
              {currentRound} of {enabledRounds.length} rounds completed
            </span>
          </div>
        </div>

        {/* Enhanced Current Round Focus */}
        {enabledRounds.map((round, index) => {
          const status = getRoundStatus(index);
          const actualStatus = getActualRoundStatus(round.type);
          const isClickable = canStartRound(index);
          const actionText = getRoundActionText(round.type);
          
          // Show current active round or first round in mock mode
          // Also show if shortlisted (skipped previous rounds)
          if (index === currentRound || (isMockMode && index === 0) || actualStatus === 'shortlisted') {
            return (
              <div key={round.id} className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                  {status === 'completed' ? 'Completed: ' : 
                   actualStatus === 'shortlisted' ? 'Shortlisted for: ' : 
                   'Current: '}
                  <span className="bg-gradient-to-r from-indigo-300 to-rose-300 bg-clip-text text-transparent">
                    {round.name}
                  </span>
                </h2>
                
                <div 
                  className={`bg-white/5 backdrop-blur-sm rounded-2xl border transition-all duration-300 p-8 ${
                    status === 'completed' ? 'border-emerald-500/30' :
                    status === 'rejected' ? 'border-red-500/30' :
                    status === 'active' ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/20' :
                    'border-white/10'
                  } ${isClickable ? 'hover:scale-102 hover:shadow-xl cursor-pointer' : 'opacity-80'}`}
                  onClick={() => isClickable && handleStartRound(index)}
                >
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center space-x-6">
                      <div className={`relative w-20 h-20 rounded-xl flex items-center justify-center border-2 ${
                        status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/10' :
                        status === 'rejected' ? 'border-red-500/30 bg-red-500/10' :
                        status === 'active' ? 'border-indigo-500/30 bg-indigo-500/10' :
                        'border-white/20 bg-white/5'
                      }`}>
                        {getRoundIcon(index, round.type)}
                        {status === 'active' && actualStatus !== 'rejected' && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-2xl font-semibold text-white">{round.name}</h3>
                        <div className="flex items-center space-x-4 mt-2">
                          {round.duration && (
                            <div className="flex items-center text-white/60">
                              <Clock className="h-5 w-5 mr-1" />
                              {round.duration} minutes
                            </div>
                          )}
                          <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                            status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                            status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                            actualStatus === 'shortlisted' ? 'bg-blue-500/20 text-blue-300' :
                            status === 'active' ? 'bg-indigo-500/20 text-indigo-300' :
                            'bg-white/10 text-white/60'
                          }`}>
                            {status === 'completed' ? 'Completed' :
                             status === 'rejected' ? 'Not Eligible' :
                             actualStatus === 'shortlisted' ? 'Shortlisted' :
                             status === 'active' ? (isMockMode ? 'Available' : 'Current Round') :
                             'Locked'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isClickable && actualStatus !== 'rejected' && (
                      <button className={`px-6 py-3 rounded-xl font-medium flex items-center ${
                        status === 'completed' ? 
                          'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 
                          'bg-gradient-to-r from-indigo-500 to-rose-500 text-white hover:from-indigo-600 hover:to-rose-600'
                      }`}>
                        <span className="mr-2">
                          {actionText}
                        </span>
                        <Play className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-6">
                    <p className="text-white/70 leading-relaxed text-lg">
                      {getRoundTypeDescription(round.type, index)}
                    </p>
                    
                    {status === 'completed' && (
                      <div className="mt-4 flex items-center text-emerald-400">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Completed on {getFormattedDate()}
                      </div>
                    )}
                    
                    {actualStatus === 'shortlisted' && status !== 'completed' && (
                      <div className="mt-4 flex items-center text-blue-400">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        You&apos;ve been shortlisted for this round
                      </div>
                    )}
                    
                    {actualStatus === 'rejected' && (
                      <div className="mt-4 flex items-center text-red-400">
                        <Lock className="h-5 w-5 mr-2" />
                        Unfortunately, you did not qualify for this round
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })}

        {/* Enhanced All Rounds List with Animation */}
        <div className="grid md:grid-cols-2 gap-6">
          {enabledRounds.map((round, index) => {
            const status = getRoundStatus(index);
            const actualStatus = getActualRoundStatus(round.type);
            const isClickable = canStartRound(index);
            const actionText = getRoundActionText(round.type);
            
            return (
              <div
                key={round.id}
                className={`transform transition-all duration-300 hover:translate-y-[-4px] ${
                  isClickable ? 'cursor-pointer' : 'opacity-70'
                }`}
                onClick={() => isClickable && handleStartRound(index)}
              >
                <div className={`h-full bg-white/5 backdrop-blur-sm rounded-2xl border p-6 ${
                  status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/5' :
                  status === 'rejected' ? 'border-red-500/20 bg-red-500/5' :
                  actualStatus === 'shortlisted' ? 'border-blue-500/20 bg-blue-500/5' :
                  status === 'active' ? 'border-indigo-500/30 bg-indigo-500/5' :
                  'border-white/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                        status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/10' :
                        status === 'rejected' ? 'border-red-500/30 bg-red-500/10' :
                        actualStatus === 'shortlisted' ? 'border-blue-500/30 bg-blue-500/10' :
                        status === 'active' ? 'border-indigo-500/30 bg-indigo-500/10' :
                        'border-white/20 bg-white/5'
                      }`}>
                        {getRoundIcon(index, round.type)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{round.name}</h4>
                        <p className="text-white/60 text-sm">{round.duration} minutes</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                      status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                      actualStatus === 'shortlisted' ? 'bg-blue-500/20 text-blue-300' :
                      status === 'active' ? 'bg-indigo-500/20 text-indigo-300' :
                      'bg-white/10 text-white/60'
                    }`}>
                      {status === 'completed' ? 'Done' : 
                       status === 'rejected' ? 'Not Eligible' :
                       actualStatus === 'shortlisted' ? 'Shortlisted' :
                       status === 'active' ? actionText : 
                       'Locked'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Assessment Instructions */}
        {(assessmentData?.instructions || assessmentData?.candidateInstructions) && (
          <div className="mt-8">
            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                <span className="bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                  Assessment Instructions
                </span>
              </h3>
              {assessmentData?.candidateInstructions && (
                <div className="mb-4">
                  <h4 className="font-medium text-white mb-2">For Candidates:</h4>
                  <p className="text-white/70">{assessmentData.candidateInstructions}</p>
                </div>
              )}
              {assessmentData?.instructions && (
                <div>
                  <h4 className="font-medium text-white mb-2">General Instructions:</h4>
                  <p className="text-white/70">{assessmentData.instructions}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {isMockMode && (
          <div className="mt-8">
            <div className="bg-gradient-to-r from-indigo-500/10 to-rose-500/10 rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                <span className="bg-gradient-to-r from-indigo-300 to-rose-300 bg-clip-text text-transparent">
                  Practice Mode
                </span>
              </h3>
              <p className="text-white/60">
                All rounds are unlocked for practice. Complete the entire process to receive a comprehensive 
                performance report with personalized feedback, skill assessments, and improvement suggestions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewProgress;