"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw } from "lucide-react";

interface CompleteScreenProps {
  closingMessage?: string;
  questionsAsked: number;
  dashboardUrl?: string;
}

export default function CompleteScreen({
  closingMessage,
  questionsAsked,
  dashboardUrl = "/dashboard/candidate",
}: CompleteScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center max-w-2xl">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-white mb-4">
          Interview Complete!
        </h2>
        <p className="text-white/80 mb-8 text-lg leading-relaxed">
          {closingMessage ||
            "Thank you for completing the interview. Your responses have been recorded and will be evaluated shortly."}
        </p>
        <div className="mt-6 mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-white/60 text-sm">
            Questions Asked:{" "}
            <span className="text-white font-semibold">
              {questionsAsked}
            </span>
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => (window.location.href = dashboardUrl)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
