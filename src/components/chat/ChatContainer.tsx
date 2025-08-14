import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Key } from "lucide-react";
import { FileTree, FileLeaf } from "@/lib/fs";
import { getGeminiApiKey, setGeminiApiKey } from "@/lib/gemini";
import { useToast } from "@/components/ui/use-toast";
import { ChatBar } from "@/components/chat/ChatBar";
import { processAICommand } from "@/lib/ai-commands";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
  Message,
  saveChatHistory,
  loadChatHistory,
  clearChatHistory,
  formatMessagesForAI
} from "@/lib/chat-storage";

interface ChatContainerProps {
  tree: FileTree;
  onTreeUpdate: (tree: FileTree) => void;
  onFileOpen: (file: FileLeaf) => void;
  onClose: () => void;
  className?: string;
}

export const ChatContainer = ({ 
  tree, 
  onTreeUpdate, 
  onFileOpen, 
  onClose,
  className = ""
}: ChatContainerProps) => {
  const { toast } = useToast();
  
  // Independent state management for chat with persistence
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load chat history on component mount
    const savedMessages = loadChatHistory();
    return savedMessages.length > 0 ? savedMessages : [];
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(() => getGeminiApiKey());
  
  // Independent scroll management
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Auto-scroll to bottom when new messages arrive
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

  // Save scroll position when scrolling manually
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollPosition(scrollRef.current.scrollTop);
    }
  }, []);

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

      console.log("🎯 AI Response received in ChatContainer:");
      console.log("📝 Response type:", typeof response);
      console.log("📝 Response length:", response?.length || 0);
      console.log("📝 Response content:", response?.substring(0, 100) + "...");

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: response || "I apologize, but I received an empty response. Please try again.",
        role: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error processing AI command:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: "I'm sorry, I encountered an error processing your request. Please check your API key and try again.",
        role: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setGeminiApiKey(apiKeyInput.trim());
      setApiKey(apiKeyInput.trim());
      setApiKeyInput("");
      setShowApiKeyDialog(false);
      toast({
        title: "Success",
        description: "API key saved successfully!"
      });
    }
  };

  const clearMessages = () => {
    setMessages([]);
    clearChatHistory(); // Also clear from localStorage
  };

  return (
    <div className={`flex flex-col h-full w-full bg-background overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0 bg-muted/30">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src="/panda3.png" alt="AI" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h2 className="font-semibold">AI Assistant</h2>
            <div className="text-xs text-muted-foreground">
              Press <kbd className="px-1 py-0.5 text-xs bg-background rounded">Ctrl+L</kbd> to toggle
            </div>
          </div>
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
        </div>
      </div>

      {/* Messages - Independent scroll container */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div
            className="p-4 space-y-4"
            ref={scrollRef}
            onScroll={handleScroll}
            style={{
              scrollBehavior: 'smooth' as const,
              overscrollBehavior: 'contain' as const
            }}
          >
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
      </div>

      <Separator />

      {/* Input - Fixed at bottom */}
      <div className="flex-shrink-0">
        <ChatBar
          hasApiKey={!!apiKey}
          isLoading={isLoading}
          onSend={handleSend}
          onRequestApiKey={() => setShowApiKeyDialog(true)}
        />
      </div>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Gemini API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="apikey">API Key</Label>
              <Input
                id="apikey"
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your Gemini API key..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveApiKey}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
