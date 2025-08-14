import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Key, Bot, User, Loader2 } from "lucide-react";
import { FileTree, FileLeaf } from "@/lib/fs";
import { getGeminiApiKey, setGeminiApiKey } from "@/lib/gemini";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { useToast } from "@/components/ui/use-toast";
import { ChatBar } from "@/components/chat/ChatBar";
import { AIAgent, AIAgentConfig } from "@/lib/ai-agent";
import {
  Message,
  saveChatHistory,
  loadChatHistory,
  clearChatHistory
} from "@/lib/chat-storage";

interface NewAIChatProps {
  tree: FileTree;
  onTreeUpdate: (tree: FileTree) => void;
  onFileOpen: (file: FileLeaf) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const NewAIChat = ({ tree, onTreeUpdate, onFileOpen, isOpen, onToggle }: NewAIChatProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = loadChatHistory();
    return savedMessages || [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(() => {
    const key = getGeminiApiKey();
    console.log("🔑 Loading API key from localStorage:", key ? "Found" : "Not found");
    return key;
  });
  const [aiAgent, setAiAgent] = useState<AIAgent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize AI Agent when API key is available
  useEffect(() => {
    console.log("🔑 API key state changed:", apiKey ? "Has key" : "No key");
    if (apiKey) {
      console.log("🤖 Initializing AI Agent...");
      const config: AIAgentConfig = {
        apiKey,
        useGoogleSearch: true,
        maxTokens: 8192,
        temperature: 0.7
      };
      setAiAgent(new AIAgent(config));
      console.log("✅ AI Agent initialized");
    } else {
      console.log("❌ No API key, clearing AI Agent");
      setAiAgent(null);
    }
  }, [apiKey]);

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
      if (!aiAgent) {
        throw new Error("AI Agent not initialized");
      }

      console.log("🤖 Processing request with AI Agent...");
      
      // Process the request with the AI Agent
      const response = await aiAgent.processRequest(
        text.trim(),
        tree,
        onTreeUpdate,
        onFileOpen
      );

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: response.message,
        role: "assistant",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show success toast if files were created
      if (response.operations.length > 0) {
        const createdFiles = response.operations.filter(op => op.type === 'create' && op.path.endsWith('.sk'));
        const createdFolders = response.operations.filter(op => op.type === 'create' && !op.path.includes('.'));
        
        if (createdFiles.length > 0 || createdFolders.length > 0) {
          toast({
            title: "✅ Success!",
            description: `Created ${createdFiles.length} file(s) and ${createdFolders.length} folder(s)`,
          });
        }
      }

    } catch (error) {
      console.error("❌ Error processing AI request:", error);
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: `❌ **Error**: ${error instanceof Error ? error.message : 'Unknown error occurred'}

Please check your API key and try again.`,
        role: "assistant",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "❌ Error",
        description: "Failed to process your request. Please check your API key and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeySubmit = () => {
    if (!apiKeyInput.trim()) return;

    console.log("🔑 Setting API key:", apiKeyInput.trim().substring(0, 10) + "...");
    setApiKey(apiKeyInput.trim());
    setGeminiApiKey(apiKeyInput.trim());
    setShowApiKeyDialog(false);
    setApiKeyInput("");
    
    console.log("✅ API key set successfully");
    toast({
      title: "✅ API Key Set",
      description: "Your Gemini API key has been successfully configured!",
    });
  };

  const handleClearChat = () => {
    setMessages([]);
    clearChatHistory();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onToggle}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>AI Agent Chat</DialogTitle>
          <DialogDescription>Chat with the AI Agent for SkriptLang development assistance</DialogDescription>
        </DialogHeader>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">AI Agent</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              disabled={isLoading}
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex space-x-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <MarkdownRenderer content={message.content} />
                </div>

                {message.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex space-x-3 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* API Key Overlay */}
        {!apiKey && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-card border rounded-lg p-6 max-w-sm mx-4 text-center">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">API Key Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please add your Gemini API key to start using the AI Agent.
                <br />
                <span className="text-xs">Debug: API Key state is {apiKey ? "set" : "not set"}</span>
              </p>
              <Button onClick={() => setShowApiKeyDialog(true)}>
                Add API Key
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Input */}
        <div className="p-4">
          <ChatBar
            onSend={handleSend}
            disabled={isLoading || !apiKey}
            placeholder="Ask me anything about SkriptLang..."
          />
        </div>
      </DialogContent>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Enter Gemini API Key</span>
            </DialogTitle>
            <DialogDescription>
              Enter your Gemini API key to enable AI Agent functionality. Get your API key from Google AI Studio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Gemini API key"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={handleApiKeySubmit}
              disabled={!apiKeyInput.trim()}
            >
              Set API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};