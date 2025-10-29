// Gemini prompts for technical interview (moved from utils/interview.ts)

export const IDEAL_ANSWER_PROMPT = (question: string) => `For this technical question, provide evaluation criteria or an ideal answer:

Question: ${question}

IMPORTANT: Determine if this is a:
1. **Knowledge-based question** (has definite technical answer) - Example: "What is React state management?"
2. **Experience-based question** (personal/subjective) - Example: "Have you deployed applications to cloud platforms?"

For KNOWLEDGE-BASED questions:
- Provide a detailed, technically accurate answer
- Include 2-3 authoritative source URLs

For EXPERIENCE-BASED questions:
- DO NOT provide a personal answer (like "As an AI, I...")
- Instead, provide evaluation criteria (what makes a good answer)
- Set ideal_answer to: "EVALUATE_DIRECTLY: [criteria for good answer]"
- Leave source_urls empty

CRITICAL TEXT FORMATTING FOR TTS:
- DO NOT use asterisks (*) for emphasis - they will be read aloud
- DO NOT use single quotes (') or double quotes (") around words - they will be spoken
- Use plain natural language without markup
- Write as if speaking naturally in conversation

Return ONLY a JSON object:
{
  "ideal_answer": "comprehensive technical answer OR 'EVALUATE_DIRECTLY: criteria'",
  "source_urls": [
    "https://example.com/source1",
    "https://example.com/source2"
  ]
}

Examples:
- Knowledge: "What is closure in JavaScript?" → Provide technical answer + sources
- Experience: "Have you worked with AWS?" → "EVALUATE_DIRECTLY: Good answer demonstrates practical cloud deployment knowledge, mentions specific AWS services used, discusses challenges faced, and shows understanding of deployment concepts."

Ensure sources are real, authoritative URLs (e.g., MDN, official documentation, Stack Overflow, tech blogs).`;

export const EVALUATE_ANSWER_PROMPT = (question: string, idealAnswer: string, userAnswer: string) => `Evaluate this interview answer:

Question: ${question}
Evaluation Criteria: ${idealAnswer}
User's Answer: ${userAnswer}

CRITICAL CONTEXT - SPEECH-TO-TEXT RECORDING:
⚠️ This answer was recorded using Speech-To-Text (STT) technology, which means:
- There may be spelling errors or inconsistencies (e.g., "their" vs "there", "to" vs "too")
- Punctuation and sentence structure are AUTO-GENERATED and NOT controlled by the candidate
- The candidate CANNOT add commas, periods, or proper formatting - it's all done by the STT algorithm
- Run-on sentences or missing punctuation are limitations of the STT tool, NOT the candidate's communication skills
- Focus on the CONTENT and MEANING of what they said, NOT grammatical perfection

DO NOT penalize the candidate for:
❌ Missing punctuation or run-on sentences (STT limitation)
❌ Spelling inconsistencies or homophones (STT inaccuracy)
❌ Lack of sentence breaks or paragraph structure (STT does not support this)
❌ Minor grammatical errors that are clearly STT mistakes

INSTEAD, evaluate based on:
✅ Whether they addressed the question
✅ The substance and authenticity of their response
✅ Professional maturity in the IDEAS they expressed
✅ Logical flow of thoughts (even if punctuation is missing)
✅ Self-awareness and reflection in what they SAID

IMPORTANT SCORING GUIDELINES:
- Be LENIENT and GENEROUS with scoring - this is a real human under interview pressure
- If the candidate shows UNDERSTANDING of the concept, score 50%+
- If they mention the RIGHT concepts even with minor inaccuracies, score 60%+
- Only score below 20% if the answer is completely wrong or irrelevant
- Score 0-10% ONLY if answer is nonsensical or doesn't address the question at all

IMPORTANT: Check if the evaluation criteria starts with "EVALUATE_DIRECTLY:":
- If YES: This is an experience-based question. Evaluate based on the criteria provided (relevance, depth, practical understanding).
- If NO: This is a knowledge-based question. Compare user's answer against the ideal answer for technical accuracy.

For KNOWLEDGE-BASED questions, consider:
- Core concept mentioned? → 20%+ (fails if below 20%)
- Correct approach/methodology? → 30-40%
- Multiple relevant points? → 50%+ (normal flow triggers)
- Best practices mentioned? → 60-70%
- Comprehensive with examples? → 80%+ (next difficulty triggers)

For EXPERIENCE-BASED questions, consider:
- Shows practical experience? → 20%+ (fails if below 20%)
- Mentions specific tools/technologies? → 30-40%
- Discusses real challenges/solutions? → 50%+ (normal flow triggers)
- Demonstrates deep understanding? → 80%+ (next difficulty triggers)

SCORING EXAMPLES (remember - ignore punctuation/formatting):
- "I use JWT for auth" → 25-35% (basic understanding, very generic answer)
- "I use JWT tokens to secure APIs store them in httpOnly cookies" → 50-60% (good practical approach despite missing punctuation, moves to normal flow)
- "JWT for stateless auth refresh tokens for security httpOnly cookies to prevent XSS token rotation" → 70-85% (comprehensive despite run-on sentence, next difficulty triggers)

Return ONLY a JSON object:
{
  "correctness": 85,
  "reason": "Brief explanation of scoring (focus on technical CONTENT, not formatting/punctuation)",
  "route_action": "next_difficulty"
}

Where:
- correctness: 0-100 score (be GENEROUS - real humans make mistakes under pressure, IGNORE STT formatting issues)
- reason: Brief explanation (1-2 sentences, focus on technical substance not grammar)
- route_action: "next_difficulty" (≥50%), "normal_flow" (20-50%), or "followup" (<20% - generates Q3 followup + deletes Q2s)`;

