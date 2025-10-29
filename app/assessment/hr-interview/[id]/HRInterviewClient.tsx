"use client";
/**
 * HR Interview Client
 * Uses HR-specific adapter and branding
 * Key differences: no Q2, dual Q3 thresholds, HR HeaderBanner
 */

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { hrInterviewAdapter } from "../adapter";
import VideoProcessing from "@/lib/video-processing";
import HeaderBanner from "./_components/HeaderBanner";
import SetupScreen from "./_components/SetupScreen";
import type { InterviewConfig } from "../types";
import { startAudioRecording } from "@/utils/media";
import { loadBrowserVoices } from "@/utils/tts";
import { useHRInterviewActions } from "../hooks";

// Shared hooks and components
import {
  useInterviewSession,
  useInterviewMedia,
  useInterviewSTT,
  useInterviewFlow,
} from "@/lib/interview/hooks";
import {
  LoadingScreen,
  ReadyScreen,
  CompleteScreen,
  InterviewTimer,
  QuestionDisplay,
  RecordingStatus,
  TranscriptDisplay,
  VideoBoxes,
} from "@/lib/interview/components";

interface HRInterviewClientProps {
  interviewId: string;
  interviewConfig: InterviewConfig;
  jobData?: {
    title: string;
    department: string;
    position: string;
    seniority: string;
    techStack: string[];
    description?: string;
    requirements?: string;
  };
  resumeData?: {
    tagline?: string;
    summary?: string;
    workDetails?: any[];
    education?: any[];
    skills?: string;
    projects?: any[];
    certificates?: any[];
  };
}

