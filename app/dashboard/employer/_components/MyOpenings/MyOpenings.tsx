"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
} from "lucide-react";
import { useFetchEmployerJobs } from "../../hooks";
import type { JobOpening } from "../../actions";
import { JobDetailView } from "./JobDetailView";

export function MyOpenings() {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "draft" | "archived"
  >("all");
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);

  const { jobs, loading, error, refetch } = useFetchEmployerJobs(statusFilter);

  // If a job is selected, show the detail view
  if (selectedJob) {
    return (
      <JobDetailView
        jobId={selectedJob._id}
        onBack={() => {
          setSelectedJob(null);
          refetch();
        }}
      />
    );
  }

  // Show job list
  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 mt-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-br from-[#0A0A18]/90 to-[#0D0D20]/90 backdrop-blur-xl border-b border-white/10 pb-4 pt-8 sm:pt-6 px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">
              My Job Openings
            </h1>
            <p className="text-white/60 mt-1">
              Manage all your job postings and assessments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(value: any) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
              className="text-white/80 bg-transparent border-white/20 hover:text-white hover:bg-white/10"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white/5 border-white/10">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 bg-white/10" />
                  <Skeleton className="h-4 w-1/2 bg-white/10" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full bg-white/10" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="w-16 h-16 text-white/20 mb-4" />
              <p className="text-white/60 text-center">
                No job openings found for this filter.
                <br />
                Create a new job to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <Card
                key={job._id}
                className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                onClick={() => setSelectedJob(job)}
              >
                <CardHeader className="space-y-2 overflow-hidden">
                  <CardTitle className="text-white group-hover:text-violet-400 transition-colors truncate">
                    {job.title}
                  </CardTitle>

                  <CardDescription className="text-white/60 mt-1 w-full">
                    <div className="block max-w-full truncate overflow-hidden text-ellipsis">
                      {job.department}
                    </div>
                    <div className="block max-w-full truncate overflow-hidden text-ellipsis">
                      {job.position}
                    </div>
                  </CardDescription>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge
                      variant={
                        job.employmentType === "full-time"
                          ? "default"
                          : "secondary"
                      }
                      className="capitalize text-xs"
                    >
                      {job.employmentType}
                    </Badge>
                    {job.hasAssessment && (
                      <Badge
                        variant={
                          job.assessmentStatus === "active"
                            ? "default"
                            : job.assessmentStatus === "draft"
                            ? "secondary"
                            : "outline"
                        }
                        className="capitalize text-xs text-black bg-white/90 border-white"
                      >
                        {job.assessmentStatus}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-white/60">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                      <Users className="w-4 h-4" />
                      <span>{job.applicationsCount} Applied</span>
                    </div>
                  </div>

                  {(job.salaryMin || job.salaryMax) && (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        {job.salaryMin && `$${job.salaryMin.toLocaleString()}`}
                        {job.salaryMin && job.salaryMax && " - "}
                        {job.salaryMax && `$${job.salaryMax.toLocaleString()}`}
                      </span>
                    </div>
                  )}

                  {job.deadline && (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Calendar className="w-4 h-4 text-white" />
                      <span>
                        Deadline: {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <FileText className="w-3 h-3" />
                      <span>
                        {job.hasAssessment ? "Has Assessment" : "No Assessment"}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-500/20 text-blue-300 border-blue-400/30"
                    >
                      {job.openings} Opening{job.openings > 1 ? "s" : ""}
                    </Badge>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedJob(job);
                    }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
