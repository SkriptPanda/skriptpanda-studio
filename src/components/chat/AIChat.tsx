import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Key } from "lucide-react";
import { FileTree, FileLeaf } from "@/lib/fs";
import { getGeminiApiKey, setGeminiApiKey, testGeminiApiKey } from "@/lib/gemini";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { useToast } from "@/components/ui/use-toast";
import { ChatBar } from "@/components/chat/ChatBar";
import { processAICommand } from "@/lib/ai-commands";
import {
  Message,
  saveChatHistory,
  loadChatHistory,
  clearChatHistory
} from "@/lib/chat-storage";

interface AIChatProps {
  tree: FileTree;
  onTreeUpdate: (tree: FileTree) => void;
  onFileOpen: (file: FileLeaf) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const AIChat = ({ tree, onTreeUpdate, onFileOpen, isOpen, onToggle }: AIChatProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load chat history on component mount
    const savedMessages = loadChatHistory();
    if (savedMessages.length > 0) {
      return savedMessages;
    }
    // Return welcome message if no saved history
    return [
      {
        id: "welcome",
        content: "Hello! I'm your SkriptLang assistant powered by Gemini AI. I can help you create folders, files, and write code. Try saying things like:\n\n• \"Create a folder called 'commands'\"\n• \"Create a file called 'teleport.sk' with basic teleport command\"\n• \"Write a simple join event script\"\n\nFirst, I'll need your Gemini API key to provide intelligent responses.",
        role: "assistant",
        timestamp: new Date()
      }
    ];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(() => getGeminiApiKey());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (!apiKey) {
      setShowApiKeyDialog(true);
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: text.trim(),
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Pass current messages as context to the AI
      const response = await processAICommand(
        text.trim(),
        tree,
        onTreeUpdate,
        onFileOpen,
        apiKey,
        messages // Pass chat history for context
      );
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: response,
        role: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error processing AI command:", error);

      let errorContent = "I'm sorry, I encountered an error processing your request.";
      let toastDescription = "Failed to process your request. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("Invalid API key")) {
          errorContent = "❌ Invalid API key. Please check your Gemini API key and try again.";
          toastDescription = "Invalid API key. Please update your API key.";
        } else if (error.message.includes("403")) {
          errorContent = "❌ API access denied. Please verify your Gemini API key has the necessary permissions.";
          toastDescription = "API access denied. Check your API key permissions.";
        } else if (error.message.includes("429")) {
          errorContent = "❌ Rate limit exceeded. Please wait a moment and try again.";
          toastDescription = "Rate limit exceeded. Please wait and try again.";
        } else if (error.message.includes("500")) {
          errorContent = "❌ Gemini API server error. This might be a temporary issue. Please try again in a few moments.";
          toastDescription = "Server error. Please try again in a few moments.";
        } else {
          errorContent = `❌ Error: ${error.message}`;
          toastDescription = error.message;
        }
      }

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: errorContent,
        role: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "Error",
        description: toastDescription,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (apiKeyInput.trim()) {
      // Test the API key before saving
      toast({
        title: "Testing API Key",
        description: "Validating your Gemini API key..."
      });

      const isValid = await testGeminiApiKey(apiKeyInput.trim());

      if (isValid) {
        setGeminiApiKey(apiKeyInput.trim());
        setApiKey(apiKeyInput.trim());
        setApiKeyInput("");
        setShowApiKeyDialog(false);
        toast({
          title: "API Key Saved",
          description: "Your Gemini API key has been validated and saved locally."
        });
      } else {
        toast({
          title: "Invalid API Key",
          description: "The API key you entered is not valid. Please check and try again.",
          variant: "destructive"
        });
      }
    }
  };

  const clearMessages = () => {
    setMessages([
      {
        id: "welcome",
        content: "Hello! I'm your SkriptLang assistant powered by Gemini AI. I can help you create folders, files, and write code. Try saying things like:\n\n• \"Create a folder called 'commands'\"\n• \"Create a file called 'teleport.sk' with basic teleport command\"\n• \"Write a simple join event script\"\n\nFirst, I'll need your Gemini API key to provide intelligent responses.",
        role: "assistant",
        timestamp: new Date()
      }
    ]);
    clearChatHistory(); // Also clear from localStorage
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src="/panda3.png" alt="AI" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <h2 className="font-semibold">AI Assistant</h2>
          {!apiKey && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowApiKeyDialog(true)}
              className="text-orange-500 hover:text-orange-600"
            >
              <Key className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 overflow-auto">
        <div className="space-y-4" ref={scrollRef}>
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-fade-in ${message.role === "user" ? "justify-end" : ""}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src="/panda3.png" alt="AI" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[85%] p-3 rounded-lg ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-muted"
              }`}>
                {message.role === "assistant" ? (
                  <MarkdownRenderer
                    content={message.content}
                    className="text-sm [&>*:last-child]:mb-0"
                  />
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                )}
                <div className={`text-xs mt-1 opacity-70`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src="" alt="You" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 animate-scale-in">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src="/panda3.png" alt="AI" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Input */}
      <ChatBar
        hasApiKey={!!apiKey}
        isLoading={isLoading}
        onSend={handleSend}
        onRequestApiKey={() => setShowApiKeyDialog(true)}
      />

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Enter Gemini API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              To use AI features, please enter your Google Gemini API key. Your key will be stored locally in your browser.
            </div>
            <div>
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your Gemini API key..."
                autoFocus
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google AI Studio
              </a>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveApiKey} disabled={!apiKeyInput.trim()}>
              Save API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

