"use client";

import React from "react";

interface TranscriptDisplayProps {
  finalTranscript: string;
  interimTranscript: string;
  isUserMuted: boolean;
  isSpeaking: boolean;
}

export default function TranscriptDisplay({
  finalTranscript,
  interimTranscript,
  isUserMuted,
  isSpeaking,
}: TranscriptDisplayProps) {
  // Don't show transcript while AI is speaking
  if (isSpeaking) {
    return null;
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
      <h3 className="text-white/60 text-sm mb-3">Your Answer:</h3>

      {/* Final Transcript */}
      {finalTranscript && (
        <div className="mb-3">
          <p className="text-white/90 leading-relaxed">{finalTranscript}</p>
        </div>
      )}

      {/* Interim Transcript (Live) */}
      {interimTranscript && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-yellow-300 italic">{interimTranscript}</p>
        </div>
      )}

      {/* Placeholder */}
      {!finalTranscript && !interimTranscript && (
        <p className="text-white/40 italic">
          {isUserMuted
            ? "🔇 Microphone muted - unmute to answer"
            : "Listening for your response... Take your time to think."}
        </p>
      )}

      {/* Auto-submit indicator */}
      {finalTranscript && !isUserMuted && (
        <div className="mt-3 text-white/50 text-xs">
          💡 Answer will auto-submit after 3 seconds of silence. Mute for more time to think
        </div>
      )}

      {/* Muted warning */}
      {isUserMuted && (finalTranscript || interimTranscript) && (
        <div className="mt-3 text-yellow-300 text-xs">
          ⚠️ Microphone is muted - pause timer is disabled
        </div>
      )}
    </div>
  );
}
