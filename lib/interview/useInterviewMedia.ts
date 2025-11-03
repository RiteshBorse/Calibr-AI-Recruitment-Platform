"use client";

import React from "react";
import { playBrowserTTS } from "@/utils/tts";
import { playInterviewAudio } from "@/utils/interview";
import { pauseSpeechRecognition, resumeSpeechRecognition } from "@/utils/media";
import type { ISpeechRecognition } from "@/utils/stt";
import type { BaseQuestion } from "./base-types";

/**
 * Media control functions for interview (recording, playback, mute)
 * These are pure functions that can be used by any interview type
 */

interface UseInterviewMediaOptions {
  speechRecognitionRef: React.MutableRefObject<ISpeechRecognition | null>;
  isUserMutedRef: React.MutableRefObject<boolean>;
  currentQuestionRef: React.MutableRefObject<BaseQuestion | null>;
  pauseTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  answerBufferRef: React.MutableRefObject<string>;
  
  setIsSpeaking: (value: boolean) => void;
  setIsRecording: (value: boolean) => void;
  setIsUserMuted: (value: boolean) => void;
  setFinalTranscript: (value: string) => void;
  setInterimTranscript: (value: string) => void;
  
  markQuestionAsked: (interviewId: string, questionId: string) => Promise<any>;
  interviewId: string;
  language?: string;
}

export function useInterviewMedia(options: UseInterviewMediaOptions) {
  const {
    speechRecognitionRef,
    isUserMutedRef,
    currentQuestionRef,
    pauseTimeoutRef,
    answerBufferRef,
    setIsSpeaking,
    setIsRecording,
    setIsUserMuted,
    markQuestionAsked,
    interviewId,
    language = "en-US",
  } = options;

  /**
   * Pause recording (stop STT but keep mic stream active)
   */
  const pauseRecording = () => {
    pauseSpeechRecognition(speechRecognitionRef.current);
    setIsRecording(false);
  };

  /**
   * Resume recording (restart STT) - only if not user-muted
   */
  const resumeRecording = () => {
    resumeSpeechRecognition(speechRecognitionRef.current, isUserMutedRef.current);
    if (!isUserMutedRef.current) {
      setIsRecording(true);
    }
  };

  /**
   * Use browser's built-in speech synthesis as fallback
   */
  const playBrowserAudio = (
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ) => {
    playBrowserTTS(
      text,
      language,
      () => {
        setIsSpeaking(true);
        onStart?.();
      },
      () => {
        setIsSpeaking(false);
        onEnd?.();
      },
      (event) => {
        console.error("[TTS] Browser TTS error:", event);
        setIsSpeaking(false);
        onEnd?.();
      }
    );
  };

  /**
   * Play audio with fallback to browser TTS
   * Automatically pauses recording during playback and resumes after
   */
  const playQuestionAudio = async (
    audioUrl?: string,
    questionText?: string
  ) => {
    const text = questionText || currentQuestionRef.current?.question || "";

    // Pause recording during AI speech
    pauseRecording();

    // Mark question as asked (set askedAt) right before playback starts
    try {
      if (currentQuestionRef.current?.id) {
        await markQuestionAsked(interviewId, currentQuestionRef.current.id);
      }
    } catch (err) {
      console.warn("[Audio] markQuestionAsked failed:", err);
    }

    const onAudioStart = () => {
      setIsSpeaking(true);
    };

    const onAudioEnd = () => {
      setIsSpeaking(false);
      // Resume recording immediately after AI finishes speaking
      setTimeout(() => resumeRecording(), 300);
    };

    // Use utility function for playback with fallback
    await playInterviewAudio(
      audioUrl,
      text,
      onAudioStart,
      onAudioEnd,
      (text, onEnd) => playBrowserAudio(text, undefined, onEnd)
    );
  };

  /**
   * Toggle mute state
   */
  const handleToggleMute = () => {
    const newMutedState = !isUserMutedRef.current;
    setIsUserMuted(newMutedState);
    isUserMutedRef.current = newMutedState;

    if (newMutedState) {
      // User muted - stop STT but PRESERVE transcripts
      console.log("[Mute] 🔇 User muted mic - stopping STT and clearing pause timer");
      console.log("[Mute] Preserving current answer:", answerBufferRef.current);

      // Stop STT immediately
      pauseRecording();

      // CRITICAL: Clear pause timer to prevent auto-submission
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
        console.log("[Mute] ✓ Cleared pause timer - submission blocked");
      }

      // DON'T clear transcripts - preserve what user has said
    } else {
      // User unmuted - resume STT from where they left off
      console.log("[Mute] 🎤 User unmuted mic - resuming STT");
      console.log("[Mute] Continuing from previous answer:", answerBufferRef.current);

      // Resume STT - will append to existing buffers
      resumeRecording();
    }
  };

  return {
    pauseRecording,
    resumeRecording,
    playBrowserAudio,
    playQuestionAudio,
    handleToggleMute,
  };
}
