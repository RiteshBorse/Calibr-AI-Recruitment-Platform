"use client";

import { useMemo, useState } from "react";
import { createInterviewEngine } from "./engine";
import type { EngineAdapter, Queues, Question } from "./types";

export function useInterviewEngine(adapter: EngineAdapter, useVideoProcessing: boolean = false) {
  const engine = useMemo(() => createInterviewEngine(adapter, useVideoProcessing), [adapter, useVideoProcessing]);
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
    currentQuestion: Question
  ) => {
    const result = await engine.handleAnswer(question, correctAnswer, userAnswer, currentQuestion);
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

  return {
    state: engine.state,
    queues,
    currentQuestion,
    stats,
    setQueues,
    askNext,
    handleAnswer,
    checkQueue0,
    adapter: engine.adapter,
  };
}


