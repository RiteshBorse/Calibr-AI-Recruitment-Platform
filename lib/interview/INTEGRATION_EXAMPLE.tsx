/**
 * Example Integration: Multi-Queue Interview System
 * 
 * This file demonstrates how to integrate the multi-queue architecture
 * into your interview page component.
 */

"use client";

import { useEffect, useState } from "react";
import { useInterviewEngine } from "@/lib/interview/useInterviewEngine";
import { technicalInterviewAdapter } from "@/app/assessment/technical-interview/adapter";
import { updateVideoState, resetVideoState, getViolationSnapshot } from "@/lib/interview/videoQueueIntegration";
import type { Question, QuestionEntry } from "@/lib/interview/types";
import VideoProcessing from "@/lib/video-processing";

interface InterviewPageProps {
  interviewId: string;
  useVideoProctoring: boolean;
}

export default function InterviewPageExample({ interviewId, useVideoProctoring }: InterviewPageProps) {
  // Initialize interview engine with video processing option
  const engine = useInterviewEngine(technicalInterviewAdapter, useVideoProctoring);
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    question: string;
    answer: string;
    correctness?: number;
  }>>([]);

  // Initialize interview
  useEffect(() => {
    initializeInterview();
    return () => {
      // Cleanup: reset video state when component unmounts
      if (useVideoProctoring) {
        resetVideoState();
      }
    };
  }, []);

  const initializeInterview = async () => {
    try {
      // Start evaluation in database
      await engine.adapter.startEvaluation(interviewId);
      
      // Load initial questions (you'll need to generate these first)
      // This is typically done in a setup phase
      
      // Ask first question
      await askNextQuestion();
    } catch (error) {
      console.error("Failed to initialize interview:", error);
    }
  };

  /**
   * Ask next question following queue priority
   */
  const askNextQuestion = async () => {
    if (interviewEnded) return;
    
    try {
      // STEP 1: Check Queue 0 for violations (if video processing enabled)
      if (useVideoProctoring) {
        const shouldEndDueToViolations = await engine.checkQueue0();
        
        if (shouldEndDueToViolations) {
          setInterviewEnded(true);
          alert("Interview terminated due to proctoring violations (≥3 violations detected)");
          return;
        }
      }

      // STEP 2: Get next question from queue system
      const nextQuestion = await engine.askNext();
      
      if (!nextQuestion) {
        // No more questions - end interview
        setInterviewEnded(true);
        alert("Interview completed! Thank you.");
        return;
      }

      setCurrentQuestion(nextQuestion);
      setUserAnswer("");

      // Optional: Speak question using TTS
      // const audioUrl = await ttsToAudioUrl(nextQuestion.question);
      // Play audio...

    } catch (error) {
      console.error("Error getting next question:", error);
    }
  };

  /**
   * Submit answer and process through queue system
   */
  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim()) return;

    setIsProcessing(true);

    try {
      // STEP 1: Analyze answer and update queues
      const result = await engine.handleAnswer(
        currentQuestion.question,
        currentQuestion.answer || "",
        userAnswer,
        currentQuestion
      );

      // STEP 2: Determine queue number (where question came from)
      let queueNumber: 0 | 1 | 2 | 3 = 1; // Default to Queue 1
      if (currentQuestion.category === 'followup') {
        queueNumber = 3;
      } else if (currentQuestion.difficulty) {
        queueNumber = 2; // Medium/hard from Queue 2 (promoted to Queue 1)
      }

      // STEP 3: Build question entry with all required fields
      const entry: QuestionEntry = {
        question_text: currentQuestion.question,
        user_answer: userAnswer,
        ideal_answer: currentQuestion.answer,
        correctness_score: result.correctness,
        source_urls: [], // Add reference URLs if available
        question_type: currentQuestion.category as any,
        queue_number: queueNumber,
        timestamp: new Date(),
      };

      // STEP 4: Add Queue 0 data if video processing enabled
      if (useVideoProctoring && engine.queues.queue0) {
        entry.mood_state = engine.queues.queue0.mood_state;
        entry.violation_snapshot = getViolationSnapshot();
      }

      // STEP 5: Persist to database
      await engine.adapter.persistQA(interviewId, entry);

      // STEP 6: Update conversation history
      setConversationHistory(prev => [...prev, {
        question: currentQuestion.question,
        answer: userAnswer,
        correctness: result.correctness
      }]);

      // STEP 7: Check if interview should end (user requested termination)
      if (result.shouldEnd) {
        // Ask one final follow-up question before ending
        await askNextQuestion();
        // After that question is answered, interview will end
        return;
      }

      // STEP 8: Move to next question
      await askNextQuestion();

    } catch (error) {
      console.error("Error processing answer:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle video processing updates
   * Call this from your VideoProcessing component
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleVideoUpdate = (data: {
    mood?: string;
    gesture?: string;
    objects?: string[];
  }) => {
    if (!useVideoProctoring) return;
    
    updateVideoState({
      mood: data.mood,
      gesture: data.gesture,
      objects: data.objects
    });

    // The next time askNextQuestion() is called, it will check Queue 0
    // and potentially generate mood-based follow-ups or end the interview
  };

  return (
    <div className="interview-container">
      {/* Video Processing Component (if enabled) */}
      {useVideoProctoring && (
        <div>
          {/* 
            TODO: Modify VideoProcessing component to accept onUpdate callback
            Or integrate updateVideoState() directly in VideoProcessing component
          */}
          <VideoProcessing />
        </div>
      )}

      {/* Queue Statistics */}
      <div className="queue-stats">
        <h3>Interview Progress</h3>
        <p>Questions Asked: {engine.stats.questionsAsked}</p>
        <p>Queue 1 (Base): {engine.stats.queue1Size}</p>
        <p>Queue 2 (Depth): {engine.stats.queue2Size}</p>
        <p>Queue 3 (Follow-ups): {engine.stats.queue3Size}</p>
        {useVideoProctoring && (
          <>
            <p>Violations: {engine.stats.violationCount}/3</p>
            <p>Mood: {engine.queues.queue0?.mood_state || 'neutral'}</p>
          </>
        )}
      </div>

      {/* Current Question */}
      {!interviewEnded && currentQuestion && (
        <div className="question-section">
          <h2>Question {engine.stats.questionsAsked}</h2>
          <p className="question-text">{currentQuestion.question}</p>
          
          {/* Category Badge */}
          <span className={`badge ${currentQuestion.category}`}>
            {currentQuestion.category}
            {currentQuestion.difficulty && ` (${currentQuestion.difficulty})`}
          </span>

          {/* Answer Input */}
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Your answer..."
            rows={6}
            disabled={isProcessing}
          />

          {/* Submit Button */}
          <button
            onClick={handleSubmitAnswer}
            disabled={isProcessing || !userAnswer.trim()}
          >
            {isProcessing ? "Processing..." : "Submit Answer"}
          </button>
        </div>
      )}

      {/* Interview Ended */}
      {interviewEnded && (
        <div className="interview-ended">
          <h2>Interview Complete</h2>
          <p>Thank you for participating!</p>
          <p>Total Questions: {conversationHistory.length}</p>
        </div>
      )}

      {/* Conversation History */}
      <div className="conversation-history">
        <h3>Conversation History</h3>
        {conversationHistory.map((item, index) => (
          <div key={index} className="conversation-item">
            <div className="question">
              <strong>Q{index + 1}:</strong> {item.question}
            </div>
            <div className="answer">
              <strong>A:</strong> {item.answer}
            </div>
            {item.correctness !== undefined && (
              <div className="correctness">
                Score: {item.correctness}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example: Integrating with Existing Video Component
 * 
 * Modify your video-processing.tsx component to call updateVideoState:
 */

/*
// In video-processing.tsx

import { updateVideoState } from "@/lib/interview/videoQueueIntegration";

// In your updateLog function or wherever you detect mood/violations:
const handleDetection = (mood: string, gesture: string, objects: string[]) => {
  // Your existing logic...
  
  // Add this to update Queue 0:
  updateVideoState({
    mood: mood,
    gesture: gesture,
    objects: objects
  });
  
  // Your existing state updates...
};
*/

/**
 * Example: Setting Up Questions
 * 
 * Before starting the interview, generate questions:
 */

/*
// In a setup/initialization function:

import { generateQuestions } from "@/app/assessment/technical-interview/actions";

const setupInterview = async (resume: string) => {
  // Generate all queues
  const result = await generateQuestions(resume);
  
  if (result.success && result.queues) {
    // Set queues in engine
    engine.setQueues(result.queues);
    
    // Now ready to start interview
    await askNextQuestion();
  }
};
*/

/**
 * Example: Batch Question Generation
 * 
 * For progressive loading:
 */

/*
const loadQuestionsInBatches = async (resume: string) => {
  // Load initial batch (e.g., 5 questions)
  const batch1 = await engine.adapter.generateBatch(resume, 5);
  
  if (batch1.success && batch1.questions) {
    engine.setQueues({
      queue1: batch1.questions,
      queue2: [],
      queue3: []
    });
  }
  
  // Generate depth questions for technical items
  const technicalQuestions = batch1.questions?.filter(q => q.category === 'technical') || [];
  // ... generate Queue 2 for these questions
  
  // Load more batches as interview progresses
};
*/
