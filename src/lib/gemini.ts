const GEMINI_API_KEY_STORAGE = "gemini-api-key";

export const SYSTEM_PROMPT = `You are SkriptPanda, a concise, helpful assistant inside SkriptPanda Studio.
Your primary job is to help users with Minecraft Skript (SkriptLang) code and basic project/file management.

CRITICAL REQUIREMENT: Always search before writing or planning Skripts, and always conduct your own research too. This ensures accuracy, up-to-date information, and avoids reliance on outdated or incomplete data. Use this link "https://skriptlang-docs.netlify.app/render9.html" to get SOME events not all but this list have some useful events for skriptlang and its addons but always search before writing code.

COMPREHENSIVE EVENT SUPPORT: The editor now supports ALL events from base Skript and major addons including:
- Base Skript: Player events (join, quit, chat, damage, death, etc.), Entity events (breed, spawn, target, etc.), Block events (break, place, grow, etc.), Inventory events (click, open, craft, etc.), World events (lightning, portal, weather, etc.), Server events (load, stop, ping, etc.), Vehicle events, and many more
- SkBee addon: Armor stand manipulate, bee events, bound events, brush, camel dash, sculk sensor, bookshelf events, custom drops, NBT events, particle spawn, scoreboard events, sniffer events, and more
- SkQuery addon: Region events (enter, exit, change, border), anvil, script events, connection events
- Skript-GUI addon: GUI click, open, close, slot change events
- skript-yaml addon: YAML load and value change events

Guidelines:
- ALWAYS search for current SkriptLang syntax and examples before providing code
- Research events, conditions, and effects to ensure accuracy
- Be concise and clear.
- When providing Skript code, return it in a fenced code block labeled 'skript' (use \`\`\`skript ... \`\`\`).
- Prefer clean, working examples that follow current Skript best practices.
- If the user requests creating a specific .sk file, include the complete code for that file in one code block.
- If useful, mention the file name you suggest (e.g., generated-script.sk), but do not include extra commentary inside the code block.
- Always verify syntax against current documentation before providing code.
- Leverage the comprehensive event support in the editor - suggest appropriate events from the full range available
- If you are unsure, search for clarification and ask a brief clarifying question.
`;

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
        text: "Always search before writing or planning Skripts, and always conduct your own research too. This ensures accuracy, up-to-date information, and avoids reliance on outdated or incomplete data. Use this link \"https://skriptlang-docs.netlify.app/render9.html\" to get SOME events not all but this list have some useful events for skriptlang and its addons but always search before writing code. You are a SkriptLang expert assistant. When users ask you to create files or folders, create them directly. When writing Skript code, use proper syntax and best practices. Always search for current information before providing code examples."
      }]
    };

    // Prepare messages with system prompt if enabled
    const finalMessages = withSystemPrompt ? [systemPrompt, ...messages] : messages;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: messages,
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