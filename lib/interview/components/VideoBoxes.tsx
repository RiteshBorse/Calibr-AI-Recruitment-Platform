"use client";

import React from "react";
import { Volume2 } from "lucide-react";
import VideoProcessing from "@/lib/video-processing";

interface VideoBoxesProps {
  isSpeaking: boolean;
  showCandidateVideo: boolean;
  cameraRequired?: boolean;
}

export default function VideoBoxes({
  isSpeaking,
  showCandidateVideo,
  cameraRequired = true,
}: VideoBoxesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* AI Avatar / Interviewer */}
      <div className="relative aspect-video bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl border border-white/10 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Volume2
                className={`w-12 h-12 text-white ${
                  isSpeaking ? "animate-pulse" : ""
                }`}
              />
            </div>
            <p className="text-white/70 text-sm">AI Interviewer</p>
          </div>
        </div>
      </div>

      {/* Candidate Webcam - Q0 Video Processing */}
      {showCandidateVideo && (
        <div className="relative aspect-video bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
          {cameraRequired && <VideoProcessing autoStart={true} />}
          {!cameraRequired && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/50 text-sm">Camera not required</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