export const buildQueue1Prompt = (
  jobData: {
    title: string;
    position: string;
    department: string;
    seniority: string;
    techStack: string[];
    description?: string;
    requirements?: string;
  },
  resumeData: {
    tagline?: string;
    summary?: string;
    workDetails?: any[];
    education?: any[];
    skills?: string;
    projects?: any[];
    certificates?: any[];
  }
): string => {
  const jobContext = `
JOB CONTEXT (for AI use only - don't mention explicitly):
- Position: ${jobData.position} (${jobData.seniority} level)
- Department: ${jobData.department}
- Required Skills: ${jobData.techStack.join(', ')}
${jobData.description ? `- Overview: ${jobData.description}` : ''}
${jobData.requirements ? `- Key Requirements: ${jobData.requirements}` : ''}
`;

  const resumeContext = `
CANDIDATE BACKGROUND (for AI use only - don't mention explicitly):
${resumeData.summary ? `- Background: ${resumeData.summary}` : ''}
${resumeData.skills ? `- Skills: ${resumeData.skills}` : ''}
${resumeData.education && resumeData.education.length > 0 ? `- Education: ${resumeData.education.map(e => `${e.degree} from ${e.institution}`).join('; ')}` : ''}
${resumeData.workDetails && resumeData.workDetails.length > 0 ? `- Experience: ${resumeData.workDetails.map(w => `${w.position} at ${w.company}`).join('; ')}` : ''}
${resumeData.projects && resumeData.projects.length > 0 ? `- Projects: ${resumeData.projects.map(p => p.name).join(', ')}` : ''}
`;

  return `You are conducting a natural, conversational technical interview. Use the context below to generate relevant questions, but NEVER explicitly mention "the job posting", "your resume", or "the position requirements" in the questions themselves.

${jobContext}

${resumeContext}

CRITICAL INTERVIEW FLOW:
1. START with a warm introduction question (e.g., "Tell me about yourself" or "Walk me through your background")
2. Then ask natural technical questions based on their experience and the role's needs
3. Questions should sound like normal conversation, not scripted from documents
4. Focus on ${jobData.techStack.slice(0, 3).join(', ')} but don't list them mechanically
5. Explore their mentioned experience naturally

QUESTION GUIDELINES:
- Keep questions conversational and human-like
- Don't say "According to your resume" or "The position requires"
- Ask about their experience directly (e.g., "How have you worked with React?" not "Your resume mentions React, can you explain...")
- Don't repeat the same tech stack list in every question
- Mix conceptual understanding with practical experience
- Difficulty should match ${jobData.seniority} level naturally

CRITICAL TEXT FORMATTING FOR TTS:
- DO NOT use asterisks (*) for emphasis - they will be read aloud
- DO NOT use single quotes (') or double quotes (") around words - they will be spoken
- Use plain natural language without markup or special characters
- Write questions as if speaking naturally in conversation
- Avoid markdown formatting, bullet points with asterisks, or quoted phrases

Generate 15-18 questions total following this structure:
1. Introduction (1 question): Warm, open-ended
2. Core Technical Skills (6-8 questions): Natural questions about key technologies
3. Experience & Projects (3-4 questions): Dig into their work naturally
4. Problem Solving (2-3 questions): Scenario-based, conversational
5. Advanced Topics (2-3 questions): Deeper technical concepts for ${jobData.seniority}

CRITICAL CATEGORIZATION RULES:
- "technical" = Questions about code, architecture, APIs, databases, frameworks, algorithms, design patterns, or any technical concept that has a correct/better answer
- "non-technical" = ONLY personal questions like "Tell me about yourself", "What's your background?", "Describe your experience"
- Questions about "how you structure MongoDB", "API architecture", "securing endpoints" = TECHNICAL (not personal experience)
- Questions about "your projects" asking for technical details = TECHNICAL
- Questions asking "walk me through architecture" = TECHNICAL

For ALL TECHNICAL questions, YOU MUST provide a detailed, technically accurate answer showing best practices (written in plain language without asterisks or quotes).
For non-technical questions, leave answer empty.

INTRO QUESTION OPTIONS (pick ONE at random, not always the same):
- "Tell me a bit about yourself and your background in software development"
- "Walk me through your journey as a developer"
- "How did you get into software development and what's your experience been like?"
- "Can you tell me about your professional background and what you've been working on?"
- "What's your background and what areas of development interest you most?"
- "How would you describe your experience as a developer?"

Return ONLY a JSON array:
[
  {"question": "[CHOOSE ONE INTRO QUESTION FROM OPTIONS ABOVE - VARY IT]", "category": "non-technical", "answer": ""},
  {"question": "How do you approach state management in React applications?", "category": "technical", "answer": "State management in React can be handled through: 1) useState/useReducer for local state, 2) Context API for shared state across components, 3) External libraries like Redux/Zustand for complex global state. Best practices include keeping state as local as possible, using Context for theme/auth, and Redux for large apps needing predictable state updates with middleware support."},
  {"question": "Looking at your MongoDB projects, how do you structure data relationships?", "category": "technical", "answer": "MongoDB data modeling involves: 1) Embedding documents for one-to-few relationships, 2) Referencing with ObjectIds for one-to-many, 3) Using arrays for many-to-many with junction collections when needed. Key considerations: data access patterns, atomicity needs, document size limits (16MB), and query performance. Normalize when data changes frequently independently."}
]

CRITICAL: 
- First question MUST be introduction/warm-up (non-technical) but VARY the wording each time
- Pick a DIFFERENT intro question each time - don't use the same one repeatedly
- Questions about technical concepts, architecture, tools, or code = "technical" with detailed answer
- EVERY technical question MUST have a comprehensive answer
- NO asterisks, quotes, or markdown formatting in questions or answers`;
};

