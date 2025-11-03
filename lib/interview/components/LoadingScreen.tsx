"use client";

import React from "react";

interface LoadingScreenProps {
  loadingMessage: string;
  preprocessingProgress?: number;
  speechRecognitionAvailable?: boolean;
}

export default function LoadingScreen({
  loadingMessage,
  preprocessingProgress = 0,
  speechRecognitionAvailable = true,
}: LoadingScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center max-w-2xl">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-4">
          {loadingMessage}
        </h2>
        {preprocessingProgress > 0 && (
          <div className="mt-6">
            <div className="w-full bg-white/10 rounded-full h-3 mb-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${preprocessingProgress}%` }}
              ></div>
            </div>
            <p className="text-white/60 text-sm">
              {preprocessingProgress}% complete
            </p>
          </div>
        )}
        {!speechRecognitionAvailable && (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              ⚠️ Voice recognition not available in your browser. Please use
              Chrome, Edge, or Safari for the best experience.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