export default function HRInterviewClient({
  interviewId,
  interviewConfig: initialConfig,
  jobData,
  resumeData,
}: HRInterviewClientProps) {
  // Get HR interview actions
  const actions = useHRInterviewActions();

  // Core session state management - NO QUEUE2 FOR HR
  const session = useInterviewSession({
    interviewId,
    interviewType: 'hr',
    config: initialConfig,
    jobData,
    resumeData,
    hasQueue2: false, // HR interviews don't have depth questions
    actions: actions as any,
    adapter: {
      startEvaluation: async (id: string) => {
        await hrInterviewAdapter.startEvaluation(id);
      },
      analyze: hrInterviewAdapter.analyze,
      // No Q2 generation for HR interviews
    },
  });

  // Media controls (play, pause, mute, recording)
  const media = useInterviewMedia({
    speechRecognitionRef: session.speechRecognitionRef,
    isUserMutedRef: session.isUserMutedRef,
    currentQuestionRef: session.currentQuestionRef,
    pauseTimeoutRef: session.pauseTimeoutRef,
    answerBufferRef: session.answerBufferRef,
    setIsSpeaking: session.setIsSpeaking,
    setIsRecording: session.setIsRecording,
    setIsUserMuted: session.setIsUserMuted,
    setFinalTranscript: session.setFinalTranscript,
    setInterimTranscript: session.setInterimTranscript,
    markQuestionAsked: actions.markQuestionAsked,
    interviewId,
    language: initialConfig?.language,
  });

  // Interview flow (start, begin, ask next, submit, end)
  const flow = useInterviewFlow({
    interviewId,
    setCurrentScreen: session.setCurrentScreen,
    setIsLoading: session.setIsLoading,
    setLoadingMessage: session.setLoadingMessage,
    setPreprocessingProgress: session.setPreprocessingProgress,
    setQueues: session.setQueues,
    setCurrentQuestion: session.setCurrentQuestion,
    setCurrentQuestionIndex: session.setCurrentQuestionIndex,
    setCurrentChunkNumber: session.setCurrentChunkNumber,
    setTotalQ1Questions: session.setTotalQ1Questions,
    setPreprocessedChunks: session.setPreprocessedChunks,
    setStats: session.setStats,
    setClosingMessage: session.setClosingMessage,
    setFinalTranscript: session.setFinalTranscript,
    setInterimTranscript: session.setInterimTranscript,
    setIsRecording: session.setIsRecording,
    evaluationStartedRef: session.evaluationStartedRef,
    currentQuestionRef: session.currentQuestionRef,
    pauseTimeoutRef: session.pauseTimeoutRef,
    transcriptBufferRef: session.transcriptBufferRef,
    answerBufferRef: session.answerBufferRef,
    hasStartedSpeakingRef: session.hasStartedSpeakingRef,
    isSubmittingRef: session.isSubmittingRef,
    preprocessingInProgressRef: session.preprocessingInProgressRef,
    timerRef: session.timerRef,
    speechRecognitionRef: session.speechRecognitionRef,
    currentScreen: session.currentScreen,
    modelsLoaded: session.modelsLoaded,
    totalQ1Questions: session.totalQ1Questions,
    currentChunkNumber: session.currentChunkNumber,
    hasConsent: session.hasConsent,
    consentRequired: initialConfig?.consentRequired || false,
    hasQueue2: false, // HR interviews don't have Queue2
    actions: actions as any,
    adapter: {
      startEvaluation: async (id: string) => {
        await hrInterviewAdapter.startEvaluation(id);
      },
      analyze: async (question: string, idealAnswer: string, userAnswer: string, queues: any, currentQuestion: any, interviewId: string) => {
        return await hrInterviewAdapter.analyze(question, idealAnswer, userAnswer, queues, currentQuestion, interviewId);
      },
    },
    loadAskedQuestions: session.loadAskedQuestions,
    preprocessChunk: session.preprocessChunk,
    startRecording: async () => {
      const { mediaRecorder, stream } = await startAudioRecording(() => {});
      session.streamRef.current = stream;
      session.mediaRecorderRef.current = mediaRecorder;
      session.setIsRecording(true);
      if (session.speechRecognitionRef.current) {
        session.speechRecognitionRef.current.start();
      }
    },
    stopRecording: () => {
      if (session.mediaRecorderRef.current) {
        session.mediaRecorderRef.current.stop();
        session.setIsRecording(false);
      }
      if (session.speechRecognitionRef.current) {
        session.speechRecognitionRef.current.stop();
      }
    },
    playQuestionAudio: media.playQuestionAudio,
    pauseRecording: media.pauseRecording,
    resumeRecording: media.resumeRecording,
    jobData,
    resumeData,
    queues: session.queues,
  });

  // Speech recognition (STT) setup
  useInterviewSTT({
    speechRecognitionRef: session.speechRecognitionRef,
    isUserMutedRef: session.isUserMutedRef,
    isSpeakingRef: session.isSpeakingRef,
    currentScreenRef: session.currentScreenRef,
    isSubmittingRef: session.isSubmittingRef,
    sttRestartTimeoutRef: session.sttRestartTimeoutRef,
    pauseTimeoutRef: session.pauseTimeoutRef,
    transcriptBufferRef: session.transcriptBufferRef,
    answerBufferRef: session.answerBufferRef,
    hasStartedSpeakingRef: session.hasStartedSpeakingRef,
    setInterimTranscript: session.setInterimTranscript,
    setFinalTranscript: session.setFinalTranscript,
    setSpeechRecognitionAvailable: session.setSpeechRecognitionAvailable,
    onPauseDetected: flow.submitAnswer,
    language: initialConfig?.language,
    pauseThreshold: session.PAUSE_THRESHOLD,
  });

  // ============================================================================
  // useEffect BLOCKS
  // ============================================================================

  // Stop all audio/TTS when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      console.log("[HR Interview] Unmounting - stopping all audio and TTS");
      
      // Stop all HTML5 audio elements
      const audioElements = document.querySelectorAll("audio");
      audioElements.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
      });

      // Cancel speech synthesis (TTS)
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // Stop speech recognition
      if (session.speechRecognitionRef.current) {
        try {
          session.speechRecognitionRef.current.stop();
        } catch (error) {
          console.debug("[HR Interview] Error stopping STT on unmount:", error);
        }
      }

      // Stop media recorder
      if (session.mediaRecorderRef.current && session.mediaRecorderRef.current.state !== 'inactive') {
        session.mediaRecorderRef.current.stop();
      }

      // Stop media stream
      if (session.streamRef.current) {
        session.streamRef.current.getTracks().forEach(track => track.stop());
      }

      console.log("[HR Interview] ✓ Cleanup complete");
    };
  }, []); // Empty deps - only run on unmount

  // Pause interview when tab is hidden
  useEffect(() => {
    if (session.currentScreen !== "interview") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("[HR Interview] ⚠️ Tab hidden - STOPPING all audio and processes");
        
        const audioElements = document.querySelectorAll("audio");
        audioElements.forEach((audio) => {
          audio.pause();
          audio.currentTime = 0;
        });

        if (window.speechSynthesis) {
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
          }
        }

        if (session.speechRecognitionRef.current) {
          try {
            session.speechRecognitionRef.current.stop();
          } catch (error) {
            console.debug("[HR Interview] Error stopping STT:", error);
          }
        }

        media.pauseRecording();
        
        if (session.pauseTimeoutRef.current) {
          clearTimeout(session.pauseTimeoutRef.current);
          session.pauseTimeoutRef.current = null;
        }
        
        setTimeout(() => {
          if (!document.hidden) {
            alert("⚠️ Interview was paused because you navigated away from the tab.\n\nPlease stay on this page during the interview.\n\nClick OK to continue.");
          }
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session.currentScreen, media, session]);

  // Video log persistence
  useEffect(() => {
    if (session.currentScreen !== "interview") return;

    const handleVideoLog = async (log: any) => {
      const result = await actions.storeVideoLogs(interviewId, [log]);
      if (!result.success) {
        console.error("[HR Video] Failed to store log:", result.error);
      }
    };

    const setupCallback = async () => {
      const { setLogCallback } = await import("@/lib/interview/videoQueueIntegration");
      setLogCallback(handleVideoLog);
    };

    setupCallback();

    return () => {
      const cleanup = async () => {
        const { setLogCallback } = await import("@/lib/interview/videoQueueIntegration");
        setLogCallback(null);
      };
      cleanup();
    };
  }, [session.currentScreen, interviewId, actions]);

  // Timer
  useEffect(() => {
    if (session.currentScreen !== "interview") return;

    session.timerRef.current = setInterval(() => {
      session.setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (!session.TESTING_MODE) {
            flow.endInterview();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (session.timerRef.current) clearInterval(session.timerRef.current);
    };
  }, [session.currentScreen, session.TESTING_MODE, flow]);

  // ============================================================================
  // useEffect - Models loading
  // ============================================================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkModelsLoaded = () => {
      const mediaPipeLoaded = (window as any).mediaPipeLoaded || false;
      const yoloLoaded = (window as any).yoloLoaded || false;

      if (mediaPipeLoaded && yoloLoaded && !session.modelsLoaded) {
        console.log("[HR Models] ✅ All models loaded successfully");
        session.setModelsLoaded(true);
      }
    };

    const interval = setInterval(checkModelsLoaded, 1000);
    window.addEventListener("mediapipe-loaded", checkModelsLoaded);
    window.addEventListener("yolo-loaded", checkModelsLoaded);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mediapipe-loaded", checkModelsLoaded);
      window.removeEventListener("yolo-loaded", checkModelsLoaded);
    };
  }, [session.modelsLoaded, session.setModelsLoaded]);

  // Load browser TTS voices
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    loadBrowserVoices();
    window.speechSynthesis.onvoiceschanged = loadBrowserVoices;
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] via-[#0D0D20] to-[#0A0A18]">
      <HeaderBanner
        duration={initialConfig?.duration || 45}
        language={initialConfig?.language || "en-US"}
        difficulty={initialConfig?.difficulty || "mid"}
        mode={initialConfig?.mode || "live"}
      />

      {/* Setup Screen */}
      {session.currentScreen === "setup" && (
        <SetupScreen
          consentRequired={initialConfig?.consentRequired || false}
          hasConsent={session.hasConsent}
          setHasConsent={session.setHasConsent}
          proctoring={initialConfig?.proctoring || null}
          isLoading={session.isLoading}
          onStart={flow.startInterview}
          jobData={jobData}
          resumeData={resumeData}
        />
      )}

      {/* Loading Screen */}
      {session.currentScreen === "loading" && (
        <LoadingScreen
          loadingMessage={session.loadingMessage}
          preprocessingProgress={session.preprocessingProgress}
          speechRecognitionAvailable={session.speechRecognitionAvailable}
        />
      )}

      {/* Hidden VideoProcessing during loading to preload models */}
      {session.currentScreen === "loading" && initialConfig?.proctoring.cameraRequired && (
        <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
          <VideoProcessing />
        </div>
      )}

      {/* Ready Screen */}
      {session.currentScreen === "ready" && (
        <ReadyScreen
          onStart={flow.beginInterview}
          preprocessedChunksReady={session.preprocessedChunks.has(0)}
          modelsLoaded={session.modelsLoaded}
          speechRecognitionAvailable={session.speechRecognitionAvailable}
        />
      )}

      {/* Hidden VideoProcessing on ready screen to keep models loaded */}
      {session.currentScreen === "ready" && initialConfig?.proctoring.cameraRequired && (
        <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
          <VideoProcessing />
        </div>
      )}

      {/* Interview Screen */}
      {session.currentScreen === "interview" && (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Timer */}
          <div className="flex justify-center mb-4">
            <InterviewTimer
              timeRemaining={session.timeRemaining}
              duration={initialConfig?.duration || 45}
            />
          </div>

          {/* Video Boxes */}
          <VideoBoxes
            isSpeaking={session.isSpeaking}
            showCandidateVideo={true}
            cameraRequired={initialConfig?.proctoring.cameraRequired}
          />

          {/* Current Question */}
          <QuestionDisplay
            currentQuestion={session.currentQuestion}
            isSpeaking={session.isSpeaking}
          />

          {/* Recording Status */}
          <RecordingStatus
            isRecording={session.isRecording}
            isSpeaking={session.isSpeaking}
            isUserMuted={session.isUserMuted}
          />

          {/* Transcript */}
          <TranscriptDisplay
            finalTranscript={session.finalTranscript}
            interimTranscript={session.interimTranscript}
            isUserMuted={session.isUserMuted}
            isSpeaking={session.isSpeaking}
          />

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={media.handleToggleMute}
              className={`px-6 py-3 rounded-xl border-2 transition-all ${
                session.isUserMuted
                  ? "bg-red-500/20 border-red-500/50 text-red-300"
                  : "bg-green-500/20 border-green-500/50 text-green-300"
              } hover:bg-white/10`}
              title={session.isUserMuted ? "Click to unmute microphone" : "Click to mute microphone"}
            >
              {session.isUserMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="ml-2 text-sm">{session.isUserMuted ? "Unmute" : "Mute"}</span>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">Questions Asked: {session.stats.questionsAsked}</p>
          </div>
        </div>
      )}

      {/* Complete Screen */}
      {session.currentScreen === "complete" && (
        <CompleteScreen
          closingMessage={session.closingMessage}
          questionsAsked={session.stats.questionsAsked}
          dashboardUrl="/dashboard/candidate"
        />
      )}
    </div>
  );
}