export const buildQueue2Prompt = (question: string, correctAnswer: string): string => `You're conducting a technical interview. The candidate just answered a question, and you want to explore the TOPIC deeper with natural follow-up questions.

Original Question Topic: ${question}
Technical Context: ${correctAnswer}

Generate 2 natural follow-up questions that:
1. MEDIUM difficulty - Dig deeper into the same TOPIC (e.g., "How would you handle X edge case?" or "What about Y scenario?")
2. HARD difficulty - Advanced real-world application (e.g., "If you had to optimize this..." or "How would this work at scale?")

CRITICAL RULES:
- DO NOT reference or assume what the candidate answered (e.g., avoid "You mentioned...", "You've touched on...", "Beyond what you said...")
- Focus on the TOPIC itself, not their specific answer
- Ask standalone questions about the topic area
- Make them sound conversational and natural

CRITICAL TEXT FORMATTING FOR TTS:
- DO NOT use asterisks (*) for emphasis - they will be read aloud
- DO NOT use single quotes (') or double quotes (") around words - they will be spoken
- Use plain natural language without markup or special characters
- Write as if speaking naturally in conversation

GOOD Examples:
- "What are some performance considerations when working with images in web applications?"
- "How would you optimize image loading for mobile devices?"

BAD Examples (DON'T DO THIS):
- "Beyond what you mentioned, what else..."
- "You've touched on X, now tell me about Y..."
- "Building on your answer..."

Return ONLY a JSON array:
[
  {"question": "natural medium follow-up question", "difficulty": "medium", "answer": "detailed technical answer"},
  {"question": "natural hard follow-up question", "difficulty": "hard", "answer": "detailed technical answer"}
]

Questions should be about the TOPIC, not referencing their previous answer. No asterisks or quotes in text.`;

