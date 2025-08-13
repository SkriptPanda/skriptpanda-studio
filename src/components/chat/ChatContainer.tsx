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

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

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
  
  // Independent state management for chat
  const [messages, setMessages] = useState<Message[]>([]);
  
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
      // Show search indicator
      const searchMessage: Message = {
        id: crypto.randomUUID(),
        content: "🔍 Researching current SkriptLang documentation and best practices...",
        role: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, searchMessage]);

      const response = await processAICommand(text.trim(), tree, onTreeUpdate, onFileOpen, apiKey);

      // Remove search indicator and add actual response
      setMessages(prev => prev.filter(msg => msg.id !== searchMessage.id));

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: response,
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
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
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
