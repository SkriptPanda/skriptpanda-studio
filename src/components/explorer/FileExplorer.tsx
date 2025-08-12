import { ChevronDown, ChevronRight, File as FileIcon, Folder, FolderOpen, MoreVertical, Plus } from "lucide-react";
import { useState } from "react";
import { FileNode, FileLeaf, FolderNode, isFile, isFolder } from "@/lib/fs";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type FileExplorerProps = {
  root: FolderNode;
  onCreateFile: (parentId: string) => void;
  onCreateFolder: (parentId: string) => void;
  onOpenFile: (file: FileLeaf) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string) => void;
  onMove: (sourceId: string, targetId: string, position: "inside" | "before" | "after") => void;
  selectedId?: string | null;
};

function NodeRow({
  node,
  depth,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onMove,
  selectedId,
}: {
  node: FileNode;
  depth: number;
  onOpenFile: (f: FileLeaf) => void;
  onCreateFile: (parentId: string) => void;
  onCreateFolder: (parentId: string) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string) => void;
  onMove: (sourceId: string, targetId: string, position: "inside" | "before" | "after") => void;
  selectedId?: string | null;
}) {
  const [open, setOpen] = useState(true);
  const padding = 8 + depth * 12;

  const common = "flex items-center justify-between w-full text-sm hover:bg-muted/60 rounded px-1 py-0.5";
  const isSelected = selectedId === node.id;

  if (isFolder(node)) {
    return (
      <div>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={`${common} ${isSelected ? "bg-muted" : ""}`}
              style={{ paddingLeft: padding }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", node.id);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const sourceId = e.dataTransfer.getData("text/plain");
                if (sourceId) onMove(sourceId, node.id, "inside");
              }}
            >
              <button
                className="flex items-center gap-1 flex-1 text-left"
                onClick={() => setOpen((o) => !o)}
                aria-label={`Toggle ${node.name}`}
              >
                {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {open ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                <span className="ml-1 truncate">{node.name}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onCreateFile(node.id)}>New File</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateFolder(node.id)}>New Folder</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRename(node.id, node.name)}>Rename</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(node.id)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-40 z-50">
            <ContextMenuItem onClick={() => onCreateFile(node.id)}>New File</ContextMenuItem>
            <ContextMenuItem onClick={() => onCreateFolder(node.id)}>New Folder</ContextMenuItem>
            <ContextMenuItem onClick={() => onRename(node.id, node.name)}>Rename</ContextMenuItem>
            <ContextMenuItem onClick={() => onDelete(node.id)}>Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        {open && (
          <div>
            {node.children.map((child) => (
              <NodeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                onOpenFile={onOpenFile}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onRename={onRename}
                onDelete={onDelete}
                onMove={onMove}
                selectedId={selectedId}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`${common} ${isSelected ? "bg-muted" : ""}`}
          style={{ paddingLeft: padding }}
          onClick={() => isFile(node) && onOpenFile(node)}
          role="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", node.id);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const sourceId = e.dataTransfer.getData("text/plain");
            if (sourceId) onMove(sourceId, node.id, "before");
          }}
        >
          <div className="flex items-center gap-2">
            <FileIcon className="h-4 w-4" />
            <span className="truncate">{node.name}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onRename(node.id, node.name)}>Rename</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(node.id)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-40 z-50">
        <ContextMenuItem onClick={() => onOpenFile(node)}>Open</ContextMenuItem>
        <ContextMenuItem onClick={() => onRename(node.id, node.name)}>Rename</ContextMenuItem>
        <ContextMenuItem onClick={() => onDelete(node.id)}>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function FileExplorer({ root, onCreateFile, onCreateFolder, onOpenFile, onRename, onDelete, onMove, selectedId }: FileExplorerProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-2 border-b">
        <div className="text-xs font-medium tracking-wider uppercase">Explorer</div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onCreateFile(root.id)} title="New File">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onCreateFolder(root.id)} title="New Folder">
            <Folder className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-1">
        <NodeRow
          node={root}
          depth={0}
          onOpenFile={onOpenFile}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onRename={onRename}
          onDelete={onDelete}
          onMove={onMove}
          selectedId={selectedId}
        />
      </div>
    </div>
  );
}
