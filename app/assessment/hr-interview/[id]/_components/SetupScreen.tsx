"use client";

import { Button } from "@/components/ui/button";
import { Settings, Briefcase, User, Play } from "lucide-react";

interface SetupScreenProps {
  consentRequired: boolean;
  hasConsent: boolean;
  setHasConsent: (v: boolean) => void;
  proctoring: { micRequired: boolean; cameraRequired: boolean; screenShareRequired: boolean } | null;
  isLoading: boolean;
  onStart: () => void;
  jobData?: {
    title: string;
    position: string;
    department: string;
    seniority: string;
    techStack: string[];
  };
  resumeData?: {
    tagline?: string;
    summary?: string;
    skills?: string;
  };
}

export default function SetupScreen({
  consentRequired,
  hasConsent,
  setHasConsent,
  proctoring,
  isLoading,
  onStart,
  jobData,
  resumeData,
}: SetupScreenProps) {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-3">
          HR Interview Setup
        </h2>
        <p className="text-white/60 text-lg">Review the details and start your interview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {jobData && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              Position Details
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-white/60 text-sm">Role</span>
                <p className="text-white font-medium text-lg">{jobData.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-white/60 text-sm">Position</span>
                  <p className="text-white font-medium">{jobData.position}</p>
                </div>
                <div>
                  <span className="text-white/60 text-sm">Level</span>
                  <p className="text-white font-medium capitalize">{jobData.seniority}</p>
                </div>
              </div>
              <div>
                <span className="text-white/60 text-sm">Department</span>
                <p className="text-white font-medium">{jobData.department}</p>
              </div>
              {jobData.techStack && jobData.techStack.length > 0 && (
                <div>
                  <span className="text-white/60 text-sm block mb-2">Tech Stack</span>
                  <div className="flex flex-wrap gap-2">
                    {jobData.techStack.map((tech, i) => (
                      <span 
                        key={i} 
                        className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {resumeData && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-rose-400" />
              Your Profile
            </h3>
            <div className="space-y-3">
              {resumeData.tagline && (
                <div>
                  <span className="text-white/60 text-sm">Tagline</span>
                  <p className="text-white font-medium">{resumeData.tagline}</p>
                </div>
              )}
              {resumeData.summary && (
                <div>
                  <span className="text-white/60 text-sm">Summary</span>
                  <p className="text-white text-sm line-clamp-3">{resumeData.summary}</p>
                </div>
              )}
              {resumeData.skills && (
                <div>
                  <span className="text-white/60 text-sm block mb-2">Skills</span>
                  <div className="flex flex-wrap gap-2">
                    {resumeData.skills.split(",").map((skill, i) => (
                      <span 
                        key={i} 
                        className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs font-medium"
                      >
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {proctoring && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            System Requirements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {proctoring.cameraRequired && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Camera</p>
                  <p className="text-white/60 text-xs">Required for proctoring</p>
                </div>
              </div>
            )}
            {proctoring.micRequired && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Microphone</p>
                  <p className="text-white/60 text-xs">Required for recording</p>
                </div>
              </div>
            )}
            {proctoring.screenShareRequired && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Screen Share</p>
                  <p className="text-white/60 text-xs">May be required</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {consentRequired && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={hasConsent}
              onChange={(e) => setHasConsent(e.target.checked)}
              className="w-5 h-5 mt-1 accent-amber-500"
            />
            <label htmlFor="consent" className="flex-1">
              <p className="text-white font-medium mb-2">I Understand and Consent</p>
              <p className="text-white/70 text-sm leading-relaxed">
                I understand that this interview will be recorded and proctored. I consent to the use of 
                my camera, microphone, and screen during this assessment. My responses will be analyzed 
                by AI and reviewed by interviewers. I agree to follow all assessment guidelines and policies.
              </p>
            </label>
          </div>
        </div>
      )}

      <div className="flex gap-4 justify-center">
        <Button
          onClick={onStart}
          disabled={consentRequired && !hasConsent || isLoading}
          size="lg"
          className="bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-700 hover:to-rose-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Play className="w-5 h-5" />
          {isLoading ? "Starting..." : "Start Interview"}
        </Button>
      </div>
    </div>
  );
}
