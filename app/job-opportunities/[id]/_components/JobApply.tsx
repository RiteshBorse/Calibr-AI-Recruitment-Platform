"use client";

import React from "react";
import { JobOpportunity } from "../../types";
import { useResumes } from "../../hooks";
import { applyToJob } from "../../actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  FileUser,
  Send,
  Building,
  MapPin,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

interface JobApplyProps {
  job?: JobOpportunity | null;
  isLoading?: boolean;
}

export default function JobApply({ job, isLoading }: JobApplyProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedResume, setSelectedResume] = React.useState<string>("");
  const [readTerms, setReadTerms] = React.useState(false);
  const [confirmSend, setConfirmSend] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch resumes - already filtered by profile.resumes array in the hook
  const { resumes, isLoading: resumesLoading } = useResumes();
  
  const canConfirm = (resumes.length === 0 || selectedResume) && readTerms && confirmSend;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const handleApplyClick = () => {
    setOpen(true);
  };

  const handleConfirmApply = async () => {
    setIsSubmitting(true);
    
    try {
      // Pass the selected resume ID to the applyToJob function
      await applyToJob(job._id, selectedResume || undefined);
      
      setOpen(false);
      // Reset form
      setSelectedResume("");
      setReadTerms(false);
      setConfirmSend(false);
      
      const message = selectedResume 
        ? 'Your application with selected resume has been submitted successfully!'
        : 'Your application has been submitted successfully! Consider uploading a resume to strengthen future applications.';
      
      toast.success("Application Confirmed!", {
        description: message,
        duration: 5000
      });
    } catch (error) {
      console.error('Error applying to job:', error);
      toast.error("Application Failed", {
        description: error instanceof Error ? error.message : 'Failed to submit application. Please try again.',
        duration: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    // Reset form
    setSelectedResume("");
    setReadTerms(false);
    setConfirmSend(false);
  };

  return (
    <>
      <Button
        className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0"
        onClick={handleApplyClick}
      >
        <Send className="h-5 w-5 mr-2" />
        Apply Now
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-lg bg-gradient-to-br from-[#0A0A18] to-[#0D0D20] border-white/10 text-white overflow-y-auto px-6 py-8"
        >
          <SheetHeader className="pb-6">
            <SheetTitle className="text-2xl font-bold text-white mb-4">
              Apply to {job.company || job.department}
            </SheetTitle>
            {/* Job Information */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Building className="h-5 w-5 text-violet-400" />
                <div>
                  <p className="text-xs text-white/60">Company</p>
                  <p className="text-sm font-medium text-white">{job.company || job.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <MapPin className="h-5 w-5 text-violet-400" />
                <div>
                  <p className="text-xs text-white/60">Position</p>
                  <p className="text-sm font-medium text-white">{job.title}</p>
                </div>
              </div>
              {job.salary && (
                <div className="flex items-center gap-4">
                  <DollarSign className="h-5 w-5 text-violet-400" />
                  <div>
                    <p className="text-xs text-white/60">Salary</p>
                    <p className="text-sm font-medium text-white">{job.salary}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4">
                <MapPin className="h-5 w-5 text-violet-400" />
                <div>
                  <p className="text-xs text-white/60">Location</p>
                  <p className="text-sm font-medium text-white">{job.location}</p>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-8 mt-6">
            {/* Resume Selection */}
            <div className="w-full">
              <h3 className="text-lg font-semibold text-white mb-4 text-center">
                Select Resume
              </h3>
            {resumesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : resumes.length === 0 ? (
                <div className="text-center py-8">
                  <FileUser className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60 text-sm mb-2">No resumes found</p>
                  <p className="text-white/40 text-xs">Please upload a resume in your profile to apply for jobs</p>
                </div>
              ) : (
                <RadioGroup
                  value={selectedResume}
                  onValueChange={setSelectedResume}
                  className="space-y-4"
                >
                  {resumes.map((resume) => (
                    <div key={resume.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
                      <RadioGroupItem 
                        value={resume.id} 
                        id={resume.id}
                        className="border-white/20 text-violet-400" 
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-shrink-0">
                          <FileUser className="w-10 h-10 text-violet-400" />
                        </div>
                        <div className="flex flex-col justify-center min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white text-sm truncate">{resume.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-white/60">
                            <span>{resume.size}</span>
                            <span>•</span>
                            <span>{resume.fileName}</span>
                            <span>•</span>
                            <span>Uploaded {resume.uploadedAt}</span>
                          </div>
                          {resume.version > 1 && (
                            <div className="mt-1">
                              <span className="text-xs text-violet-400">Version {resume.version}</span>
                            </div>
                          )}
                        </div>
                        {resume.url && (
                          <div className="flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(resume.url, '_blank');
                              }}
                              className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 h-8 w-8 p-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="mt-2">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 underline text-sm transition-colors"
              >
                View terms and conditions of this job role
              </a>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="readTerms"
                  checked={readTerms}
                  onChange={(e) => setReadTerms(e.target.checked)}
                  className="w-4 h-4 text-violet-600 bg-transparent border-white/20 rounded focus:ring-violet-500 focus:ring-2"
                />
                <Label htmlFor="readTerms" className="text-sm text-white cursor-pointer">
                  I have read terms and conditions
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confirmSend"
                  checked={confirmSend}
                  onChange={(e) => setConfirmSend(e.target.checked)}
                  className="w-4 h-4 text-violet-600 bg-transparent border-white/20 rounded focus:ring-violet-500 focus:ring-2"
                />
                <Label htmlFor="confirmSend" className="text-sm text-white cursor-pointer">
                  By clicking Confirm, your profile and resume will be sent to{' '}
                  <span className="font-semibold text-violet-300">{job.company || job.department}</span>
                </Label>
              </div>
            </div>
          </div>

          <SheetFooter className="pt-8">
            <div className="flex gap-4 w-full">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmApply}
                disabled={!canConfirm || isSubmitting}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white border-0"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Apply'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
