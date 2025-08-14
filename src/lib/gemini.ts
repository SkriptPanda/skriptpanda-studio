import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "./env";

const GEMINI_API_KEY_STORAGE = ENV.STORAGE_KEYS.GEMINI_API_KEY;

export const SYSTEM_PROMPT = `You are SkriptPanda, a helpful assistant for SkriptLang development.

Your role:
- Help users with Minecraft SkriptLang code and project management
- Provide accurate, working code examples
- Analyze and understand project files
- Create and modify files as requested

Guidelines:
- Be concise and helpful
- Use proper SkriptLang syntax
- Format code in \`\`\`skript blocks
- Include helpful comments in code
- Respond directly to user requests

You have access to the user's complete project structure and all file contents.`;

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
        maxOutputTokens: 50,
        temperature: 0.1,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
    });

    const result = await model.generateContent("Say hello");
    const response = await result.response;
    const text = response.text();

    console.log("✅ API key test successful, response:", text);
    return text.length > 0;
  } catch (error) {
    console.error("❌ API key test failed:", error);
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
        candidateCount: 1,
        stopSequences: [],
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
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

      // Log the full response for debugging
      console.log("🔍 Full response object:", JSON.stringify(response, null, 2));
      console.log("🔍 Response candidates:", response.candidates?.length || 0);

      // Check if response was blocked by safety filters
      if (response.promptFeedback?.blockReason) {
        console.error("❌ Response blocked by safety filters:", response.promptFeedback.blockReason);
        text = `I apologize, but my response was blocked due to safety filters. Reason: ${response.promptFeedback.blockReason}. Please try rephrasing your request.`;
      } else {
        try {
          text = response.text();
          console.log("📝 Response text length:", text.length);
          console.log("📝 Response preview:", text.substring(0, 100) + "...");
        } catch (error) {
          console.warn("⚠️ Failed to get text directly, trying alternative method:", error);

          // If direct text() fails, try to get content from candidates
          if (response.candidates && response.candidates[0]) {
            const candidate = response.candidates[0];
            console.log("🔍 Candidate finish reason:", candidate.finishReason);
            console.log("🔍 Candidate safety ratings:", candidate.safetyRatings);

            if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
              text = candidate.content.parts[0].text || "";
              console.log("📝 Extracted text from candidates:", text.length, "characters");
            } else {
              console.warn("❌ No text content found in candidate:", candidate);
              text = "I apologize, but I couldn't extract the response content. Please try again.";
            }
          } else {
            console.error("❌ No candidates found in response");
            text = "I apologize, but I couldn't generate a response. Please try again.";
          }
        }
      }

      if (!text || text.trim().length === 0) {
        console.error("❌ Empty response received from Gemini API");
        text = "I received an empty response. Please try rephrasing your request or check if your message was blocked by content filters.";
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

      // Log the full response for debugging
      console.log("🔍 Full chat response object:", JSON.stringify(response, null, 2));
      console.log("🔍 Chat response candidates:", response.candidates?.length || 0);

      // Check if response was blocked by safety filters
      if (response.promptFeedback?.blockReason) {
        console.error("❌ Chat response blocked by safety filters:", response.promptFeedback.blockReason);
        text = `I apologize, but my response was blocked due to safety filters. Reason: ${response.promptFeedback.blockReason}. Please try rephrasing your request.`;
      } else {
        try {
          text = response.text();
          console.log("📝 Chat response text length:", text.length);
          console.log("📝 Chat response preview:", text.substring(0, 100) + "...");
        } catch (error) {
          console.warn("⚠️ Failed to get chat text directly, trying alternative method:", error);

          // If direct text() fails, try to get content from candidates
          if (response.candidates && response.candidates[0]) {
            const candidate = response.candidates[0];
            console.log("🔍 Chat candidate finish reason:", candidate.finishReason);
            console.log("🔍 Chat candidate safety ratings:", candidate.safetyRatings);

            if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
              text = candidate.content.parts[0].text || "";
              console.log("📝 Extracted chat text from candidates:", text.length, "characters");
            } else {
              console.warn("❌ No text content found in chat candidate:", candidate);
              text = "I apologize, but I couldn't extract the response content. Please try again.";
            }
          } else {
            console.error("❌ No candidates found in chat response");
            text = "I apologize, but I couldn't generate a response. Please try again.";
          }
        }
      }

      if (!text || text.trim().length === 0) {
        console.error("❌ Empty chat response received from Gemini API");
        text = "I received an empty response. Please try rephrasing your request or check if your message was blocked by content filters.";
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