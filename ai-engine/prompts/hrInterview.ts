// Gemini prompts for HR interview

export const IDEAL_ANSWER_PROMPT = (question: string) => `For this HR interview question, provide evaluation criteria:

Question: ${question}

This is a behavioral/HR question. You should provide evaluation criteria that helps assess:
- Clarity and structure of the answer
- Relevance to the question
- Demonstrates self-awareness and growth mindset
- Shows appropriate professional maturity
- Indicates good judgment and reasoning

For puzzles/riddles/creative questions, provide the actual ideal answer with explanation.

Set ideal_answer to: "EVALUATE_DIRECTLY: [criteria for good answer]" for behavioral questions
OR provide actual answer for puzzles/riddles with explanation.

Leave source_urls empty for behavioral questions, include sources for puzzles if applicable.

CRITICAL TEXT FORMATTING FOR TTS:
- DO NOT use asterisks (*) for emphasis - they will be read aloud
- DO NOT use single quotes (') or double quotes (") around words - they will be spoken
- Use plain natural language without markup
- Write as if speaking naturally in conversation

Return ONLY a JSON object:
{
  "ideal_answer": "EVALUATE_DIRECTLY: [comprehensive evaluation criteria] OR [actual answer for puzzles]",
  "source_urls": []
}

Example (Behavioral):
Question: "Tell me about a time you had a conflict with a team member"
Answer: "EVALUATE_DIRECTLY: Good answer demonstrates specific situation with context, describes actions taken professionally, shows empathy and conflict resolution skills, reflects on lessons learned, and indicates emotional maturity."

Example (Puzzle):
Question: "How many tennis balls can fit in a school bus?"
Answer: "Approximately 500,000 tennis balls. Approach: Estimate bus volume (about 200 cubic meters), tennis ball volume (about 0.0004 cubic meters with packing inefficiency), divide to get result. Good answers show systematic thinking and reasonable assumptions."`;

export const EVALUATE_ANSWER_PROMPT = (question: string, idealAnswer: string, userAnswer: string) => `Evaluate this HR interview answer:

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

IMPORTANT SCORING GUIDELINES FOR HR INTERVIEW:
- Be HUMAN and REASONABLE with scoring - assess authenticity and professionalism
- HR interviews evaluate communication, maturity, fit, and behavioral competencies
- Score based on how genuine, thoughtful, and professional the answer sounds
- IGNORE formatting, punctuation, and spelling errors caused by STT

EVALUATION CRITERIA (check the idealAnswer for specific guidance):
- Does the answer address the question directly?
- Does it show self-awareness and maturity in the IDEAS shared?
- Is it authentic (not overly rehearsed or generic)?
- Does it demonstrate good judgment and professionalism in CONTENT?
- For puzzles/riddles: Does it show logical thinking and problem-solving approach?

SCORING SCALE:
- 0-20%: Completely inappropriate, nonsensical, overly negative, narcissistic, or shows red flags IN CONTENT
- 20-80%: Acceptable but generic, shows basic understanding, reasonable answer (NORMAL FLOW)
- 80-100%: Excellent, authentic, well-structured IDEAS, shows deep self-awareness and maturity

THRESHOLD ACTIONS (CRITICAL):
- < 20%: Generate NEGATIVE/CORRECTIVE followup (help candidate improve or clarify)
- 20-80%: Continue to next Q1 (normal flow)
- > 80%: Generate POSITIVE/PROBING followup (dig deeper into their excellence)

SCORING EXAMPLES:
- "I am the best I never make mistakes" → 5-15% (narcissistic, red flag - CONTENT issue)
- "I work well in teams and communicate clearly" → 40-60% (generic but acceptable - CONTENT is basic)
- "In my last role at X I faced Y conflict I approached it by Z learned A and now apply B" → 75-90% (specific, reflective, mature - CONTENT is excellent, ignore missing punctuation)

Return ONLY a JSON object:
{
  "correctness": 65,
  "reason": "Brief explanation of scoring (focus on CONTENT, not formatting)",
  "route_action": "normal_flow"
}

Where:
- correctness: 0-100 score (based on CONTENT only, NOT formatting/punctuation)
- reason: Brief explanation (1-2 sentences, focus on substance)
- route_action: "followup_negative" (<20%), "normal_flow" (20-80%), or "followup_positive" (>80%)`;

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
- Tech/Skills: ${jobData.techStack.join(', ')}
${jobData.description ? `- Overview: ${jobData.description}` : ''}
${jobData.requirements ? `- Key Requirements: ${jobData.requirements}` : ''}
`;

  const resumeContext = `
