"use client";

import { Button } from "@/components/ui/button";
import { FileText, Settings, Mic } from "lucide-react";

interface SetupScreenProps {
  resumeData: string;
  setResumeData: (v: string) => void;
  consentRequired: boolean;
  hasConsent: boolean;
  setHasConsent: (v: boolean) => void;
  proctoring: { micRequired: boolean; cameraRequired: boolean; screenShareRequired: boolean } | null;
  isLoading: boolean;
  onStart: () => void;
}

export default function SetupScreen({
  resumeData,
  setResumeData,
  consentRequired,
  hasConsent,
  setHasConsent,
  proctoring,
  isLoading,
  onStart,
}: SetupScreenProps) {
  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2 flex items-center justify-center gap-3">
          <FileText className="w-6 h-6 text-indigo-400" />
          Step 1: Paste Resume Data
        </h2>
      </div>

      <textarea
        value={resumeData}
        onChange={(e) => setResumeData(e.target.value)}
        placeholder={`Paste the candidate's resume here including:
- Introduction & Background
- Education
- Technical Skills
- Experience
- Projects
- Achievements
- Certifications`}
        className="w-full h-64 p-6 text-white placeholder:text-white/50 text-lg border border-white/30 bg-white/10 rounded-2xl backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 resize-none"
      />

      {proctoring && (
        <div className="mt-6 p-6 bg-white/5 border border-white/10 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Interview Requirements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Mic className={`w-4 h-4 ${proctoring.micRequired ? 'text-green-400' : 'text-gray-400'}`} />
              <span className="text-white/80">Microphone {proctoring.micRequired ? 'Required' : 'Optional'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 inline-flex items-center justify-center rounded-full ${proctoring.cameraRequired ? 'text-green-400' : 'text-gray-400'}`}>📷</span>
              <span className="text-white/80">Camera {proctoring.cameraRequired ? 'Required' : 'Optional'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 inline-flex items-center justify-center rounded-full ${proctoring.screenShareRequired ? 'text-green-400' : 'text-gray-400'}`}>🖥️</span>
              <span className="text-white/80">Screen Share {proctoring.screenShareRequired ? 'Required' : 'Optional'}</span>
            </div>
          </div>
        </div>
      )}

      {consentRequired && (
        <div className="mt-6 p-6 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={hasConsent}
              onChange={(e) => setHasConsent(e.target.checked)}
              className="mt-1 w-4 h-4 text-indigo-600 bg-white/10 border-white/30 rounded focus:ring-indigo-500"
            />
            <label htmlFor="consent" className="text-white/80 text-sm">
              I consent to this interview being recorded and monitored for assessment purposes. 
              I understand that my audio, video, and screen activity may be captured during this session.
            </label>
          </div>
        </div>
      )}

      <div className="text-center mt-6">
        <Button
          onClick={onStart}
          disabled={isLoading || (consentRequired && !hasConsent)}
          className="bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white font-semibold text-lg px-8 py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating Questions...
            </div>
          ) : (
            <>Start Voice Interview</>
          )}
        </Button>
      </div>
    </div>
  );
}


