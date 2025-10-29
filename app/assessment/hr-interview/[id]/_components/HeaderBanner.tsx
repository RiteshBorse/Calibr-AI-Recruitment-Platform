"use client";

import { Clock, Languages, Settings } from "lucide-react";

interface HeaderBannerProps {
  duration: number;
  language: string;
  difficulty: string;
  mode: string;
}

export default function HeaderBanner({ duration, language, difficulty, mode }: HeaderBannerProps) {
  return (
    <div className="text-center mb-8 pt-8">
      <h1 className="text-4xl font-bold mb-4">
        <span className="bg-gradient-to-r from-indigo-300 to-rose-300 bg-clip-text text-transparent">
          Voice-Based HR Interview
        </span>
      </h1>
      <p className="text-white/70 text-lg">AI-Powered Behavioral Interview with Proctoring</p>
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span className="text-white/80">{duration} minutes</span>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
          <Languages className="w-4 h-4 text-indigo-400" />
          <span className="text-white/80">{language}</span>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
          <Settings className="w-4 h-4 text-indigo-400" />
          <span className="text-white/80">{difficulty} level</span>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
          <span className="text-white/80">{mode} mode</span>
        </div>
      </div>
    </div>
  );
}
