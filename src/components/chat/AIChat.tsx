import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, Bot, User, X } from "lucide-react";
import { FileTree, createFile, createFolder, addChild, updateFileContent } from "@/lib/fs";

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hello! I'm your SkriptLang assistant. I can help you create folders, files, and write code. Try saying things like:\n\n• \"Create a folder called 'commands'\"\n• \"Create a file called 'teleport.sk' with basic teleport command\"\n• \"Write a simple join event script\"",
      role: "assistant",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: input.trim(),
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI processing with file system operations
    setTimeout(() => {
      const response = processAICommand(input.trim(), tree, onTreeUpdate, onFileOpen);
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: response,
        role: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 rounded-l-lg rounded-r-none bg-primary hover:bg-primary/90"
        size="sm"
      >
        <Bot className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-background border-l shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">AI Assistant</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
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
            <div className="flex gap-3">
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
    </div>
  );
};

// Simple AI command processing
const processAICommand = (
  input: string, 
  tree: FileTree, 
  onTreeUpdate: (tree: FileTree) => void,
  onFileOpen: (file: any) => void
): string => {
  const lowerInput = input.toLowerCase();

  // Create folder
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

  // Create file
  if (lowerInput.includes("create") && lowerInput.includes("file")) {
    const match = input.match(/file.*?['""]([^'""]+)['""]|file.*?([\w.-]+)/i);
    if (match) {
      const fileName = match[1] || match[2];
      const content = getFileContent(fileName, input);
      const file = createFile(fileName, content);
      const updatedTree = addChild(tree, tree.id, file);
      onTreeUpdate(updatedTree);
      onFileOpen(file);
      return `Created file "${fileName}" and opened it for you!`;
    }
    return "Please specify a file name, like: 'Create a file called teleport.sk'";
  }

  // Write specific scripts
  if (lowerInput.includes("join event") || lowerInput.includes("on join")) {
    const content = `on join:
    send "&aWelcome to the server, %player%!" to player
    play sound "entity.player.levelup" to player`;
    
    const file = createFile("join-event.sk", content);
    const updatedTree = addChild(tree, tree.id, file);
    onTreeUpdate(updatedTree);
    onFileOpen(file);
    return "Created a join event script for you!";
  }

  if (lowerInput.includes("teleport") && lowerInput.includes("command")) {
    const content = `command /tp <player> <target>:
    permission: teleport.use
    trigger:
        if arg-1 is set:
            if arg-2 is set:
                teleport arg-1 to arg-2
                send "&aTeleported %arg-1% to %arg-2%!" to sender
            else:
                send "&cUsage: /tp <player> <target>" to sender
        else:
            send "&cUsage: /tp <player> <target>" to sender`;
    
    const file = createFile("teleport.sk", content);
    const updatedTree = addChild(tree, tree.id, file);
    onTreeUpdate(updatedTree);
    onFileOpen(file);
    return "Created a teleport command script for you!";
  }

  // Default responses
  const responses = [
    "I can help you create folders and files! Try asking me to 'create a folder called commands' or 'create a file called example.sk'.",
    "I'm here to help with your SkriptLang projects. What would you like me to create?",
    "You can ask me to create files with specific content, like 'write a simple join event script'.",
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

const getFileContent = (fileName: string, input: string): string => {
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