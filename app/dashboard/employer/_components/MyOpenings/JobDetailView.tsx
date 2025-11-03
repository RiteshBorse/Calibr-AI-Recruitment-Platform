"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  Calendar, 
  DollarSign, 
  Briefcase,
  Clock
} from "lucide-react";
import { useFetchJobDetails } from "../../hooks";
import { EditJobSection } from "./EditJobSection";
import { EditAssessmentSection } from "./EditAssessmentSection";

interface JobDetailViewProps {
  jobId: string;
  onBack: () => void;
}

export function JobDetailView({ jobId, onBack }: JobDetailViewProps) {
  const { jobDetails, loading, error, refetch } = useFetchJobDetails(jobId);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 mt-16">
        <div className="sticky top-0 z-30 bg-gradient-to-br from-[#0A0A18]/90 to-[#0D0D20]/90 backdrop-blur-xl border-b border-white/10 pb-4 pt-8 sm:pt-6 px-4 sm:px-6 lg:px-8 xl:px-12">
          <Skeleton className="h-10 w-64 bg-white/10" />
        </div>
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 space-y-4">
          <Skeleton className="h-64 w-full bg-white/10" />
          <Skeleton className="h-64 w-full bg-white/10" />
        </div>
      </div>
    );
  }

  if (error || !jobDetails) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 mt-16">
        <div className="sticky top-0 z-30 bg-gradient-to-br from-[#0A0A18]/90 to-[#0D0D20]/90 backdrop-blur-xl border-b border-white/10 pb-4 pt-8 sm:pt-6 px-4 sm:px-6 lg:px-8 xl:px-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <Alert variant="destructive">
            <AlertDescription>{error || "Job not found"}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 text-white mt-0.5" />
      <div>
        <p className="text-white/60 text-sm">{label}</p>
        <p className="text-white font-medium overflow-hidden text-ellipsis whitespace-nowrap">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 mt-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-br from-[#0A0A18]/90 to-[#0D0D20]/90 backdrop-blur-xl border-b border-white/10 pb-4 pt-8 sm:pt-6 px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{jobDetails.title}</h2>
            <p className="text-white/60 text-sm mt-1 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
              {jobDetails.department} • {jobDetails.position}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant={jobDetails.employmentType === 'full-time' ? 'default' : 'secondary'} className="capitalize">
              {jobDetails.employmentType}
            </Badge>
            {jobDetails.hasAssessment && (
              <Badge
                variant={
                  jobDetails.assessmentStatus === 'active'
                    ? 'default'
                    : jobDetails.assessmentStatus === 'draft'
                    ? 'secondary'
                    : 'outline'
                }
                className="capitalize"
              >
                {jobDetails.assessmentStatus}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
        <Tabs defaultValue="job" className="space-y-6">
          <TabsList className="bg-white/5 border-white/10">
            <TabsTrigger value="job" className="text-white data-[state=active]:bg-white/10 data-[state=active]:text-white">
              Job Details
            </TabsTrigger>
            {jobDetails.hasAssessment && (
              <TabsTrigger value="assessment" className="text-white data-[state=active]:bg-white/10 data-[state=active]:text-white">
                Assessment Details
              </TabsTrigger>
            )}
          </TabsList>

          {/* Job Details Tab */}
          <TabsContent value="job" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Basic Information</CardTitle>
                  <Badge variant="outline" className="text-xs text-white border-white/30">
                    {jobDetails.applicationsCount} Application{jobDetails.applicationsCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <InfoItem icon={Briefcase} label="Position" value={jobDetails.position} />
                <InfoItem icon={Briefcase} label="Seniority" value={jobDetails.seniority} />
                <InfoItem icon={MapPin} label="Location" value={`${jobDetails.location} (${jobDetails.locationType})`} />
                <InfoItem icon={Users} label="Openings" value={jobDetails.openings} />
                {jobDetails.experience && <InfoItem icon={Clock} label="Experience" value={jobDetails.experience} />}
                {jobDetails.workMode && <InfoItem icon={Briefcase} label="Work Mode" value={jobDetails.workMode} />}
                {(jobDetails.salaryMin || jobDetails.salaryMax) && (
                  <InfoItem 
                    icon={DollarSign} 
                    label="Salary Range" 
                    value={`${jobDetails.salaryMin ? '$' + jobDetails.salaryMin.toLocaleString() : ''}${jobDetails.salaryMin && jobDetails.salaryMax ? ' - ' : ''}${jobDetails.salaryMax ? '$' + jobDetails.salaryMax.toLocaleString() : ''}`}
                  />
                )}
                {jobDetails.deadline && (
                  <InfoItem 
                    icon={Calendar} 
                    label="Deadline" 
                    value={new Date(jobDetails.deadline).toLocaleDateString()}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Tech Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {jobDetails.techStack.map((tech, idx) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Editable Sections */}
            <EditJobSection
              jobId={jobDetails._id}
              initialData={{
                description: jobDetails.description ?? "",
                requirements: jobDetails.requirements ?? "",
                benefits: jobDetails.benefits ?? "",
                deadline: jobDetails.deadline ?? "",
                salaryMin: jobDetails.salaryMin,
                salaryMax: jobDetails.salaryMax,
                isPublic: jobDetails.isPublic ?? false,
                autoScreen: jobDetails.autoScreen ?? false,
                startDate: jobDetails.startDate ?? "",
              }}
              onUpdate={refetch}
            />
          </TabsContent>

          {/* Assessment Details Tab */}
          {jobDetails.hasAssessment && jobDetails.assessment && (
            <TabsContent value="assessment" className="space-y-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">{jobDetails.assessment.title}</CardTitle>
                  <CardDescription className="text-white/60 overflow-hidden text-ellipsis">
                    {jobDetails.assessment.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 overflow-hidden text-ellipsis">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/60 text-sm mb-2">Rounds Configured</p>
                      <div className="flex flex-wrap gap-2">
                        {jobDetails.assessment.toConductRounds.aptitude && <Badge>Aptitude</Badge>}
                        {jobDetails.assessment.toConductRounds.coding && <Badge>Coding</Badge>}
                        {jobDetails.assessment.toConductRounds.technicalInterview && <Badge>Technical</Badge>}
                        {jobDetails.assessment.toConductRounds.hrInterview && <Badge>HR</Badge>}
                      </div>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm mb-2">Settings</p>
                      <div className="space-y-1 text-sm text-white/80">
                        <p>{jobDetails.assessment.allowMultipleAttempts ? '✓' : '✗'} Multiple Attempts {jobDetails.assessment.maxAttempts ? `(${jobDetails.assessment.maxAttempts})` : ''}</p>
                        <p>{jobDetails.assessment.sendReminders ? '✓' : '✗'} Send Reminders</p>
                        <p>{jobDetails.assessment.publishResults ? '✓' : '✗'} Publish Results</p>
                      </div>
                    </div>
                  </div>

                  {jobDetails.assessment.aptitude && (
                    <>
                      <Separator className="bg-white/10" />
                      <div>
                        <h4 className="text-white font-semibold mb-3">Aptitude Round Details</h4>
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-white/60">Total Questions</p>
                            <p className="text-white font-medium">{jobDetails.assessment.aptitude.totalQuestions}</p>
                          </div>
                          <div>
                            <p className="text-white/60">Duration</p>
                            <p className="text-white font-medium">{jobDetails.assessment.aptitude.duration} minutes</p>
                          </div>
                          <div>
                            <p className="text-white/60">Passing Score</p>
                            <p className="text-white font-medium">{jobDetails.assessment.aptitude.passingScore}%</p>
                          </div>
                          <div>
                            <p className="text-white/60">Selected Candidates</p>
                            <p className="text-white font-medium">{jobDetails.assessment.aptitude.candidateIds.length}</p>
                          </div>
                          <div>
                            <p className="text-white/60">Status</p>
                            <Badge variant={jobDetails.assessment.aptitude.status === 'active' ? 'default' : 'secondary'}>
                              {jobDetails.assessment.aptitude.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <EditAssessmentSection
                assessmentId={jobDetails.assessment._id}
                initialData={{
                  description: jobDetails.assessment.description,
                  applicationDeadline: jobDetails.assessment.applicationDeadline,
                  assessmentStartDate: jobDetails.assessment.assessmentStartDate,
                  assessmentEndDate: jobDetails.assessment.assessmentEndDate,
                  sendReminders: jobDetails.assessment.sendReminders,
                  publishResults: jobDetails.assessment.publishResults,
                  allowMultipleAttempts: jobDetails.assessment.allowMultipleAttempts,
                  maxAttempts: jobDetails.assessment.maxAttempts,
                  instructions: jobDetails.assessment.instructions,
                  candidateInstructions: jobDetails.assessment.candidateInstructions,
                }}
                onUpdate={refetch}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