CANDIDATE BACKGROUND (for AI use only - personalize questions based on this):
${resumeData.summary ? `- Background: ${resumeData.summary}` : ''}
${resumeData.skills ? `- Skills: ${resumeData.skills}` : ''}
${resumeData.education && resumeData.education.length > 0 ? `- Education: ${resumeData.education.map(e => `${e.degree} from ${e.institution}`).join('; ')}` : ''}
${resumeData.workDetails && resumeData.workDetails.length > 0 ? `- Experience: ${resumeData.workDetails.map(w => `${w.position} at ${w.company}`).join('; ')}` : ''}
${resumeData.projects && resumeData.projects.length > 0 ? `- Projects: ${resumeData.projects.map(p => p.name).join(', ')}` : ''}
`;

  return `You are conducting a natural, conversational HR interview. This is the FINAL ROUND to assess the candidate's personality, behavioral competencies, cultural fit, and professionalism.

${jobContext}

${resumeContext}

CRITICAL INTERVIEW FLOW:
1. START with a warm introduction question (e.g., "Tell me about yourself" or "Walk me through your background")
2. Then ask PERSONALIZED behavioral and HR questions based on their specific experience
3. Questions should sound like normal conversation, not scripted
4. Focus on assessing: communication, teamwork, leadership, conflict resolution, motivation, cultural fit, professionalism
5. Mix question types naturally - don't follow a rigid structure

