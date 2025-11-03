"use client";

import { useMemo, useState } from "react";
import { createInterviewEngine } from "./engine";
import type { EngineAdapter, Queues, Question } from "./types";


export interface UseInterviewEngineOptions {
  adapter: EngineAdapter;
  useVideoProcessing?: boolean;
  hasQueue2?: boolean; // New: false for HR interviews, true for technical
  enableChunking?: boolean; // Enable chunking/batching
  interviewId?: string; // Required if chunking enabled
}

export function useInterviewEngine(
  adapterOrOptions: EngineAdapter | UseInterviewEngineOptions,
  useVideoProcessing: boolean = false
) {
  // Handle both old and new API
  const options = typeof adapterOrOptions === 'object' && 'adapter' in adapterOrOptions
    ? adapterOrOptions
    : { adapter: adapterOrOptions, useVideoProcessing, enableChunking: false, hasQueue2: true };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
  const { adapter, enableChunking = false, interviewId = '', hasQueue2 = true } = options;
  const videoProcessing = options.useVideoProcessing ?? useVideoProcessing;

  const engine = useMemo(
    () => createInterviewEngine(adapter, videoProcessing, hasQueue2), 
    [adapter, videoProcessing, hasQueue2]
  );
  const [queues, setQueuesState] = useState<Queues>(engine.state.queues);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(engine.state.currentQuestion);
  const [stats, setStats] = useState(engine.state.stats);

  const sync = () => {
    setQueuesState({ ...engine.state.queues });
    setCurrentQuestion(engine.state.currentQuestion);
    
    setStats({ ...engine.state.stats });
  };

  const askNext = async () => {
    const q = await engine.askNext();
    sync();
    return q;
  };

  const handleAnswer = async (
    question: string,
    correctAnswer: string,
    userAnswer: string,
    currentQuestion: Question,
    interviewId: string
  ) => {
    const result = await engine.handleAnswer(question, correctAnswer, userAnswer, currentQuestion, interviewId);
    sync();
    return result;
  };

  const checkQueue0 = async () => {
    const shouldEnd = await engine.checkQueue0();
    sync();
    return shouldEnd;
  };

  const setQueues = (q: Queues) => {
    engine.setQueues(q);
    sync();
  };

  const endInterview = () => {
    engine.state.stats.interviewEnded = true;
    sync();
  };

  return {
    state: engine.state,
    queues,
    currentQuestion,
    stats,
    setQueues,
    askNext,
    handleAnswer,
    checkQueue0,
    endInterview,
    adapter: engine.adapter,
  };
}



