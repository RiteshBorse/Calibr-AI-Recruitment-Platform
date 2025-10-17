import type { Queues, Question, EngineStats, EngineAdapter } from "./types";

export function createInterviewEngine(adapter: EngineAdapter, useVideoProcessing: boolean = false) {
  const state = {
    queues: { 
      queue0: useVideoProcessing ? { 
        use_video_processing: true, 
        violation_count: 0, 
        mood_state: 'neutral', 
        logs: [] 
      } : undefined,
      queue1: [], 
      queue2: [], 
      queue3: [] 
    } as Queues,
    currentQuestion: null as Question | null,
    stats: { 
      questionsAsked: 0, 
      queue0Active: useVideoProcessing,
      queue1Size: 0, 
      queue2Size: 0, 
      queue3Size: 0,
      violationCount: 0,
      interviewEnded: false
    } as EngineStats,
    askedTopics: new Set<string>(), // Track topics to prevent repetition
  };

  const setQueues = (q: Queues) => {
    state.queues = q;
    state.stats.queue1Size = q.queue1.length;
    state.stats.queue2Size = q.queue2.length;
    state.stats.queue3Size = q.queue3.length;
    if (q.queue0) {
      state.stats.violationCount = q.queue0.violation_count;
    }
  };

  /**
   * Check Queue 0 (Video Input) for violations - HIGHEST PRIORITY
   * Returns true if interview should end immediately
   */
  const checkQueue0 = async (): Promise<boolean> => {
    if (!state.queues.queue0?.use_video_processing || !adapter.checkVideoViolations) {
      return false;
    }

    try {
      const videoStatus = await adapter.checkVideoViolations('current');
      
      // Update Queue 0 state
      if (state.queues.queue0) {
        state.queues.queue0.violation_count = videoStatus.violation_count;
        state.queues.queue0.mood_state = videoStatus.mood_state;
        state.stats.violationCount = videoStatus.violation_count;
      }

      // CRITICAL: End interview if violations >= 3
      if (videoStatus.violation_count >= 3) {
        state.stats.interviewEnded = true;
        return true;
      }

      // Generate mood-based follow-up if mood changed and is not neutral
      if (videoStatus.mood_changed && videoStatus.mood_state !== 'neutral') {
        const moodQuestion = generateMoodFollowup(videoStatus.mood_state);
        if (moodQuestion) {
          state.queues.queue3.unshift(moodQuestion); // High priority in Queue 3
          state.stats.queue3Size = state.queues.queue3.length;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking video violations:', error);
      return false;
    }
  };

  /**
   * Generate mood-based follow-up question
   */
  const generateMoodFollowup = (mood: string): Question | null => {
    const moodQuestions: Record<string, string> = {
      'happy': "I noticed you seem enthusiastic! Can you tell me what aspect of this topic excites you the most?",
      'sad': "You seem a bit uncertain. Would you like me to rephrase the question or provide more context?",
      'angry': "I sense some frustration. Would you like to take a moment, or shall we approach this differently?",
      'surprised': "That's an interesting reaction! What aspect of this topic surprised you?",
      'anxious': "Take your time. Would you like me to break down the question into smaller parts?"
    };

    const questionText = moodQuestions[mood.toLowerCase()];
    if (!questionText) return null;

    return {
      id: `mood_${Date.now()}`,
      question: questionText,
      category: 'followup',
      parentQuestion: state.currentQuestion?.question,
    };
  };

  /**
   * Ask next question following priority rules
   * Priority: Queue 0 check → Queue 3 → Queue 1 → Queue 2 (medium/hard progression)
   */
  const askNext = async (): Promise<Question | null> => {
    // PRIORITY 1: Check Queue 0 for violations
    const shouldEndDueToViolations = await checkQueue0();
    if (shouldEndDueToViolations) {
      state.stats.interviewEnded = true;
      return null;
    }

    const q = state.queues;
    let next: Question | null = null;
    let queueKey: 'queue1' | 'queue3' = 'queue1';

    // PRIORITY 2: Queue 3 (Follow-ups) - highest priority for questions
    if (q.queue3.length > 0) {
      next = q.queue3[0];
      queueKey = 'queue3';
    } 
    // PRIORITY 3: Queue 1 (Base questions)
    else if (q.queue1.length > 0) {
      next = q.queue1[0];
      queueKey = 'queue1';
    }
    // No questions available
    else {
      return null;
    }

    // Check for repetition
    const topicId = next.topicId || next.question;
    if (state.askedTopics.has(topicId)) {
      // Skip this question and try next
      state.queues = { ...q, [queueKey]: q[queueKey].slice(1) };
      return askNext(); // Recursive call to get next question
    }

    // Mark question as asked
    state.currentQuestion = next;
    state.askedTopics.add(topicId);
    state.stats.questionsAsked += 1;

    // Remove from queue
    const updatedQueue = q[queueKey].slice(1);
    state.queues = { ...q, [queueKey]: updatedQueue };
    
    // Update stats
    state.stats[queueKey === 'queue1' ? 'queue1Size' : 'queue3Size'] = updatedQueue.length;

    return next;
  };

  /**
   * Handle answer analysis and queue updates based on flow rules
   */
  const handleAnswer = async (
    question: string,
    correctAnswer: string,
    userAnswer: string,
    currentQuestion: Question
  ): Promise<{ correctness: number; shouldEnd: boolean }> => {
    // Check for early termination request
    if (userAnswer.toLowerCase().includes('end this interview') || 
        userAnswer.toLowerCase().includes('stop the interview')) {
      // Add one final follow-up
      const finalQuestion: Question = {
        id: `final_${Date.now()}`,
        question: "Before we conclude, is there anything specific you'd like to discuss or clarify?",
        category: 'followup',
        parentQuestion: question,
      };
      state.queues.queue3.push(finalQuestion);
      state.stats.queue3Size = state.queues.queue3.length;
      return { correctness: 0, shouldEnd: true };
    }

    // Analyze answer using adapter
    const result = await adapter.analyze(
      question,
      correctAnswer,
      userAnswer,
      state.queues,
      currentQuestion
    );

    const correctness = result.correctness || 0;
    if (result.updatedQueues) {
      setQueues(result.updatedQueues);
    }

    // Apply flow rules based on question type and correctness
    if (currentQuestion.category === 'technical') {
      applyTechnicalFlowRules(currentQuestion, correctness);
    } else if (currentQuestion.category === 'non-technical') {
      applyNonTechnicalFlowRules(currentQuestion, correctness);
    }

    return { correctness, shouldEnd: false };
  };

  /**
   * Technical question flow rules
   */
  const applyTechnicalFlowRules = (question: Question, correctness: number) => {
    const topicId = question.topicId || question.question;

    if (correctness <= 10) {
      // LOW: Add follow-up to Queue 3 and discard all depth questions for this topic
      discardDepthQuestions(topicId);
    } else if (correctness >= 80) {
      // HIGH: Progress to next difficulty level
      if (!question.difficulty) {
        // Base question → move MEDIUM to Queue 1
        const mediumQ = state.queues.queue2.find(
          q => q.topicId === topicId && q.difficulty === 'medium'
        );
        if (mediumQ) {
          state.queues.queue2 = state.queues.queue2.filter(q => q.id !== mediumQ.id);
          state.queues.queue1.unshift(mediumQ);
          state.stats.queue1Size = state.queues.queue1.length;
          state.stats.queue2Size = state.queues.queue2.length;
        }
      } else if (question.difficulty === 'medium') {
        // Medium question → move HARD to Queue 1
        const hardQ = state.queues.queue2.find(
          q => q.topicId === topicId && q.difficulty === 'hard'
        );
        if (hardQ) {
          state.queues.queue2 = state.queues.queue2.filter(q => q.id !== hardQ.id);
          state.queues.queue1.unshift(hardQ);
          state.stats.queue1Size = state.queues.queue1.length;
          state.stats.queue2Size = state.queues.queue2.length;
        }
      }
      // If already HARD or >= 80%, just proceed to next question
    }
    // 10-80%: Just proceed to next question (no special action)
  };

  /**
   * Non-technical question flow rules
   */
  const applyNonTechnicalFlowRules = (question: Question, correctness: number) => {
    if (correctness <= 10) {
      // Add follow-up for very weak non-technical answer
      // (Follow-up already added by adapter.analyze, just ensure it happens)
    }
    // Non-technical questions don't have depth progression
  };

  /**
   * Discard all medium/hard questions for a topic after a follow-up
   */
  const discardDepthQuestions = (topicId: string) => {
    state.queues.queue2 = state.queues.queue2.filter(
      q => q.topicId !== topicId
    );
    state.stats.queue2Size = state.queues.queue2.length;
  };

  return {
    state,
    setQueues,
    askNext,
    handleAnswer,
    checkQueue0,
    adapter,
  };
}


