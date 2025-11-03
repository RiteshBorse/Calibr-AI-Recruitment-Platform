"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAssessmentCreation } from "../../hooks";
import AddAssessment from "./addAssesment";
import AssessmentGeneralForm, {
  AssessmentGeneralData,
} from "./GeneralForm";
import FormConfig, { CompleteAssessmentData } from "./FormConfig";

interface CreateAssessmentFlowProps {
  onBack: () => void;
}

type AssessmentStep = "job-selection" | "general-form" | "rounds-config";

export default function CreateAssessmentFlow({
  onBack,
}: CreateAssessmentFlowProps) {
  const router = useRouter();
  const { loading: assessmentLoading, createNewAssessment } =
    useAssessmentCreation();
  
  // Check if we have stored job data from direct navigation
  const storedJobId = typeof window !== 'undefined' ? sessionStorage.getItem('selectedJobId') : null;
  const storedJobTitle = typeof window !== 'undefined' ? sessionStorage.getItem('selectedJobTitle') : null;
  
  const [currentStep, setCurrentStep] = useState<AssessmentStep>(
    storedJobId ? "general-form" : "job-selection"
  );
  const [selectedJobId, setSelectedJobId] = useState<string>(storedJobId || "");
  const [jobTitle, setJobTitle] = useState<string>(storedJobTitle || "");
  const [generalData, setGeneralData] = useState<AssessmentGeneralData | null>(
    null
  );

  // Cleanup stored data when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('selectedJobId');
        sessionStorage.removeItem('selectedJobTitle');
      }
    };
  }, []);

  const handleJobSelect = (jobId: string, title: string) => {
    setSelectedJobId(jobId);
    setJobTitle(title);
    setCurrentStep("general-form");
  };

  const handleGeneralFormNext = (data: AssessmentGeneralData) => {
    setGeneralData(data);
    setCurrentStep("rounds-config");
  };

  const handleCompleteAssessmentSubmit = async (
    completeData: CompleteAssessmentData
  ) => {
    if (!selectedJobId) {
      toast.error("Missing job selection");
      return;
    }

    try {
      // Transform the complete assessment data to match the backend structure
      const assessmentFormData: any = {
        title: completeData.general.title,
        description: completeData.general.description,
        jobId: selectedJobId,
        jobTitle: jobTitle,
        timeLimit: 120, // Default time limit in minutes
        maxAttempts: completeData.general.maxAttempts || 1,
        rounds: {
          ...(completeData.aptitude && { aptitude: { enabled: true, fullData: completeData.aptitude } }),
          ...(completeData.coding && { coding: { enabled: true, fullData: completeData.coding } }),
          ...(completeData.technicalInterview && {
            technicalInterview: {
              enabled: true,
              fullData: completeData.technicalInterview
            }
          }),
          ...(completeData.hrInterview && {
            hrInterview: {
              enabled: true,
              fullData: completeData.hrInterview
            }
          })
        },
      };

      const result = await createNewAssessment(assessmentFormData);

      if (result.success) {
        toast.success("Assessment created successfully!");
        // Clear stored data
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('selectedJobId');
          sessionStorage.removeItem('selectedJobTitle');
        }
        router.refresh();
        onBack(); // Go back to main dashboard
      } else {
        toast.error(result.error || "Failed to create assessment");
      }
    } catch (error) {
      console.error("Error creating assessment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create assessment"
      );
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case "job-selection":
        onBack();
        break;
      case "general-form":
        setCurrentStep("job-selection");
        break;
      case "rounds-config":
        setCurrentStep("general-form");
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] to-[#0D0D20]">
      {currentStep === "job-selection" && (
        <AddAssessment onJobSelect={handleJobSelect} onBack={onBack} />
      )}

      {currentStep === "general-form" && selectedJobId && (
        <AssessmentGeneralForm
          _jobTitle={jobTitle}
          onBack={handleBack}
          onNext={handleGeneralFormNext}
        />
      )}

      {currentStep === "rounds-config" && generalData && selectedJobId && (
        <FormConfig
          generalData={generalData}
          jobId={selectedJobId}
          onNext={handleCompleteAssessmentSubmit}
          onBack={handleBack}
        />
      )}

      {/* Loading overlay */}
      {assessmentLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg font-medium">Creating Assessment...</span>
          </div>
        </div>
      )}
    </div>
  );
}
