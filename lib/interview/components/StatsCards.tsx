"use client";

import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  questionsAsked: number;
  queue1Size: number;
  queue2Size: number;
  queue3Size: number;
}

export default function StatsCards({ questionsAsked, queue1Size, queue2Size, queue3Size }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-white mb-2">{questionsAsked}</div>
          <div className="text-white/70 text-sm">Questions Asked</div>
        </CardContent>
      </Card>
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-white mb-2">{queue1Size}</div>
          <div className="text-white/70 text-sm">Queue 1 (Main)</div>
        </CardContent>
      </Card>
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-white mb-2">{queue2Size}</div>
          <div className="text-white/70 text-sm">Queue 2 (Deep Dive)</div>
        </CardContent>
      </Card>
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-white mb-2">{queue3Size}</div>
          <div className="text-white/70 text-sm">Queue 3 (Follow-up)</div>
        </CardContent>
      </Card>
    </div>
  );
}