import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, AlertCircle, Send } from "lucide-react";
import type { KeyboardEventHandler } from "react";

export type ChatBarProps = {
  isLoading?: boolean;
  hasApiKey: boolean;
  onSend: (text: string) => void;
  onRequestApiKey: () => void;
  placeholder?: string;
};

export const ChatBar = ({
  isLoading = false,
  hasApiKey,
  onSend,
  onRequestApiKey,
  placeholder = "Ask me to create files or folders...",
}: ChatBarProps) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (!hasApiKey) {
      onRequestApiKey();
      return;
    }
    onSend(text);
    setInput("");
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4">
      {!hasApiKey && (
        <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>API key required for AI responses</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRequestApiKey}
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
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
        />
        <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="sm">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
