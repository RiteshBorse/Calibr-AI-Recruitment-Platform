"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface ReadyScreenProps {
  onStart: () => void;
  preprocessedChunksReady: boolean;
  modelsLoaded?: boolean;
  speechRecognitionAvailable?: boolean;
}

export default function ReadyScreen({
  onStart,
  preprocessedChunksReady,
  modelsLoaded = false,
  speechRecognitionAvailable = true,
}: ReadyScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center max-w-2xl">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-white mb-4">Ready to Begin!</h2>
        <p className="text-white/80 mb-8 text-lg leading-relaxed">
          All systems are ready. Click the button below to start your interview.
        </p>
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-center gap-2 text-white/60">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span>Questions preprocessed</span>
          </div>
          {modelsLoaded && (
            <div className="flex items-center justify-center gap-2 text-white/60">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>Proctoring models loaded</span>
            </div>
          )}
          {speechRecognitionAvailable && (
            <div className="flex items-center justify-center gap-2 text-white/60">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>Voice recognition ready</span>
            </div>
          )}
        </div>
        {!speechRecognitionAvailable && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              ⚠️ Voice recognition not available. You&apos;ll need to type your
              answers or use Chrome/Edge browser.
            </p>
          </div>
        )}
        <Button
          size="lg"
          onClick={onStart}
          disabled={!preprocessedChunksReady}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-12 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {preprocessedChunksReady
            ? "Start Interview"
            : "Preparing Questions..."}
        </Button>
      </div>
    </div>
  );
}
