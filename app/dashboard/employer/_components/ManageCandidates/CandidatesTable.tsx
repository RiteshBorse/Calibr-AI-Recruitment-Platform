"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, FileText, Mail, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { 
  useFetchCandidatesForJob, 
  useFetchRoundInfo, 
  useUpdateCandidatesForRound 
} from "../../hooks";
import type { JobWithAssessment } from "../../actions";

interface CandidatesTableProps {
  job: JobWithAssessment;
  onBack: () => void;
}

const ROUND_TYPES = [
  { value: 'aptitude', label: 'Aptitude Round' },
  { value: 'coding', label: 'Coding Round' },
  { value: 'technicalInterview', label: 'Technical Interview' },
  { value: 'hrInterview', label: 'HR Interview' },
] as const;

export function CandidatesTable({ job, onBack }: CandidatesTableProps) {
  const [selectedRoundType, setSelectedRoundType] = useState<'aptitude' | 'coding' | 'technicalInterview' | 'hrInterview'>('aptitude');
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const { candidates, loading: candidatesLoading, error: candidatesError, refetch } = useFetchCandidatesForJob(job._id);
  
  // Determine roundId based on selected round type
  const roundId = 
    selectedRoundType === 'aptitude' ? job.assessment.aptitudeId :
    selectedRoundType === 'coding' ? job.assessment.codingRoundId :
    selectedRoundType === 'technicalInterview' ? job.assessment.technicalInterviewId :
    selectedRoundType === 'hrInterview' ? job.assessment.hrInterviewId :
    null;
  
  const { roundInfo, loading: roundLoading, refetch: refetchRoundInfo } = useFetchRoundInfo(
    roundId ? selectedRoundType : null,
    roundId || null
  );
  
  const { updateCandidates, loading: updating } = useUpdateCandidatesForRound();

  // Handle select all toggle
  useEffect(() => {
    if (selectAll) {
      setSelectedCandidates(new Set(candidates.map(c => c.candidateId)));
    } else {
      // Only clear if explicitly toggled off
      if (selectedCandidates.size === candidates.length && candidates.length > 0) {
        setSelectedCandidates(new Set());
      }
    }
  }, [selectAll, candidates]);

  // Update selectAll state when individual selections change
  useEffect(() => {
    if (candidates.length > 0 && selectedCandidates.size === candidates.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedCandidates, candidates]);

  const handleToggleCandidate = (candidateId: string) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedCandidates(newSelected);
  };

  const handleToggleAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedCandidates(new Set(candidates.map(c => c.candidateId)));
    } else {
      setSelectedCandidates(new Set());
    }
  };

  const handleSubmit = async () => {
    if (!roundId) {
      toast.error(`${selectedRoundType} round is not configured for this assessment`);
      return;
    }

    if (selectedCandidates.size === 0) {
      toast.error('Please select at least one candidate');
      return;
    }

    const result = await updateCandidates(
      selectedRoundType,
      roundId,
      Array.from(selectedCandidates)
    );

    if (result.success) {
      refetchRoundInfo();
      // Optionally refresh candidates list
      refetch();
    }
  };

  const loading = candidatesLoading || roundLoading;

  return (
    <div className="space-y-6">
      {/* Round Selection Card */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Select Assessment Round</CardTitle>
          <CardDescription className="text-white/60">
            Choose which round you want to select candidates for
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 w-full sm:w-auto">
              <Label htmlFor="round-select" className="text-white/80 mb-2 block">
                Round Type
              </Label>
              <Select
                value={selectedRoundType}
                onValueChange={(value: any) => {
                  setSelectedRoundType(value);
                  setSelectedCandidates(new Set()); // Reset selections when changing rounds
                }}
              >
                <SelectTrigger id="round-select" className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUND_TYPES.map((round) => (
                    <SelectItem key={round.value} value={round.value}>
                      {round.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {roundInfo && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-white/80">
                  {roundInfo.alreadySelectedCount} candidate(s) already selected
                </span>
              </div>
            )}

            {!roundId && (
              <Alert variant="destructive" className="flex-1">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This round is not configured in the assessment
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Candidates Selection Card */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Candidates List</CardTitle>
              <CardDescription className="text-white/60 mt-1">
                Select candidates to participate in {ROUND_TYPES.find(r => r.value === selectedRoundType)?.label}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="select-all"
                checked={selectAll}
                onCheckedChange={handleToggleAll}
                disabled={loading || candidates.length === 0}
              />
              <Label htmlFor="select-all" className="text-white/80 cursor-pointer">
                Select All ({selectedCandidates.size}/{candidates.length})
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {candidatesError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{candidatesError}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full bg-white/10" />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No candidates have applied for this job yet.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="text-white/80 w-12">Select</TableHead>
                    <TableHead className="text-white/80">Candidate Name</TableHead>
                    <TableHead className="text-white/80">Email</TableHead>
                    <TableHead className="text-white/80">Applied Date</TableHead>
                    <TableHead className="text-white/80">Status</TableHead>
                    <TableHead className="text-white/80 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => (
                    <TableRow 
                      key={candidate._id} 
                      className="border-white/10 hover:bg-white/5"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedCandidates.has(candidate.candidateId)}
                          onCheckedChange={() => handleToggleCandidate(candidate.candidateId)}
                          className="border-white/20"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        {candidate.candidateName}
                      </TableCell>
                      <TableCell className="text-white/80">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-white/40" />
                          {candidate.candidateEmail}
                        </div>
                      </TableCell>
                      <TableCell className="text-white/80">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-white/40" />
                          {new Date(candidate.applicationDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            candidate.status === 'accepted'
                              ? 'default'
                              : candidate.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="capitalize"
                        >
                          {candidate.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/60 hover:text-white"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {candidate.resumeId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white/60 hover:text-white"
                              title="View Resume"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {candidates.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
              <div className="text-sm text-white/60">
                {selectedCandidates.size} of {candidates.length} candidate(s) selected
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onBack}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={selectedCandidates.size === 0 || updating || !roundId}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                >
                  {updating ? 'Submitting...' : `Submit Selection (${selectedCandidates.size})`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
