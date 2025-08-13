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

interface AIChatProps {
  tree: FileTree;
  onTreeUpdate: (tree: FileTree) => void;
  onFileOpen: (file: FileLeaf) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const AIChat = ({ tree, onTreeUpdate, onFileOpen, isOpen, onToggle }: AIChatProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hello! I'm your SkriptLang assistant powered by Gemini AI. I can help you create folders, files, and write code. Try saying things like:\n\n• \"Create a folder called 'commands'\"\n• \"Create a file called 'teleport.sk' with basic teleport command\"\n• \"Write a simple join event script\"\n\nFirst, I'll need your Gemini API key to provide intelligent responses.",
      role: "assistant",
      timestamp: new Date()
    }
  ]);
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
      const response = await processAICommand(text.trim(), tree, onTreeUpdate, onFileOpen, apiKey);
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
        title: "API Key Saved",
        description: "Your Gemini API key has been saved locally."
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
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
        <Button variant="ghost" size="sm" onClick={onToggle}>
          <X className="h-4 w-4" />
        </Button>
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

