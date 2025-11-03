"use client";

import React from "react";

interface RecordingStatusProps {
  isRecording: boolean;
  isSpeaking: boolean;
  isUserMuted: boolean;
}

export default function RecordingStatus({
  isRecording,
  isSpeaking,
  isUserMuted,
}: RecordingStatusProps) {
  // AI Speaking indicator
  if (isSpeaking) {
    return (
      <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
          <p className="text-purple-300 font-semibold">
            🔊 AI is speaking - Please listen carefully
          </p>
        </div>
      </div>
    );
  }

  // User recording indicator
  if (isRecording && !isUserMuted) {
    return (
      <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-2 h-4 bg-green-500 rounded-sm animate-pulse"></div>
            <div
              className="w-2 h-4 bg-green-500 rounded-sm animate-pulse"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-2 h-4 bg-green-500 rounded-sm animate-pulse"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
          <p className="text-green-300 font-semibold">
            🎤 Recording - Speak your answer now
          </p>
        </div>
      </div>
    );
  }

  // User muted indicator
  if (isUserMuted && !isSpeaking) {
    return (
      <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
          <p className="text-yellow-300 font-semibold">
            🔇 Microphone Muted - Unmute to continue answering
          </p>
        </div>
      </div>
    );
  }

  return null;
}
