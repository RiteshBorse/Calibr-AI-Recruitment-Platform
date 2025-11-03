"use client";

import { Button } from "@/components/ui/button";
import { Mic, MicOff, Clock } from "lucide-react";

interface ControlBarProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  timeRemainingLabel: string;
  onEnd: () => void;
}

export default function ControlBar({
  isRecording,
  onStartRecording,
  onStopRecording,
  timeRemainingLabel,
  onEnd,
}: ControlBarProps) {
  return (
    <div className="sticky bottom-0 left-0 right-0 flex items-center justify-center gap-3 py-4">
      <Button
        onClick={isRecording ? onStopRecording : onStartRecording}
        variant="outline"
        size="sm"
        className={`border-white/20 ${isRecording ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white'}`}
      >
        {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </Button>
      <div className="bg-white/10 px-4 py-2 rounded-full border border-white/20">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span className="text-white font-mono text-sm">{timeRemainingLabel}</span>
        </div>
      </div>
      <Button
        onClick={onEnd}
        variant="destructive"
        size="sm"
        className="border-white/20 bg-red-500/20 text-red-300 hover:bg-red-500/30"
      >
        End
      </Button>
    </div>
  );
}