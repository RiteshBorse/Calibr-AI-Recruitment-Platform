"use client";

import { Button } from "@/components/ui/button";
import { Settings, Mic, Briefcase, User, Play } from "lucide-react";

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
          Technical Interview Setup
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
                  <p className="text-white/80 text-sm line-clamp-4">{resumeData.summary}</p>
                </div>
              )}
              {resumeData.skills && (
                <div>
                  <span className="text-white/60 text-sm">Skills</span>
                  <p className="text-white/80 text-sm line-clamp-3">{resumeData.skills}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {proctoring && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            System Requirements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${proctoring.micRequired ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                <Mic className={`w-5 h-5 ${proctoring.micRequired ? 'text-green-400' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Microphone</p>
                <p className="text-white/60 text-xs">{proctoring.micRequired ? 'Required' : 'Optional'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${proctoring.cameraRequired ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                <span className="text-xl">{proctoring.cameraRequired ? '📷' : '📹'}</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Camera</p>
                <p className="text-white/60 text-xs">{proctoring.cameraRequired ? 'Required' : 'Optional'}</p>
              </div>
            </div>
            
            {proctoring.screenShareRequired && (
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/20">
                  <span className="text-xl">🖥️</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Screen Share</p>
                  <p className="text-white/60 text-xs">Required</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {consentRequired && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <input
              type="checkbox"
              id="consent"
              checked={hasConsent}
              onChange={(e) => setHasConsent(e.target.checked)}
              className="mt-1 w-5 h-5 text-indigo-600 bg-white/10 border-white/30 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="consent" className="text-white/90 cursor-pointer flex-1">
              <span className="font-semibold text-white block mb-1">Consent Required</span>
              <span className="text-sm">
                I consent to this interview being recorded and monitored for assessment purposes. 
                I understand that my audio, video, and screen activity may be captured during this session.
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="text-center">
        <Button
          onClick={onStart}
          disabled={isLoading || (consentRequired && !hasConsent)}
          size="lg"
          className="bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white font-bold text-xl px-16 py-8 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Preparing Interview...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Play className="w-6 h-6" fill="currentColor" />
              <span>Start Voice Interview</span>
            </div>
          )}
        </Button>
        
        {consentRequired && !hasConsent && (
          <p className="text-amber-400 text-sm mt-4 font-medium">
            ⚠️ Please accept the consent to continue
          </p>
        )}
      </div>
    </div>
  );
}
