"use client";

import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TechnicalInterviewFormData {
  duration: number;
  mode: "live" | "async";
  language: string;
  difficulty: "junior" | "mid" | "senior";
  topics: string[];
  aiPrompt?: string;
  maxFollowUpsPerTopic: number;
  recordingEnabled: boolean;
  consentRequired: boolean;
  proctoring: {
    cameraRequired: boolean;
    micRequired: boolean;
    screenShareRequired: boolean;
  };
  questionStyle: "structured" | "conversational";
  initialWarmupMinutes: number;
  maxSilenceSeconds: number;
  allowInterruptions: boolean;
  rubric: {
    passThreshold: number;
    categories: { key: string; label: string; weight: number }[];
  };
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
}

interface Props {
  onBack: () => void;
  onNext: (data: TechnicalInterviewFormData) => void;
}

export default function TechnicalInterviewForm({ onBack, onNext }: Props) {
  const [form, setForm] = useState<TechnicalInterviewFormData>({
    duration: 60,
    mode: "live",
    language: "en-US",
    difficulty: "mid",
    topics: [],
    aiPrompt: "",
    maxFollowUpsPerTopic: 2,
    recordingEnabled: true,
    consentRequired: true,
    proctoring: { cameraRequired: true, micRequired: true, screenShareRequired: false },
    questionStyle: "structured",
    initialWarmupMinutes: 0,
    maxSilenceSeconds: 20,
    allowInterruptions: true,
    rubric: {
      passThreshold: 60,
      categories: [
        { key: "dsa", label: "Data Structures", weight: 25 },
        { key: "algorithms", label: "Algorithms", weight: 25 },
        { key: "system_design", label: "System Design", weight: 25 },
        { key: "language", label: "Language Concepts", weight: 25 }
      ]
    },
    scheduledDate: undefined,
    startTime: undefined,
    endTime: undefined
  });

  function setCategory(index: number, field: "key" | "label" | "weight", value: string) {
    setForm(prev => {
      const next = { ...prev };
      const categories = [...next.rubric.categories];
      const c = { ...categories[index] } as any;
      c[field] = field === "weight" ? Number(value) : value;
      categories[index] = c;
      next.rubric = { ...next.rubric, categories };
      return next;
    });
  }

  function addCategory() {
    setForm(prev => ({
      ...prev,
      rubric: { ...prev.rubric, categories: [...prev.rubric.categories, { key: "custom", label: "Custom", weight: 0 }] }
    }));
  }

  function removeCategory(i: number) {
    setForm(prev => ({
      ...prev,
      rubric: { ...prev.rubric, categories: prev.rubric.categories.filter((_, idx) => idx !== i) }
    }));
  }

  const topicsString = form.topics.join(", ");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext({
      ...form,
      topics: topicsString.split(",").map(s => s.trim()).filter(Boolean)
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card className="bg-[#171726] border-0">
        <CardHeader>
          <CardTitle className="text-white">Technical Interview</CardTitle>
          <CardDescription className="text-white/60">Configure the AI-driven technical interview</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Duration (mins)</Label>
              <Input type="number" min={15} max={480} value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} className="bg-[#1f1f35] border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Mode</Label>
              <Select value={form.mode} onValueChange={v => setForm({ ...form, mode: v as any })}>
                <SelectTrigger className="bg-[#1f1f35] border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="async">Async</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Language</Label>
              <Input value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} className="bg-[#1f1f35] border-white/10 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Difficulty</Label>
              <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v as any })}>
                <SelectTrigger className="bg-[#1f1f35] border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="mid">Mid</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-white">Topics (comma separated)</Label>
              <Input value={topicsString} onChange={e => setForm({ ...form, topics: e.target.value.split(",") })} className="bg-[#1f1f35] border-white/10 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">AI Prompt</Label>
            <Textarea value={form.aiPrompt} onChange={e => setForm({ ...form, aiPrompt: e.target.value })} rows={3} className="bg-[#1f1f35] border-white/10 text-white" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Max follow-ups/topic</Label>
              <Input type="number" min={0} max={10} value={form.maxFollowUpsPerTopic} onChange={e => setForm({ ...form, maxFollowUpsPerTopic: Number(e.target.value) })} className="bg-[#1f1f35] border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Question style</Label>
              <Select value={form.questionStyle} onValueChange={v => setForm({ ...form, questionStyle: v as any })}>
                <SelectTrigger className="bg-[#1f1f35] border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="structured">Structured</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Warmup (mins)</Label>
              <Input type="number" min={0} max={30} value={form.initialWarmupMinutes} onChange={e => setForm({ ...form, initialWarmupMinutes: Number(e.target.value) })} className="bg-[#1f1f35] border-white/10 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Max silence (sec)</Label>
              <Input type="number" min={5} max={120} value={form.maxSilenceSeconds} onChange={e => setForm({ ...form, maxSilenceSeconds: Number(e.target.value) })} className="bg-[#1f1f35] border-white/10 text-white" />
            </div>
            <label className="flex items-center space-x-2 mt-7">
              <input type="checkbox" checked={form.allowInterruptions} onChange={e => setForm({ ...form, allowInterruptions: e.target.checked })} className="rounded border-white/30" />
              <span className="text-white">Allow interruptions</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={form.recordingEnabled} onChange={e => setForm({ ...form, recordingEnabled: e.target.checked })} className="rounded border-white/30" />
              <span className="text-white">Record interview</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={form.consentRequired} onChange={e => setForm({ ...form, consentRequired: e.target.checked })} className="rounded border-white/30" />
              <span className="text-white">Require consent</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={form.proctoring.cameraRequired} onChange={e => setForm({ ...form, proctoring: { ...form.proctoring, cameraRequired: e.target.checked } })} className="rounded border-white/30" />
              <span className="text-white">Camera required</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={form.proctoring.micRequired} onChange={e => setForm({ ...form, proctoring: { ...form.proctoring, micRequired: e.target.checked } })} className="rounded border-white/30" />
              <span className="text-white">Mic required</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={form.proctoring.screenShareRequired} onChange={e => setForm({ ...form, proctoring: { ...form.proctoring, screenShareRequired: e.target.checked } })} className="rounded border-white/30" />
              <span className="text-white">Screen share required</span>
            </label>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Rubric</Label>
            <div className="grid gap-2">
              {form.rubric.categories.map((c, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input value={c.key} onChange={e => setCategory(i, "key", e.target.value)} className="col-span-3 bg-[#1f1f35] border-white/10 text-white" placeholder="key" />
                  <Input value={c.label} onChange={e => setCategory(i, "label", e.target.value)} className="col-span-7 bg-[#1f1f35] border-white/10 text-white" placeholder="label" />
                  <Input type="number" min={0} max={100} value={c.weight} onChange={e => setCategory(i, "weight", e.target.value)} className="col-span-2 bg-[#1f1f35] border-white/10 text-white" placeholder="weight" />
                  <Button type="button" variant="ghost" onClick={() => removeCategory(i)} className="col-span-12 justify-start text-white/70">Remove</Button>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <div className="flex-1" />
                <Button type="button" onClick={addCategory} className="bg-white/10 hover:bg-white/20 text-white">Add category</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="space-y-2">
                <Label className="text-white">Pass threshold</Label>
                <Input type="number" min={0} max={100} value={form.rubric.passThreshold} onChange={e => setForm({ ...form, rubric: { ...form.rubric, passThreshold: Number(e.target.value) } })} className="bg-[#1f1f35] border-white/10 text-white" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Scheduled date</Label>
              <Input type="date" value={form.scheduledDate || ""} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} className="bg-[#1f1f35] border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Start time</Label>
              <Input type="time" value={form.startTime || ""} onChange={e => setForm({ ...form, startTime: e.target.value })} className="bg-[#1f1f35] border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">End time</Label>
              <Input type="time" value={form.endTime || ""} onChange={e => setForm({ ...form, endTime: e.target.value })} className="bg-[#1f1f35] border-white/10 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">Back</Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save & Continue</Button>
      </div>
    </form>
  );
}


