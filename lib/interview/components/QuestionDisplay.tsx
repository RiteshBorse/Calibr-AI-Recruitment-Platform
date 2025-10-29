"use client";

import React from "react";
import { Volume2 } from "lucide-react";
import type { BaseQuestion } from "../base-types";

interface QuestionDisplayProps {
  currentQuestion: BaseQuestion | null;
  isSpeaking: boolean;
}

export default function QuestionDisplay({
  currentQuestion,
  isSpeaking,
}: QuestionDisplayProps) {
  if (!currentQuestion) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 mb-6 text-center">
        <p className="text-white/40 italic">Preparing next question...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 mb-6">
      {/* Question Type Badge */}
      <div className="mb-4">
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
            currentQuestion.category === "technical"
              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              : currentQuestion.category === "non-technical"
              ? "bg-green-500/20 text-green-300 border border-green-500/30"
              : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
          }`}
        >
          {currentQuestion.category === "technical"
            ? "Technical Question"
            : currentQuestion.category === "non-technical"
            ? "Non-Technical Question"
            : "Follow-up Question"}
          {currentQuestion.difficulty && ` • ${currentQuestion.difficulty}`}
        </span>
      </div>

      {/* Question Text */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Volume2
              className={`w-5 h-5 text-white ${
                isSpeaking ? "animate-pulse" : ""
              }`}
            />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-white/90 text-lg leading-relaxed">
            {currentQuestion.question}
          </p>
          {isSpeaking && (
            <p className="text-purple-300 text-sm mt-3 italic animate-pulse">
              🔊 AI is speaking... Please listen carefully
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
