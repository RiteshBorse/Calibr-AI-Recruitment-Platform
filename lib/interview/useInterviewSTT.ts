"use client";

import React from "react";
import { useEffect } from "react";
import { initWebSpeechRecognition, type ISpeechRecognition } from "@/utils/stt";

interface UseInterviewSTTOptions {
  speechRecognitionRef: React.MutableRefObject<ISpeechRecognition | null>;
  isUserMutedRef: React.MutableRefObject<boolean>;
  isSpeakingRef: React.MutableRefObject<boolean>;
  currentScreenRef: React.MutableRefObject<string>;
  isSubmittingRef: React.MutableRefObject<boolean>;
  sttRestartTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  pauseTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  transcriptBufferRef: React.MutableRefObject<string>;
  answerBufferRef: React.MutableRefObject<string>;
  hasStartedSpeakingRef: React.MutableRefObject<boolean>;
  
  setInterimTranscript: (value: string) => void;
  setFinalTranscript: (value: string) => void;
  setSpeechRecognitionAvailable: (value: boolean) => void;
  
  onPauseDetected: () => void; // Callback when user pauses speaking
  
  language?: string;
  pauseThreshold?: number;
}

export function useInterviewSTT(options: UseInterviewSTTOptions) {
  const {
    speechRecognitionRef,
    isUserMutedRef,
    isSpeakingRef,
    currentScreenRef,
    isSubmittingRef,
    sttRestartTimeoutRef,
    pauseTimeoutRef,
    transcriptBufferRef,
    answerBufferRef,
    hasStartedSpeakingRef,
    setInterimTranscript,
    setFinalTranscript,
    setSpeechRecognitionAvailable,
    onPauseDetected,
    language = "en-US",
    pauseThreshold = 3000,
  } = options;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check browser compatibility
    const isSupported = !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );

    if (!isSupported) {
      console.error("[STT] Web Speech API not supported in this browser");
      console.log("[STT] Supported browsers: Chrome, Edge, Safari (iOS 14.5+)");
      console.log("[STT] Current browser:", navigator.userAgent);
      setSpeechRecognitionAvailable(false);
      return;
    }

    console.log("[STT] Web Speech API is supported, initializing...");
    setSpeechRecognitionAvailable(true);

    const recognition = initWebSpeechRecognition(
      language,
      (transcript: string) => {
        // This callback receives final transcripts
        console.log("[STT] Final transcript received:", transcript);
      }
    );

    if (recognition) {
      // Override onresult to handle both interim and final results
      recognition.onresult = (event: any) => {
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            // Final result - add to buffer
            console.log("[STT] Final:", transcript);
            transcriptBufferRef.current += transcript + " ";
            answerBufferRef.current += transcript + " ";

            // Mark that user has started speaking (for first word)
            if (!hasStartedSpeakingRef.current && transcript.trim().length > 0) {
              hasStartedSpeakingRef.current = true;
              console.log("[STT] ✅ User started speaking, answer recording active");
            }

            // Update UI
            setFinalTranscript(answerBufferRef.current);
            setInterimTranscript("");
          } else {
            // Interim result - just for display
            interim += transcript;
          }
        }

        // Only update UI for interim results
        if (interim) {
          setInterimTranscript(interim);
        }

        // CRITICAL: Reset pause timer on EVERY result (both interim and final)
        // This ensures we track actual user silence, not just waiting for API to finalize
        if (hasStartedSpeakingRef.current) {
          // Clear any existing pause timeout
          if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
            pauseTimeoutRef.current = null;
          }

          // Start new pause detection timer (3 seconds of ACTUAL silence)
          // IMPORTANT: This timer will be cleared if:
          // 1. User speaks again (interim or final result)
          // 2. User manually mutes (handled in media controls)
          // 3. Answer is submitted
          pauseTimeoutRef.current = setTimeout(() => {
            // Only trigger if:
            // 1. User has actually spoken something
            // 2. Not currently muted (check isUserMutedRef)
            // 3. Not already submitting
            if (
              hasStartedSpeakingRef.current && 
              answerBufferRef.current.trim().length > 0 &&
              !isUserMutedRef.current &&
              !isSubmittingRef.current
            ) {
              console.log(`[STT] ⏸️ Pause detected (${pauseThreshold}ms of TRUE SILENCE) - triggering submission`);
              onPauseDetected();
            } else if (isUserMutedRef.current) {
              console.log(`[STT] ⏸️ ${pauseThreshold}ms passed but user is muted - NOT submitting`);
            }
          }, pauseThreshold);
        }
      };

      recognition.onstart = () => {
        // Reduced logging - only log when actually starting
      };

      recognition.onerror = (event: any) => {
        // Ignore common/expected errors
        const ignoredErrors = ["no-speech", "aborted", "audio-capture"];
        if (!ignoredErrors.includes(event.error)) {
          console.error("[STT] Error:", event.error);
        }
      };

      recognition.onend = () => {
        // Prevent rapid restart loops - only allow restart after 500ms delay
        if (sttRestartTimeoutRef.current) {
          clearTimeout(sttRestartTimeoutRef.current);
          sttRestartTimeoutRef.current = null;
        }

        // Auto-restart ONLY if:
        // 1. Currently in interview screen (use REF)
        // 2. Not currently speaking (AI is not talking) (use REF)
        // 3. Not submitting answer (use REF)
        // 4. User hasn't manually muted mic (use REF)
        const shouldRestart =
          currentScreenRef.current === "interview" &&
          !isSpeakingRef.current &&
          !isSubmittingRef.current &&
          !isUserMutedRef.current;

        if (shouldRestart) {
          sttRestartTimeoutRef.current = setTimeout(() => {
            try {
              if (speechRecognitionRef.current) {
                speechRecognitionRef.current.start();
              }
            } catch (error: any) {
              // Ignore "already started" errors
              if (!error.message?.includes("already started")) {
                console.error("[STT] Restart error:", error);
              }
            }
          }, 500);
        } else {
          // Log why restart was blocked (only once when state changes)
          const reasons = [];
          if (currentScreenRef.current !== "interview") reasons.push("not in interview");
          if (isSpeakingRef.current) reasons.push("AI speaking");
          if (isSubmittingRef.current) reasons.push("submitting");
          if (isUserMutedRef.current) reasons.push("user muted");
          if (reasons.length > 0) {
            console.log(`[STT] Auto-restart blocked: ${reasons.join(", ")}`);
          }
        }
      };

      speechRecognitionRef.current = recognition;
      console.log("[STT] Speech recognition initialized successfully");
    } else {
      console.error("[STT] Failed to initialize speech recognition");
      setSpeechRecognitionAvailable(false);
    }

    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (error) {
          // error intentionally unused - we ignore cleanup errors
          console.debug("Error stopping speech recognition:", error);
        }
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      if (sttRestartTimeoutRef.current) {
        clearTimeout(sttRestartTimeoutRef.current);
      }
    };
  }, []); // Empty deps - initialize ONCE only
}
