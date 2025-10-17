export const buildQueue1Prompt = (resume: string): string => `Analyze this resume and generate comprehensive interview questions covering ALL these categories:

Resume:
${resume}

Generate questions for:
1. Introduction & Background
2. Education
3. Technical Skills (for each skill mentioned)
4. Work Experience
5. Projects (for each project)
6. Achievements
7. Certifications

For TECHNICAL questions, you MUST provide the correct answer.

Return ONLY a JSON array in this exact format:
[
  {"question": "Tell me about yourself", "category": "non-technical", "answer": ""},
  {"question": "What is React.js?", "category": "technical", "answer": "React.js is a JavaScript library for building user interfaces"},
  {"question": "Describe your most recent project", "category": "non-technical", "answer": ""}
]

Generate at least 15-20 questions. Make sure to mark technical questions as 'technical' and others as 'non-technical'.
Ensure at least 80% are technical questions.`;

export const buildQueue2Prompt = (question: string, correctAnswer: string): string => `Based on this technical question:
Question: ${question}
Correct Answer: ${correctAnswer}

Generate 2 follow-up questions:
1. MEDIUM difficulty - dig deeper into the topic
2. HARD difficulty - advanced/complex scenario

Return ONLY a JSON array:
[
  {"question": "medium question", "difficulty": "medium", "answer": "correct answer"},
  {"question": "hard question", "difficulty": "hard", "answer": "correct answer"}
]`;

export const buildAnalysisPrompt = (question: string, correctAnswer: string, userAnswer: string): string => `Compare these answers and determine correctness percentage:

Question: ${question}
Correct Answer: ${correctAnswer}
User's Answer: ${userAnswer}

Analyze if the user's answer is correct. Return ONLY a JSON object:
{"correctness": 85, "reason": "explanation"}

correctness should be a number from 0-100.`;

export const buildFollowupPrompt = (question: string, wrongAnswer: string): string => `The candidate gave a completely wrong answer:

Question: ${question}
Wrong Answer: ${wrongAnswer}

Generate ONE strong follow-up question to clarify their understanding or correct their misconception.

Return ONLY a JSON object:
{"question": "your follow-up question"}`;

export const buildMoodFollowupPrompt = (mood: string, context: string): string => `The candidate is showing signs of ${mood} during the interview.

Current context: ${context}

Generate ONE empathetic follow-up question that:
1. Acknowledges their emotional state appropriately
2. Helps them feel more comfortable
3. Allows them to clarify or elaborate

Return ONLY a JSON object:
{"question": "your mood-based follow-up question"}`;

// Batched generation prompt: limit number of questions
export const buildQueue1BatchPrompt = (resume: string, count: number): string => `Analyze this resume and generate ONLY ${count} interview questions mixing technical and non-technical. For technical items, include an exact correct answer.

Resume:
${resume}

Return ONLY a JSON array of objects with fields: question, category ("technical" | "non-technical"), answer (string, empty for non-technical).
Ensure at least 80% are technical questions.`;


