"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { List, GraduationCap, Zap } from "lucide-react";

interface Question {
  id: string;
  question: string;
  category: "technical" | "non-technical" | "followup";
  difficulty?: "medium" | "hard";
}

interface QueuesPanelProps {
  queue1: Question[];
  queue2: Question[];
  queue3: Question[];
  getDifficultyColor: (difficulty?: string) => string;
}

export default function QueuesPanel({ queue1, queue2, queue3, getDifficultyColor }: QueuesPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <List className="w-5 h-5 text-blue-400" />
            Queue 1: Main Questions
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full ml-auto">{queue1.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue1.slice(0, 5).map((q) => (
            <div key={q.id} className="p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <div className={`text-xs font-semibold mb-1 px-2 py-1 rounded-full inline-block ${q.category === "technical" ? "bg-blue-500/20 text-blue-300" : "bg-purple-500/20 text-purple-300"}`}>
                {q.category.toUpperCase()}
              </div>
              <p className="line-clamp-2">{q.question}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <GraduationCap className="w-5 h-5 text-amber-400" />
            Queue 2: Deep Dive
            <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full ml-auto">{queue2.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue2.slice(0, 5).map((q) => (
            <div key={q.id} className="p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <div className={`text-xs font-semibold mb-1 px-2 py-1 rounded-full inline-block ${getDifficultyColor(q.difficulty)}`}>
                {q.difficulty?.toUpperCase() || "MEDIUM"}
              </div>
              <p className="line-clamp-2">{q.question}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-rose-400" />
            Queue 3: Follow-ups
            <span className="bg-rose-500 text-white text-xs px-2 py-1 rounded-full ml-auto">{queue3.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue3.slice(0, 5).map((q) => (
            <div key={q.id} className="p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <div className="text-xs font-semibold mb-1 px-2 py-1 rounded-full inline-block bg-rose-500/20 text-rose-300">FOLLOW-UP</div>
              <p className="line-clamp-2">{q.question}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}


