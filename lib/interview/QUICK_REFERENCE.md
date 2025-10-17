# Quick Reference: Multi-Queue Interview System

## Queue Overview

| Queue | Priority | Purpose | Content |
|-------|----------|---------|---------|
| **Queue 0** | HIGHEST | Video monitoring | Violations, mood, logs |
| **Queue 3** | HIGH | Follow-ups | Wrong answers, mood triggers, termination |
| **Queue 1** | MEDIUM | Base questions | Intro + random (≤20% non-tech) + outro |
| **Queue 2** | LOW | Depth questions | Medium and hard variants (not directly asked) |

## Flow Rules Cheat Sheet

### Technical Questions
```
Correctness ≤ 10%  → Queue 3 follow-up + discard Queue 2 for topic
Correctness 10-80% → Next question
Correctness ≥ 80%  → Promote next difficulty (base→medium→hard)
```

### Non-Technical Questions
```
Correctness ≤ 10% → Queue 3 follow-up
Otherwise → Next question
```

### Video Processing
```
Violations ≥ 3 → END INTERVIEW
Mood changes → Queue 3 mood-based follow-up
use_video_processing = false → Log only
```

## Key Functions

### Initialize Engine
```typescript
import { useInterviewEngine } from "@/lib/interview/useInterviewEngine";
import { technicalInterviewAdapter } from "@/app/assessment/technical-interview/adapter";

const engine = useInterviewEngine(technicalInterviewAdapter, true); // true = enable video
```

### Check Queue 0 (before each question)
```typescript
const shouldEnd = await engine.checkQueue0();
if (shouldEnd) {
  // End interview - violations ≥ 3
}
```

### Ask Next Question
```typescript
const question = await engine.askNext();
if (!question) {
  // No more questions - interview complete
}
```

### Handle Answer
```typescript
const result = await engine.handleAnswer(
  question.question,
  question.answer || "",
  userAnswer,
  question
);
// result.correctness: 0-100
// result.shouldEnd: true if user requested termination
```

### Update Video State
```typescript
import { updateVideoState } from "@/lib/interview/videoQueueIntegration";

updateVideoState({
  mood: "anxious",
  gesture: "looking_away",
  objects: ["person", "phone"]
});
```

### Persist Question Entry
```typescript
import type { QuestionEntry } from "@/lib/interview/types";
import { getViolationSnapshot } from "@/lib/interview/videoQueueIntegration";

const entry: QuestionEntry = {
  question_text: question.question,
  user_answer: userAnswer,
  ideal_answer: question.answer,
  correctness_score: result.correctness,
  source_urls: [],
  question_type: question.category,
  queue_number: 1, // or appropriate queue
  timestamp: new Date(),
  // If video processing enabled:
  mood_state: engine.queues.queue0?.mood_state,
  violation_snapshot: getViolationSnapshot()
};

await engine.adapter.persistQA(interviewId, entry);
```

## Stats Access

```typescript
engine.stats.questionsAsked    // Total questions asked
engine.stats.queue1Size        // Remaining base questions
engine.stats.queue2Size        // Remaining depth questions
engine.stats.queue3Size        // Pending follow-ups
engine.stats.violationCount    // Current violations (0-3)
engine.stats.interviewEnded    // true if interview terminated
```

## Queue Access

```typescript
engine.queues.queue0           // Video state (if enabled)
engine.queues.queue1           // Base questions array
engine.queues.queue2           // Depth questions array
engine.queues.queue3           // Follow-up questions array
```

## Generate Questions

```typescript
import { generateQuestions } from "@/app/assessment/technical-interview/actions";

const result = await generateQuestions(resumeText);
if (result.success && result.queues) {
  engine.setQueues(result.queues);
}
```

## Question Structure

```typescript
{
  id: "q_xyz123",                    // Unique ID
  question: "What is React?",        // Question text
  category: "technical",             // or "non-technical" or "followup"
  difficulty: "medium",              // Optional: "medium" or "hard"
  answer: "React is...",             // Correct answer (for technical)
  topicId: "topic_what_is_react_abc" // Links related questions
}
```

## Common Patterns

### Start Interview
```typescript
// 1. Start evaluation
await engine.adapter.startEvaluation(interviewId);

// 2. Generate questions
const result = await generateQuestions(resume);
engine.setQueues(result.queues!);

// 3. Ask first question
const firstQuestion = await engine.askNext();
```

### Process Each Answer
```typescript
// 1. Check violations (if video enabled)
const shouldEnd = await engine.checkQueue0();
if (shouldEnd) return;

// 2. Analyze answer
const result = await engine.handleAnswer(q.question, q.answer, userAnswer, q);

// 3. Save to DB
await engine.adapter.persistQA(interviewId, entry);

// 4. Check for termination
if (result.shouldEnd) {
  // User wants to end - one more question will be asked
}

// 5. Ask next
const next = await engine.askNext();
```

### End Interview
```typescript
// Natural end (no more questions)
const next = await engine.askNext();
if (!next) {
  // Interview complete
}

// Violation end (≥3 violations)
const shouldEnd = await engine.checkQueue0();
if (shouldEnd) {
  // Interview terminated
}

// User requested end
if (result.shouldEnd) {
  // One final follow-up will be asked
}
```

## Troubleshooting

### Questions not randomized?
✓ Make sure `generateQuestions()` is calling `randomizeQueue1()`

### Queue 2 questions not being asked?
✓ They must be promoted to Queue 1 with ≥80% answers
✓ Check if follow-ups discarded them (happens at ≤10%)

### Violations not triggering?
✓ Ensure `updateVideoState()` is being called from video component
✓ Check `useVideoProcessing` is `true` in engine initialization
✓ Verify `checkQueue0()` is called before each question

### Questions repeating?
✓ `askNext()` should skip already-asked questions automatically
✓ Check that `topicId` is being set for technical questions

### Follow-ups not appearing?
✓ Check correctness is ≤10%
✓ Verify Queue 3 is being checked before Queue 1 (it should be automatic)
✓ Look at `engine.stats.queue3Size` to see pending follow-ups

## File Locations

```
Core System:
├── lib/interview/types.ts                  # Type definitions
├── lib/interview/engine.ts                 # Queue processing logic
├── lib/interview/useInterviewEngine.ts     # React hook
├── lib/interview/videoQueueIntegration.ts  # Queue 0 integration
├── lib/interview/QUEUE_ARCHITECTURE.md     # Full documentation
└── lib/interview/INTEGRATION_EXAMPLE.tsx   # Usage example

Actions & Adapters:
├── app/assessment/technical-interview/actions.ts  # Server actions
└── app/assessment/technical-interview/adapter.ts  # Engine adapter

Utilities:
├── utils/interview.ts                      # Queue utilities
└── ai-engine/prompts/technicalInterview.ts # AI prompts

Database:
└── models/technicalInterviewEvaluation.model.ts   # Data model
```

## Next Steps After Implementation

1. ✅ Integrate video component with `updateVideoState()`
2. ✅ Update interview page to use async engine methods
3. ✅ Test all queue transitions
4. ✅ Add error handling for edge cases
5. ✅ Create unit tests
6. ✅ Monitor performance
7. ✅ Add analytics tracking
