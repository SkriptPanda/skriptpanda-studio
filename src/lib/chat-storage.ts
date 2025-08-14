// Chat storage utilities for persistent chat history

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

const CHAT_STORAGE_KEY = "skriptpanda-chat-history";
const MAX_STORED_MESSAGES = 100; // Limit to prevent localStorage bloat

// Save messages to localStorage
export const saveChatHistory = (messages: Message[]): void => {
  try {
    // Keep only the most recent messages to prevent storage bloat
    const messagesToSave = messages.slice(-MAX_STORED_MESSAGES);
    
    // Convert dates to strings for JSON serialization
    const serializedMessages = messagesToSave.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    }));
    
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(serializedMessages));
  } catch (error) {
    console.error("Failed to save chat history:", error);
  }
};

// Load messages from localStorage
export const loadChatHistory = (): Message[] => {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    
    // Convert timestamp strings back to Date objects
    return parsed.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return [];
  }
};

// Clear chat history from localStorage
export const clearChatHistory = (): void => {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear chat history:", error);
  }
};

// Get recent messages for AI context (last N messages)
export const getRecentMessagesForContext = (messages: Message[], count: number = 10): Message[] => {
  return messages.slice(-count);
};

// Format messages for AI context
export const formatMessagesForAI = (messages: Message[]): string => {
  if (messages.length === 0) return "";
  
  const contextMessages = getRecentMessagesForContext(messages, 10);
  
  let context = "\nRECENT CONVERSATION HISTORY:\n";
  context += "================================\n";
  
  contextMessages.forEach((msg, index) => {
    const role = msg.role === "user" ? "USER" : "ASSISTANT";
    const timestamp = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    context += `[${timestamp}] ${role}: ${msg.content}\n`;
    if (index < contextMessages.length - 1) {
      context += "---\n";
    }
  });
  
  context += "================================\n";
  context += "Please consider this conversation history when responding to maintain context and continuity.\n\n";
  
  return context;
};
