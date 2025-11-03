"use client";

import React from "react";
import { Clock } from "lucide-react";
import { formatTime } from "@/utils/interview";

interface InterviewTimerProps {
  timeRemaining: number; // in seconds
  duration: number; // total duration in minutes
}

export default function InterviewTimer({
  timeRemaining,
  duration,
}: InterviewTimerProps) {
  const totalSeconds = duration * 60;
  const percentageRemaining = (timeRemaining / totalSeconds) * 100;

  // Determine color based on time remaining
  const getTimerColor = () => {
    if (percentageRemaining > 50) return "text-green-400";
    if (percentageRemaining > 20) return "text-yellow-400";
    return "text-red-400";
  };

  const getProgressColor = () => {
    if (percentageRemaining > 50) return "from-green-500 to-emerald-500";
    if (percentageRemaining > 20) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-rose-500";
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Clock className={`w-6 h-6 ${getTimerColor()}`} />
          <div>
            <p className="text-white/60 text-sm">Time Remaining</p>
            <p className={`text-2xl font-bold ${getTimerColor()}`}>
              {formatTime(timeRemaining)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/60 text-sm">Duration</p>
          <p className="text-white/90 text-lg font-semibold">
            {duration} min
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-2">
        <div
          className={`bg-gradient-to-r ${getProgressColor()} h-2 rounded-full transition-all duration-1000`}
          style={{ width: `${percentageRemaining}%` }}
        ></div>
      </div>

      {/* Warning message */}
      {percentageRemaining <= 10 && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-300 text-sm text-center">
            ⚠️ Less than {Math.ceil(timeRemaining / 60)} minute
            {Math.ceil(timeRemaining / 60) !== 1 ? "s" : ""} remaining!
          </p>
        </div>
      )}
    </div>
  );
}
