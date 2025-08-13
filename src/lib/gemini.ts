const GEMINI_API_KEY_STORAGE = "gemini-api-key";

export const getGeminiApiKey = (): string | null => {
  return localStorage.getItem(GEMINI_API_KEY_STORAGE);
};

export const setGeminiApiKey = (apiKey: string): void => {
  localStorage.setItem(GEMINI_API_KEY_STORAGE, apiKey);
};

export const removeGeminiApiKey = (): void => {
  localStorage.removeItem(GEMINI_API_KEY_STORAGE);
};

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export const callGeminiAPI = async (
  messages: GeminiMessage[],
  apiKey: string,
  withSystemPrompt = true
): Promise<string> => {
  try {
    // System prompt for SkriptLang development
    const systemPrompt: GeminiMessage = {
      role: "user",
      parts: [{
        text: "Always search before writing or planning Skripts, and always conduct your own research too. This ensures accuracy, up-to-date information, and avoids reliance on outdated or incomplete data. Use this link to get SOME events not all but this list have some useful events for skriptlang and its addons but always search before writing code: https://skripthub.net/docs/. You are a SkriptLang expert assistant. When users ask you to create files or folders, create them directly. When writing Skript code, use proper syntax and best practices. Always search for current information before providing code examples."
      }]
    };

    // Prepare messages with system prompt if enabled
    const finalMessages = withSystemPrompt ? [systemPrompt, ...messages] : messages;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: finalMessages,
          tools: [{
            googleSearchRetrieval: {}
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error("Invalid response from Gemini API");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};