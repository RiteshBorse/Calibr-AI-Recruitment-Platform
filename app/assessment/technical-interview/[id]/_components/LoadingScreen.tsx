"use client";

import { Brain } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="p-12 text-center">
      <div className="mb-8">
        <Brain className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-pulse" />
        <h2 className="text-2xl font-semibold text-white mb-4">AI is Analyzing Resume...</h2>
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-white/70 mt-6 text-lg">Extracting information and generating questions...</p>
      </div>
    </div>
  );
}


