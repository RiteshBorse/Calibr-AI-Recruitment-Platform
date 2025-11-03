'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { AssessmentGeneralData } from './GeneralForm';
import { AptitudeFormData } from './AptitudeForm';
import AptitudeForm from './AptitudeForm';
import CodingForm, { CodingFormData } from './CodingForm';
import TechnicalInterviewForm, { TechnicalInterviewFormData } from './TechnicalInterviewForm';
import HRInterviewForm, { HRInterviewFormData } from './HRInterviewForm';

interface FormConfigProps {
  generalData: AssessmentGeneralData;
  jobId: string;
  onBack: () => void;
  onNext: (assessmentData: CompleteAssessmentData) => void;
}

export interface CompleteAssessmentData {
  general: AssessmentGeneralData;
  aptitude?: AptitudeFormData;
  coding?: CodingFormData;
  technicalInterview?: TechnicalInterviewFormData;
  hrInterview?: HRInterviewFormData;
}

type FormStep = 'aptitude' | 'coding' | 'technicalInterview' | 'hrInterview' | 'review';

export default function FormConfig({
  generalData,
  jobId,
  onBack,
  onNext
}: FormConfigProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('aptitude');
  const [completedForms, setCompletedForms] = useState<Partial<CompleteAssessmentData>>({
    general: generalData
  });

  // Get the rounds that need to be configured
  const selectedRounds = Object.entries(generalData.toConductRounds)
    .filter(([, enabled]) => enabled)
    .map(([round]) => round as keyof typeof generalData.toConductRounds);

  const handleAptitudeNext = (aptitudeData: AptitudeFormData) => {
    const updatedData = {
      ...completedForms,
      aptitude: aptitudeData
    };
    setCompletedForms(updatedData);
    if (generalData.toConductRounds.coding) {
      setCurrentStep('coding');
      return;
    }
    handleFinalSubmit(updatedData as CompleteAssessmentData);
  };

  const handleCodingNext = (codingData: CodingFormData) => {
    const updatedData = { ...completedForms, coding: codingData };
    setCompletedForms(updatedData);
    if (generalData.toConductRounds.technicalInterview) {
      setCurrentStep('technicalInterview');
      return;
    }
    handleFinalSubmit(updatedData as CompleteAssessmentData);
  };

  const handleTechnicalNext = (technicalData: TechnicalInterviewFormData) => {
    const updatedData = { ...completedForms, technicalInterview: technicalData };
    setCompletedForms(updatedData);
    if (generalData.toConductRounds.hrInterview) {
      setCurrentStep('hrInterview');
      return;
    }
    handleFinalSubmit(updatedData as CompleteAssessmentData);
  };

  const handleHrNext = (hrData: HRInterviewFormData) => {
    const updatedData = { ...completedForms, hrInterview: hrData };
    setCompletedForms(updatedData);
    handleFinalSubmit(updatedData as CompleteAssessmentData);
  };

  const handleFinalSubmit = (assessmentData: CompleteAssessmentData) => {
    onNext(assessmentData);
  };

  const goBack = () => {
    // For now, just go back to general form
    // Later: Implement proper step navigation
    onBack();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pt-16 text-white">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={goBack}
          className="mb-4 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to General Settings
        </Button>
        
        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-1">
            Configure Assessment Rounds
          </h2>
          <p className="text-white/80 text-sm">
            Set up detailed configuration for each selected round
          </p>
          
          {/* Progress indicator */}
          <div className="mt-4 flex items-center space-x-4">
            {selectedRounds.map((round, index) => (
              <div key={round} className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  currentStep === round 
                    ? 'bg-blue-500 text-white' 
                    : completedForms[round as keyof CompleteAssessmentData]
                    ? 'bg-green-500 text-white'
                    : 'bg-white/20 text-white/60'
                }`}>
                  {completedForms[round as keyof CompleteAssessmentData] ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`text-sm capitalize ${
                  currentStep === round ? 'text-blue-300' : 'text-white/60'
                }`}>
                  {round.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                {index < selectedRounds.length - 1 && (
                  <div className="w-8 h-0.5 bg-white/20" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Form */}
      {currentStep === 'aptitude' && generalData.toConductRounds.aptitude && (
        <AptitudeForm
          jobId={jobId}
          jobTitle="Selected Job" // You can pass this from props if needed
          onBack={goBack}
          onNext={handleAptitudeNext}
        />
      )}

      {/* Future forms will be added here */}
      {currentStep === 'coding' && generalData.toConductRounds.coding && (
        <CodingForm onBack={onBack} onNext={handleCodingNext} />
      )}

      {currentStep === 'technicalInterview' && generalData.toConductRounds.technicalInterview && (
        <TechnicalInterviewForm onBack={goBack} onNext={handleTechnicalNext} />
      )}

      {currentStep === 'hrInterview' && generalData.toConductRounds.hrInterview && (
        <HRInterviewForm onBack={goBack} onNext={handleHrNext} />
      )}
    </div>
  );
}
