"use client";
import React from "react";
/// <reference types="node" />

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
} from "lucide-react";
import { technicalInterviewAdapter } from "../adapter";
import VideoProcessing from "@/lib/video-processing";
import { ControlBar, StatsCards, ChatList } from "@/lib/interview/components";
import QueuesPanel from "./_components/QueuesPanel";
import HeaderBanner from "./_components/HeaderBanner";
import SetupScreen from "./_components/SetupScreen";
import LoadingScreen from "./_components/LoadingScreen";
import type { InterviewConfig, Question, ConversationItem } from "../types";
import { ttsToAudioUrl, getMicStreamAudioOnly } from "@/utils/media";

// Minimal typings for Web Speech API (not included in default TS DOM lib)
declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
}

type Conversation = ConversationItem;

export default function VoiceInterviewPage() {
  const params = useParams();
  const interviewId = params.id as string;
  
  const [currentScreen, setCurrentScreen] = useState<
    "setup" | "loading" | "interview" | "complete"
  >("setup");
  const [resumeData, setResumeData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [conversation, setConversation] = useState<Conversation[]>([]);
  const [queues, setQueues] = useState<{
    queue1: Question[];
    queue2: Question[];
    queue3: Question[];
  }>({ queue1: [], queue2: [], queue3: [] });
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [stats, setStats] = useState({
    questionsAsked: 0,
    queue1Size: 0,
    queue2Size: 0,
    queue3Size: 0,
  });

  // Voice and media states
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [interviewConfig, setInterviewConfig] =
    useState<InterviewConfig | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [hasConsent, setHasConsent] = useState(false);

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  // Camera preview is handled by VideoProcessing component
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const evaluationStartedRef = useRef<boolean>(false);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch interview configuration on component mount
  useEffect(() => {
    const fetchInterviewConfig = async () => {
      try {
        const result = await technicalInterviewAdapter.getConfig(interviewId);
        if (result.success && result.config) {
          setInterviewConfig(result.config);
          setTimeRemaining(result.config.duration * 60); // Convert minutes to seconds
        } else {
          console.error("Interview configuration not found:", result.error);
        }
      } catch (error) {
        console.error("Error fetching interview config:", error);
      }
    };

    if (interviewId) {
      fetchInterviewConfig();
    }
  }, [interviewId]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = interviewConfig?.language || "en-US";
      
      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setUserAnswer((prev) => prev + (prev ? " " : "") + finalTranscript);
          if (autoSubmitTimerRef.current)
            clearTimeout(autoSubmitTimerRef.current);
          autoSubmitTimerRef.current = setTimeout(() => {
            submitAnswer();
          }, 600);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      speechRecognitionRef.current = recognition;
    }
  }, [interviewConfig?.language]);

  // Timer effect
  useEffect(() => {
    if (currentScreen === "interview" && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            endInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentScreen, timeRemaining]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  const displayMessage = (content: string, isBot: boolean) => {
    setConversation((prev) => [
      ...prev,
      {
      role: isBot ? "assistant" : "user",
      content,
      question: isBot ? currentQuestion : undefined,
        timestamp: new Date(),
      },
    ]);
  };

  // Voice and media functions
  const stopAudioPlayback = () => {
    try {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
        audioElementRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    } catch {
      // Ignore errors during cleanup
    }
    setIsSpeaking(false);
  };

  const speakText = async (text: string) => {
    // Stop any ongoing playback
    stopAudioPlayback();

    try {
      setIsSpeaking(true);
      const objectUrl = await ttsToAudioUrl(text);
      audioUrlRef.current = objectUrl;
      const audio = new Audio(objectUrl);
      audioElementRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        // cleanup URL after end
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        audioElementRef.current = null;
      };
      await audio.play();
    } catch (e) {
      console.error("Audio playback error:", e);
      setIsSpeaking(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await getMicStreamAudioOnly();
      
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        // Here you would typically send the audio to a speech-to-text service
        console.log("Audio recorded:", audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start speech recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.start();
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert(
        "Please allow microphone and camera access to continue with the interview."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const stopScreenShare = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const startInterview = async () => {
    if (!resumeData.trim()) {
      alert("Please paste resume data first!");
      return;
    }

    if (interviewConfig?.consentRequired && !hasConsent) {
      alert("Please provide consent to continue with the interview.");
      return;
    }

    setIsLoading(true);
    setCurrentScreen("loading");

    try {
      // Start media recording if required
      if (
        interviewConfig?.proctoring.micRequired ||
        interviewConfig?.proctoring.cameraRequired
      ) {
        await startRecording();
      }
      // Start evaluation document once per session
      if (!evaluationStartedRef.current) {
        await technicalInterviewAdapter.startEvaluation(interviewId);
        evaluationStartedRef.current = true;
      }

      // Batched generation (20% of estimated total)
      const estimatedTotal = Math.max(
        10,
        Math.floor((interviewConfig?.duration || 30) / 2)
      );
      const batchCount = Math.max(3, Math.ceil(estimatedTotal * 0.2));
      const batch = await technicalInterviewAdapter.generateBatch(resumeData, batchCount);
      if (batch.success && batch.questions) {
        const nextQueues = {
          queue1: batch.questions,
          queue2: [],
          queue3: [],
        } as typeof queues;
        setQueues(nextQueues);
        setStats((prev) => ({
          ...prev,
          queue1Size: nextQueues.queue1.length,
          queue2Size: 0,
          queue3Size: 0,
        }));
        setCurrentScreen("interview");
        askNextQuestion(nextQueues);
      } else {
        alert("Failed to generate questions. Please try again.");
        setCurrentScreen("setup");
      }
    } catch (error) {
      console.error("Error starting interview:", error);
      alert("An error occurred. Please try again.");
      setCurrentScreen("setup");
    } finally {
      setIsLoading(false);
    }
  };

  const askNextQuestion = async (currentQueues = queues) => {
    let nextQuestion: Question | null = null;
    let queueType: keyof typeof currentQueues = "queue1";

    if (currentQueues.queue3.length > 0) {
      nextQuestion = currentQueues.queue3[0];
      queueType = "queue3";
    } else if (currentQueues.queue1.length > 0) {
      nextQuestion = currentQueues.queue1[0];
      queueType = "queue1";
    }

    if (!nextQuestion) {
      endInterview();
      return;
    }

    setCurrentQuestion(nextQuestion);
    setStats((prev) => ({
      ...prev,
      questionsAsked: prev.questionsAsked + 1,
      [queueType + "Size"]: currentQueues[queueType].length - 1,
    }));

    // Remove question from queue
    setQueues((prev) => ({
      ...prev,
      [queueType]: prev[queueType].slice(1),
    }));

    displayMessage(nextQuestion.question, true);
    
    // Speak the question if voice is enabled
    if (interviewConfig?.mode === "live") {
      speakText(nextQuestion.question);
    }

    // Top-up batching if queue1 is low
    const estimatedTotal = Math.max(
      10,
      Math.floor((interviewConfig?.duration || 30) / 2)
    );
    const batchThreshold = Math.max(3, Math.ceil(estimatedTotal * 0.2));
    if (queues.queue1.length < batchThreshold) {
      try {
        const batch = await technicalInterviewAdapter.generateBatch(resumeData, batchThreshold);
        if (batch.success && batch.questions?.length) {
          setQueues((prev) => ({
            ...prev,
            queue1: [...prev.queue1, ...batch.questions!],
          }));
          setStats((prev) => ({
            ...prev,
            queue1Size: queues.queue1.length + batch.questions!.length,
          }));
        }
      } catch (e) {
        console.error("Batch top-up failed", e);
      }
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim() || !currentQuestion) return;

    const answer = userAnswer.trim();
    setUserAnswer("");
    displayMessage(answer, false);

    try {
      if (currentQuestion.category === "technical" && currentQuestion.answer) {
        const analysis = await technicalInterviewAdapter.analyze(
          currentQuestion.question,
          currentQuestion.answer,
          answer,
          queues,
          currentQuestion
        );

        if (analysis.updatedQueues) {
          setQueues(analysis.updatedQueues);
          setStats((prev) => ({
            ...prev,
            queue1Size: analysis.updatedQueues!.queue1.length,
            queue2Size: analysis.updatedQueues!.queue2.length,
            queue3Size: analysis.updatedQueues!.queue3.length,
          }));
        }
        try {
          await technicalInterviewAdapter.persistQA(interviewId, {
            question_text: currentQuestion.question,
            ideal_answer: currentQuestion.answer,
            user_answer: answer,
            correctness_score: analysis.correctness,
            question_type: currentQuestion.category as any,
            queue_number: 1, // Base question from Queue 1
            timestamp: new Date(),
            source_urls: [],
          });
        } catch (e) {
          console.error("Failed to append QA", e);
        }
      }

      // Wait a bit before asking next question
      setTimeout(() => askNextQuestion(), 1000);
    } catch (error) {
      console.error("Error submitting answer:", error);
      // Continue with next question even if analysis fails
      setTimeout(() => askNextQuestion(), 1000);
    }
  };

  const endInterview = () => {
    // Stop all media streams
    stopRecording();
    stopScreenShare();
    
    // Stop any speech/audio playback
    if (speechSynthesisRef.current) {
      speechSynthesis.cancel();
    }
    stopAudioPlayback();
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setCurrentScreen("complete");
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "medium":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "hard":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] to-[#0D0D20] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
          {interviewConfig && (
          <HeaderBanner
            duration={interviewConfig.duration}
            language={interviewConfig.language}
            difficulty={interviewConfig.difficulty}
            mode={interviewConfig.mode}
          />
        )}

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* Setup Screen */}
          {currentScreen === "setup" && interviewConfig && (
            <SetupScreen
              resumeData={resumeData}
              setResumeData={setResumeData}
              consentRequired={!!interviewConfig.consentRequired}
              hasConsent={hasConsent}
              setHasConsent={setHasConsent}
              proctoring={interviewConfig.proctoring}
              isLoading={isLoading}
              onStart={startInterview}
            />
          )}

          {/* Loading Screen */}
          {currentScreen === "loading" && <LoadingScreen />}

          {/* Interview Screen */}
          {currentScreen === "interview" && (
            <div className="p-6">
              {/* Timer and Voice Controls */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 px-4 py-2 rounded-full border border-white/20">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      <span className="text-white font-mono text-lg">
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Voice Controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      variant="outline"
                      size="sm"
                      className={`border-white/20 ${
                        isRecording
                          ? "bg-red-500/20 text-red-300"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {isRecording ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      onClick={toggleMute}
                      variant="outline"
                      size="sm"
                      className={`border-white/20 ${
                        isMuted
                          ? "bg-red-500/20 text-red-300"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                    
                    {/* Stop Interview */}
                      <Button
                      onClick={endInterview}
                      variant="destructive"
                        size="sm"
                      className="border-white/20 bg-red-500/20 text-red-300 hover:bg-red-500/30"
                    >
                      Stop
                      </Button>
                  </div>
                </div>
                
                {/* Speaking Indicator */}
                {isSpeaking && (
                  <div className="flex items-center gap-2 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                    <span className="text-indigo-300 text-sm">AI Speaking</span>
                  </div>
                )}
              </div>

              {/* Video Processing (camera preview and detection) */}
              {interviewConfig?.proctoring.cameraRequired && (
                <div className="mb-6">
                  <VideoProcessing />
                </div>
              )}

              {/* Stats */}
              <StatsCards
                questionsAsked={stats.questionsAsked}
                queue1Size={stats.queue1Size}
                queue2Size={stats.queue2Size}
                queue3Size={stats.queue3Size}
              />

              {/* Chat Container */}
              <ChatList items={conversation} />

              {/* Bottom control bar (Meet-like) */}
              <ControlBar
                isRecording={isRecording}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                timeRemainingLabel={formatTime(timeRemaining)}
                onEnd={endInterview}
              />

              {/* Queues Panel */}
              <QueuesPanel
                queue1={queues.queue1}
                queue2={queues.queue2}
                queue3={queues.queue3}
                getDifficultyColor={getDifficultyColor}
              />
            </div>
          )}

          {/* Complete Screen */}
          {currentScreen === "complete" && (
            <div className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-white mb-4">
                Interview Completed!
              </h2>
              <p className="text-white/70 text-lg mb-8">
                Thank you for completing the interview. The session has been
                saved and analyzed.
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white font-semibold text-lg px-8 py-6 rounded-xl"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Start New Interview
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