QUESTION TOPICS TO INCLUDE (let AI decide weightage based on candidate's background):
- Introduction & Background (who they are, their journey)
- Leadership & Team Management (if applicable to seniority level)
- Conflict Resolution & Difficult Situations
- Past Experiences & Key Achievements (specific to their resume)
- Communication & Collaboration Skills
- Problem-Solving & Decision-Making (behavioral)
- Motivation & Career Goals
- Cultural Fit & Work Style
- Adaptability & Learning Mindset
- OPTIONAL: 1-2 light puzzles, riddles, or creative thinking questions (if appropriate)

PERSONALIZATION RULES:
- Reference their SPECIFIC companies, roles, projects from resume
- Tailor leadership questions to their seniority (junior vs senior)
- Ask about gaps, transitions, or unique experiences in their background
- Make it feel like you studied their resume carefully

QUESTION GUIDELINES:
- Keep questions conversational and human-like
- Don't say "According to your resume" - ask naturally (e.g., "I see you worked at X, how was that experience?")
- Mix open-ended with specific situational questions
- Avoid yes/no questions - encourage storytelling
- Use STAR format prompts (Situation, Task, Action, Result) for behavioral questions

CRITICAL TEXT FORMATTING FOR TTS:
- DO NOT use asterisks (*) for emphasis - they will be read aloud
- DO NOT use single quotes (') or double quotes (") around words - they will be spoken
- Use plain natural language without markup or special characters
- Write questions as if speaking naturally in conversation
- Avoid markdown formatting, bullet points with asterisks, or quoted phrases

Generate 15-25 questions total (AI decides based on candidate's experience depth):
- All questions are same difficulty level (no easy/medium/hard)
- All questions category: "non-technical" (behavioral/HR)
- Mix topics naturally based on candidate's background

For ALL questions:
- Category MUST be "non-technical"
- Leave answer EMPTY (evaluation criteria will be generated later)
- Questions should be conversational and natural

INTRO QUESTION OPTIONS (pick ONE at random, not always the same):
- "Tell me a bit about yourself and what brought you to this point in your career"
- "Walk me through your professional journey so far"
- "How would you describe yourself professionally?"
- "Can you tell me about your background and what motivates you?"
- "What's your story - how did you get into this field?"

Return ONLY a JSON array:
[
  {"question": "[CHOOSE ONE INTRO QUESTION FROM OPTIONS ABOVE - VARY IT]", "category": "non-technical", "answer": ""},
  {"question": "I see you worked at [COMPANY from resume]. What was the most challenging situation you faced there?", "category": "non-technical", "answer": ""},
  {"question": "Tell me about a time you had to work with a difficult team member. How did you handle it?", "category": "non-technical", "answer": ""},
  {"question": "Where do you see yourself in 5 years, and how does this role fit into that vision?", "category": "non-technical", "answer": ""}
]

CRITICAL: 
- First question MUST be introduction/warm-up but VARY the wording each time
- ALL questions category = "non-technical"
- ALL questions answer = "" (empty string)
- Questions MUST be personalized to their specific resume
- NO asterisks, quotes, or markdown formatting in questions`;
};

export const buildFollowupPrompt = (
  question: string, 
  userAnswer: string,
  isPositive: boolean
): string => {
  if (isPositive) {
    // Positive followup for excellent answers (>80%)
    return `You're interviewing a candidate who just gave an EXCELLENT answer. You want to dig deeper and learn more about their strengths.

Question: ${question}
Their Answer: ${userAnswer}

Generate ONE positive, probing follow-up question that:
- Acknowledges their strong answer implicitly
- Digs deeper into what they shared
- Explores their thought process or lessons learned
- Sounds genuinely curious and encouraging
- Helps reveal more about their excellence

CRITICAL TEXT FORMATTING FOR TTS:
- DO NOT use asterisks (*) for emphasis - they will be read aloud
- DO NOT use single quotes (') or double quotes (") around words - they will be spoken
- Use plain natural language without markup
- Write as if speaking naturally to someone

Examples of positive followup style:
- "That's a great approach. What made you think of that solution?"
- "Interesting perspective. How did that experience shape your current approach to X?"
- "I like how you handled that. What would you do differently now with more experience?"

Return ONLY a JSON object:
{"question": "your positive, probing follow-up question"}

Keep it warm, curious, and professional - like a real interviewer impressed by the answer.`;
  } else {
    // Negative/corrective followup for poor answers (<20%)
    return `You're interviewing a candidate who seems confused or gave a problematic answer. You want to help them clarify or give them a chance to improve.

Question: ${question}
Their Answer: ${userAnswer}

Generate ONE supportive, corrective follow-up question that:
- Sounds empathetic and non-judgmental
- Helps them clarify their thinking
- Gives them a chance to demonstrate better judgment
- Gently steers them toward a more appropriate response
- Feels like a mentor helping, not criticizing

CRITICAL TEXT FORMATTING FOR TTS:
- DO NOT use asterisks (*) for emphasis - they will be read aloud
- DO NOT use single quotes (') or double quotes (") around words - they will be spoken
- Use plain natural language without markup
- Write as if speaking naturally to someone

Examples of corrective followup style:
- "Let me rephrase that. What I'm really asking is..."
- "I understand. Could you share a specific example to help me understand better?"
- "That's one perspective. How do you balance that with team needs?"

Return ONLY a JSON object:
{"question": "your supportive, corrective follow-up question"}

Keep it conversational and kind - not harsh or condescending.`;
  }
};

/**
 * Generate a natural closing statement for the HR interview
 */
export const buildInterviewClosingPrompt = (
  candidateName?: string,
  performanceSummary?: string
): string => `You're wrapping up an HR interview. Generate a natural, warm closing that:
1. Thanks the candidate for their time
2. Acknowledges their participation and authenticity
3. Explains next steps briefly
4. Sounds genuine and encouraging

${candidateName ? `Candidate's name: ${candidateName}` : ''}
${performanceSummary ? `Performance context: ${performanceSummary}` : ''}

Generate a closing statement that feels human and encouraging. It should be 2-3 sentences.

Return ONLY a JSON object:
{"closing": "Your natural closing statement"}

Example tone: "Thank you so much for sharing your experiences today. I really appreciate your openness and thoughtful answers. We'll be in touch within the next few days with the next steps."

Keep it warm, professional, and authentic - like a real person ending an interview.`;
