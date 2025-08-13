import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { FileTree, FileLeaf } from "@/lib/fs";

interface ChatPopupProps {
  tree: FileTree;
  onTreeUpdate: (tree: FileTree) => void;
  onFileOpen: (file: FileLeaf) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatPopup = ({ 
  tree, 
  onTreeUpdate, 
  onFileOpen, 
  isOpen, 
  onClose 
}: ChatPopupProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="chat-popup-content w-[800px] h-[600px] max-w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden border shadow-2xl"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          margin: 0,
          zIndex: 50
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>AI Chat Assistant</DialogTitle>
        </DialogHeader>
        <div className="h-full w-full overflow-hidden">
          <ChatContainer
            tree={tree}
            onTreeUpdate={onTreeUpdate}
            onFileOpen={onFileOpen}
            onClose={onClose}
            className="h-full border-0 rounded-lg overflow-hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
