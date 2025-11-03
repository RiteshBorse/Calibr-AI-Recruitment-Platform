import axios from "axios";

const apiKey = process.env.NEXT_GEMINI_API;

// Updated apiCall to support file uploads with inline data
const apiCall = async (request: string, fileData?: { base64: string; mimeType: string }) => {
  try {
    // If we have file data, send it as inline_data
    const parts = fileData 
      ? [
          {
            text: request,
          },
          {
            inline_data: {
              mime_type: fileData.mimeType,
              data: fileData.base64,
            },
          },
        ]
      : [
          {
            text: "STRICTLY RETURN " + request,
          },
        ];

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        contents: [
          {
            parts: parts,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  } catch (error: any) {
    console.error("API Error:", error.response?.data || error.message);
    throw error;
  }
};

const cleanJsonString = (str: any) => {
  return str
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")  // Remove control characters
    .replace(/\u2013/g, "-")  // En-dash → hyphen
    .replace(/\u2014/g, "-")  // Em-dash → hyphen
    .replace(/\u2018/g, "'")  // Left single quote → apostrophe
    .replace(/\u2019/g, "'")  // Right single quote → apostrophe
    .replace(/\u201C/g, '"')  // Left double quote → quote
    .replace(/\u201D/g, '"')  // Right double quote → quote
    .replace(/\n\s*\n/g, "\n")
    .replace(/,\s*([}\]])/g, "$1")  // Remove trailing commas
    .replace(/\{\{/g, "{")  // Fix double opening braces
    .replace(/\}\}/g, "}")  // Fix double closing braces
    .trim();
};

export const extractJsonFromResponse = (text: any) => {
  const cleanedText = cleanJsonString(text);
  
  // First try: extract from code blocks
  const codeBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    const extracted = cleanJsonString(codeBlockMatch[1]);
    return ensureCompleteJson(extracted);
  }
  
  // Second try: extract array
  const arrayMatch = cleanedText.match(/\[\s*{[\s\S]*?}\s*\]/);
  if (arrayMatch) {
    const extracted = cleanJsonString(arrayMatch[0]);
    return ensureCompleteJson(extracted);
  }

  // Third try: extract object
  const objectMatch = cleanedText.match(/{\s*"[\s\S]*?}\s*$/);
  if (objectMatch) {
    const extracted = cleanJsonString(objectMatch[0]);
    return ensureCompleteJson(extracted);
  }

  // Fourth try: find JSON pattern
  const jsonPattern = /(\[[\s\S]*\]|\{[\s\S]*\})/;
  const match = cleanedText.match(jsonPattern);
  if (match) {
    const extracted = cleanJsonString(match[1]);
    return ensureCompleteJson(extracted);
  }

  // Fifth try: line by line search
  const lines = cleanedText
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("[") || line.startsWith("{")) {
      const potentialJson = lines.slice(i).join(" ");
      const cleaned = cleanJsonString(potentialJson);

      try {
        JSON.parse(ensureCompleteJson(cleaned));
        return ensureCompleteJson(cleaned);
      } catch (e) {
        continue;
      }
    }
  }
  
  console.log("No JSON pattern found, returning cleaned text");
  return ensureCompleteJson(cleanedText);
};

// Helper function to ensure JSON is complete with proper closing braces
const ensureCompleteJson = (jsonStr: string): string => {
  let trimmed = jsonStr.trim();
  
  // Count opening and closing braces
  const openBraces = (trimmed.match(/\{/g) || []).length;
  const closeBraces = (trimmed.match(/\}/g) || []).length;
  const openBrackets = (trimmed.match(/\[/g) || []).length;
  const closeBrackets = (trimmed.match(/\]/g) || []).length;
  
  // Add missing closing braces
  const missingBraces = openBraces - closeBraces;
  const missingBrackets = openBrackets - closeBrackets;
  
  if (missingBraces > 0) {
    trimmed += '}'.repeat(missingBraces);
  }
  
  if (missingBrackets > 0) {
    trimmed += ']'.repeat(missingBrackets);
  }
  
  return trimmed;
};

const validateAndParseJson = (jsonString: any) => {
  const trimmed = jsonString.trim();

  if (!trimmed) {
    throw new Error("Empty JSON string");
  }

  if (
    !(trimmed.startsWith("[") && trimmed.endsWith("]")) &&
    !(trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    throw new Error("JSON string doesn't have proper start/end characters");
  }

  return JSON.parse(trimmed);
};

export const getGeminiResponse = async (request: any, json: boolean, fileData?: { base64: string; mimeType: string }) => {
  try {
    let rawResponse = await apiCall(
      json == true ? "JSON format" + request : request,
      fileData  // Pass file data to apiCall
    );
    if (!json) {
      return rawResponse;
    }
    const cleanJsonString = extractJsonFromResponse(rawResponse);
    if (!cleanJsonString) {
      throw new Error("Could not extract JSON from response");
    }
    try {
      const parsedData = validateAndParseJson(cleanJsonString);
      console.log("✅ Successfully parsed JSON on first attempt");
      return parsedData;
    } catch (parseError: any) {
      console.error("❌ JSON parsing failed:", parseError.message);
      
      // Extract position from error message for debugging
      const posMatch = parseError.message.match(/position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const start = Math.max(0, pos - 50);
        const end = Math.min(cleanJsonString.length, pos + 50);
        console.error(`Context around position ${pos}:`);
        console.error(cleanJsonString.substring(start, end));
        console.error(' '.repeat(pos - start) + '^');
      }
      
      console.log("🔧 Attempting aggressive cleaning...");

      // Try multiple aggressive cleaning strategies
      const aggressivelyCleaned = cleanJsonString
        .replace(/[^\x20-\x7E\[\]{}":,\.\-\n]/g, "")  // Keep only ASCII printable + necessary chars
        .replace(/\s+/g, " ")  // Normalize whitespace
        .replace(/,\s*([}\]])/g, "$1")  // Remove trailing commas
        .trim();

      try {
        const finalAttempt = JSON.parse(aggressivelyCleaned);
        console.log("✅ Successfully parsed with aggressive cleaning");
        return finalAttempt;
      } catch (finalError: any) {
        console.error("❌ Final parsing attempt failed:", finalError.message);
        
        // Last resort: Try to auto-complete the JSON
        console.log("🔧 Attempting JSON auto-completion...");
        const autoCompleted = ensureCompleteJson(aggressivelyCleaned);
        
        try {
          const lastAttempt = JSON.parse(autoCompleted);
          console.log("✅ Successfully parsed with JSON auto-completion!");
          return lastAttempt;
        } catch (lastError: any) {
          console.error("❌ All parsing attempts exhausted");
          console.log("Problematic JSON string:", cleanJsonString.substring(0, 500) + "...");
          throw new Error(
            `Could not parse JSON after multiple attempts. Original error: ${parseError.message}`
          );
        }
      }
    }
  } catch (error: any) {
    console.error("getGeminiResponse Error:", error.message);
    console.error("Error stack:", error.stack);
    return null;
  }
};