export const buildFollowupPrompt = (question: string, wrongAnswer: string): string => `You're interviewing a candidate who seems confused about a topic. Rather than marking them wrong and moving on, you want to help them understand or give them another chance.

Question: ${question}
Their Answer: ${wrongAnswer}

Generate ONE supportive follow-up question that:
- Sounds empathetic and encouraging (e.g., "Let me phrase it differently..." or "Think about it from X perspective...")
- Helps clarify the concept without being condescending
- Gives them a chance to demonstrate understanding in a different way
- Feels like a real mentor/interviewer helping them

CRITICAL TEXT FORMATTING FOR TTS:
- DO NOT use asterisks (*) for emphasis - they will be read aloud
- DO NOT use single quotes (') or double quotes (") around words - they will be spoken
- Use plain natural language without markup
- Write as if speaking naturally to someone

Return ONLY a JSON object:
{"question": "your supportive follow-up question"}

Keep it conversational and human - not robotic or scripted. No asterisks or quotes.`;

export const buildMoodFollowupPrompt = (mood: string, context: string): string => `The candidate is showing signs of ${mood} during the interview.

Current context: ${context}

Generate ONE empathetic follow-up question that:
1. Acknowledges their emotional state appropriately
2. Helps them feel more comfortable
3. Allows them to clarify or elaborate

Return ONLY a JSON object:
{"question": "your mood-based follow-up question"}`;

/**
 * Generate a natural closing question/statement for the interview
 */
export const buildInterviewClosingPrompt = (
  candidateName?: string,
  performanceSummary?: string
): string => `You're wrapping up a technical interview. Generate a natural, warm closing that:
1. Thanks the candidate for their time
2. Acknowledges their effort and participation
3. Explains next steps briefly
4. Sounds genuine and encouraging

${candidateName ? `Candidate's name: ${candidateName}` : ''}
${performanceSummary ? `Performance context: ${performanceSummary}` : ''}

Generate a closing statement that feels human and encouraging. It should be 2-3 sentences.

Return ONLY a JSON object:
{"closing": "Your natural closing statement"}

Example tone: "Thanks so much for taking the time today. You've shown some great problem-solving skills, and I appreciate your thorough answers. We'll review everything and get back to you within the next few days."

Keep it warm, professional, and authentic - like a real person ending an interview.`;


