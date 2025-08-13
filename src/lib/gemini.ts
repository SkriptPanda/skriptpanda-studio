import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "./env";

const GEMINI_API_KEY_STORAGE = ENV.STORAGE_KEYS.GEMINI_API_KEY;

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

// Test API key validity
export const testGeminiApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        maxOutputTokens: 10,
      }
    });

    const result = await model.generateContent("Hello");
    const response = await result.response;
    response.text(); // This will throw if there's an error

    return true;
  } catch (error) {
    console.error("API key test failed:", error);
    return false;
  }
};

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export const callGeminiAPI = async (
  messages: GeminiMessage[],
  apiKey: string,
  withSystemPrompt = true,
  useGrounding = false
): Promise<string> => {
  try {
    console.log(`🚀 Calling Gemini API with grounding: ${useGrounding}`);

    // Initialize the Google GenAI client
    const genAI = new GoogleGenerativeAI(apiKey);

    // Configure the model with grounding if requested
    const modelConfig: any = {
      model: "gemini-2.5-pro",
      systemInstruction: withSystemPrompt ? SYSTEM_PROMPT : undefined,
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
    };

    // Add grounding tool if requested
    if (useGrounding) {
      modelConfig.tools = [
        {
          googleSearch: {}
        }
      ];
      console.log("🔍 Google Search tool enabled for web search");
    }

    const model = genAI.getGenerativeModel(modelConfig);

    // Convert messages to the format expected by the new client
    // For single message, just pass the text directly
    if (messages.length === 1) {
      const message = messages[0];
      const prompt = message.parts[0].text;

      console.log(`📤 Sending single message to Gemini`);
      const result = await model.generateContent(prompt);
      const response = await result.response;

      // Handle response with potential tool calls
      let text = "";
      try {
        text = response.text();
        console.log("📝 Response text length:", text.length);
        console.log("📝 Response preview:", text.substring(0, 100) + "...");
      } catch (error) {
        console.warn("⚠️ Failed to get text directly, trying alternative method:", error);
        // If direct text() fails, try to get content from candidates
        if (response.candidates && response.candidates[0] && response.candidates[0].content) {
          const content = response.candidates[0].content;
          if (content.parts && content.parts[0] && content.parts[0].text) {
            text = content.parts[0].text;
            console.log("📝 Extracted text from candidates:", text.length, "characters");
          } else {
            console.warn("❌ No text content found in response:", content);
            text = "I apologize, but I couldn't generate a proper response. Please try again.";
          }
        } else {
          console.error("❌ No candidates found in response:", response);
          console.log("Full response object:", JSON.stringify(response, null, 2));
          text = "I apologize, but I couldn't generate a response. Please try again.";
        }
      }

      if (!text || text.trim().length === 0) {
        console.error("❌ Empty response received from Gemini API");
        text = "I received an empty response. Please try rephrasing your request.";
      }

      console.log("✅ Successfully received response from Gemini API");
      return text;
    } else {
      // For multiple messages, use chat format
      const chat = model.startChat({
        history: messages.slice(0, -1).map(msg => ({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.parts[0].text }]
        }))
      });

      const lastMessage = messages[messages.length - 1];
      console.log(`📤 Sending chat message to Gemini`);
      const result = await chat.sendMessage(lastMessage.parts[0].text);
      const response = await result.response;

      // Handle response with potential tool calls
      let text = "";
      try {
        text = response.text();
        console.log("📝 Chat response text length:", text.length);
        console.log("📝 Chat response preview:", text.substring(0, 100) + "...");
      } catch (error) {
        console.warn("⚠️ Failed to get chat text directly, trying alternative method:", error);
        // If direct text() fails, try to get content from candidates
        if (response.candidates && response.candidates[0] && response.candidates[0].content) {
          const content = response.candidates[0].content;
          if (content.parts && content.parts[0] && content.parts[0].text) {
            text = content.parts[0].text;
            console.log("📝 Extracted chat text from candidates:", text.length, "characters");
          } else {
            console.warn("❌ No text content found in chat response:", content);
            text = "I apologize, but I couldn't generate a proper response. Please try again.";
          }
        } else {
          console.error("❌ No candidates found in chat response:", response);
          console.log("Full chat response object:", JSON.stringify(response, null, 2));
          text = "I apologize, but I couldn't generate a response. Please try again.";
        }
      }

      if (!text || text.trim().length === 0) {
        console.error("❌ Empty chat response received from Gemini API");
        text = "I received an empty response. Please try rephrasing your request.";
      }

      console.log("✅ Successfully received response from Gemini API");
      return text;
    }


  } catch (error) {
    console.error("❌ Error calling Gemini API:", error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("API_KEY_INVALID") || error.message.includes("401")) {
        throw new Error("Invalid API key. Please check your Gemini API key and try again.");
      } else if (error.message.includes("403")) {
        throw new Error("API access denied. Please verify your Gemini API key has the necessary permissions.");
      } else if (error.message.includes("429")) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again.");
      } else if (error.message.includes("500")) {
        throw new Error("Gemini API server error. This might be a temporary issue. Please try again in a few moments.");
      }
    }

    throw error;
  }
};