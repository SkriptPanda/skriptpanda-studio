import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { FileExplorer } from "@/components/explorer/FileExplorer";
import { FileLeaf, FileTree } from "@/lib/fs";

export type AppSidebarProps = {
  tree: FileTree;
  onCreateFile: (parentId: string) => void;
  onCreateFolder: (parentId: string) => void;
  onOpenFile: (file: FileLeaf) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string) => void;
  onMove: (sourceId: string, targetId: string, position: "inside" | "before" | "after") => void;
  selectedId?: string | null;
};

export function AppSidebar({ tree, onCreateFile, onCreateFolder, onOpenFile, onRename, onDelete, onMove, selectedId }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <FileExplorer
          root={tree}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onOpenFile={onOpenFile}
          onRename={onRename}
          onDelete={onDelete}
          onMove={onMove}
          selectedId={selectedId}
        />
      </SidebarContent>
    </Sidebar>
  );
}
