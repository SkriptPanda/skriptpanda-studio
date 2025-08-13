import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Send, Bot, User, X, Key, AlertCircle } from "lucide-react";
import { FileTree, createFile, createFolder, addChild, updateFileContent } from "@/lib/fs";
import { getGeminiApiKey, setGeminiApiKey, callGeminiAPI, GeminiMessage } from "@/lib/gemini";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface AIChatProps {
  tree: FileTree;
  onTreeUpdate: (tree: FileTree) => void;
  onFileOpen: (file: any) => void;
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
  const [input, setInput] = useState("");
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
      setShowApiKeyDialog(true);
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: input.trim(),
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await processAICommand(input.trim(), tree, onTreeUpdate, onFileOpen, apiKey);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 rounded-l-lg rounded-r-none bg-primary hover:bg-primary/90 animate-slide-in-right"
        size="sm"
      >
        <Bot className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-background border-l shadow-lg z-40 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
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
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div 
              key={message.id} 
              className={`flex gap-3 animate-fade-in ${message.role === "user" ? "justify-end" : ""}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
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
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 animate-scale-in">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
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
      <div className="p-4">
        {!apiKey && (
          <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>API key required for AI responses</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowApiKeyDialog(true)}
              className="ml-auto text-orange-600 hover:text-orange-700 p-1"
            >
              <Key className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to create files or folders..."
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="sm">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

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

// AI command processing using Gemini API
const processAICommand = async (
  input: string, 
  tree: FileTree, 
  onTreeUpdate: (tree: FileTree) => void,
  onFileOpen: (file: any) => void,
  apiKey: string
): Promise<string> => {
  const lowerInput = input.toLowerCase();

  // First handle direct file/folder creation commands
  if (lowerInput.includes("create") && lowerInput.includes("folder")) {
    const match = input.match(/folder.*?['""]([^'""]+)['""]|folder.*?([\w-]+)/i);
    if (match) {
      const folderName = match[1] || match[2];
      const folder = createFolder(folderName);
      const updatedTree = addChild(tree, tree.id, folder);
      onTreeUpdate(updatedTree);
      return `Created folder "${folderName}" successfully!`;
    }
    return "Please specify a folder name, like: 'Create a folder called commands'";
  }

  if (lowerInput.includes("create") && lowerInput.includes("file")) {
    const match = input.match(/file.*?['""]([^'""]+)['""]|file.*?([\w.-]+)/i);
    if (match) {
      const fileName = match[1] || match[2];
      try {
        const content = await generateFileContent(fileName, input, apiKey);
        const file = createFile(fileName, content);
        const updatedTree = addChild(tree, tree.id, file);
        onTreeUpdate(updatedTree);
        onFileOpen(file);
        return `Created file "${fileName}" with AI-generated content and opened it for you!`;
      } catch (error) {
        const basicContent = getBasicFileContent(fileName, input);
        const file = createFile(fileName, basicContent);
        const updatedTree = addChild(tree, tree.id, file);
        onTreeUpdate(updatedTree);
        onFileOpen(file);
        return `Created file "${fileName}" with basic content. (AI generation failed, but file was created successfully)`;
      }
    }
    return "Please specify a file name, like: 'Create a file called teleport.sk'";
  }

  // For other requests, use Gemini API to generate intelligent responses
  try {
    const messages: GeminiMessage[] = [
      {
        role: "user",
        parts: [{
          text: `You are a SkriptLang assistant. The user said: "${input}". 

If they want to create a specific script or need help with SkriptLang code, provide helpful code examples and explanations.

Current project structure context: The user has a file tree structure where they can create folders and .sk files for SkriptLang scripts.

Respond helpfully and concisely. If they're asking for a specific script, provide clean, working SkriptLang code.`
        }]
      }
    ];

    const response = await callGeminiAPI(messages, apiKey);
    
    // Check if the response suggests creating a file and do it automatically
    if (response.toLowerCase().includes("create") && response.toLowerCase().includes(".sk")) {
      const codeMatch = response.match(/```(?:skript|sk)?\n([\s\S]*?)\n```/);
      if (codeMatch) {
        const code = codeMatch[1];
        const fileName = extractFileNameFromResponse(response) || "generated-script.sk";
        const file = createFile(fileName, code);
        const updatedTree = addChild(tree, tree.id, file);
        onTreeUpdate(updatedTree);
        onFileOpen(file);
        return response + `\n\n✅ I've also created the file "${fileName}" for you with this code!`;
      }
    }
    
    return response;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "I'm having trouble connecting to the AI service. Please check your API key and internet connection.";
  }
};

const generateFileContent = async (fileName: string, prompt: string, apiKey: string): Promise<string> => {
  const messages: GeminiMessage[] = [
    {
      role: "user",
      parts: [{
        text: `Generate SkriptLang code for a file named "${fileName}" based on this request: "${prompt}".

Please provide clean, working SkriptLang code that follows best practices. Include appropriate comments and make sure the syntax is correct for SkriptLang.

Only respond with the code, no extra explanation text.`
      }]
    }
  ];

  const response = await callGeminiAPI(messages, apiKey);
  
  // Extract code from response if it's wrapped in code blocks
  const codeMatch = response.match(/```(?:skript|sk)?\n([\s\S]*?)\n```/);
  if (codeMatch) {
    return codeMatch[1];
  }
  
  return response;
};

const extractFileNameFromResponse = (response: string): string | null => {
  const fileMatch = response.match(/file.*?['""]([^'""]+\.sk)['""]|(\w+\.sk)/i);
  return fileMatch ? (fileMatch[1] || fileMatch[2]) : null;
};

const getBasicFileContent = (fileName: string, input: string): string => {
  const lowerInput = input.toLowerCase();
  
  if (fileName.endsWith('.sk')) {
    if (lowerInput.includes("teleport") || lowerInput.includes("tp")) {
      return `command /tp <player> <target>:
    permission: teleport.use
    trigger:
        teleport arg-1 to arg-2
        send "&aTeleported!" to sender`;
    }
    
    if (lowerInput.includes("heal")) {
      return `command /heal [player]:
    permission: heal.use
    trigger:
        if arg-1 is set:
            heal arg-1
            send "&aHealed %arg-1%!" to sender
        else:
            heal sender
            send "&aYou have been healed!" to sender`;
    }

    return `# New SkriptLang file
# Write your script here

on load:
    send "&aScript loaded successfully!" to console`;
  }
  
  return "# New file\n";
};