import { useEffect, useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { EditorPane } from "@/components/editor/EditorPane";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useEarlyAccess } from "@/hooks/useEarlyAccess";
import { Download, X, Home, LogOut } from "lucide-react";
import {
  FileLeaf,
  FileNode,
  FileTree,
  addChild,
  createFile,
  createFolder,
  findNode,
  loadTree,
  removeNode,
  renameNode,
  saveTree,
  updateFileContent,
  moveNode,
} from "@/lib/fs";
import { exportTreeAsZip } from "@/lib/zip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { WorkspaceDashboard } from "@/components/workspace/WorkspaceDashboard";
import { loadWorkspaces, switchWorkspace, updateWorkspaceTree } from "@/lib/workspace";
import { WorkspaceManager } from "@/types/workspace";

const Index = () => {
  const { logout } = useEarlyAccess();
  const [workspaceManager, setWorkspaceManager] = useState<WorkspaceManager>(() => loadWorkspaces());
  const [showDashboard, setShowDashboard] = useState(true);
  const [tree, setTree] = useState<FileTree>(() => {
    const activeWorkspace = workspaceManager.workspaces.find(ws => ws.id === workspaceManager.activeWorkspaceId);
    return activeWorkspace?.tree || loadTree();
  });
  const [openTabs, setOpenTabs] = useState<FileLeaf[]>(() => {
    try {
      const workspaceId = workspaceManager.activeWorkspaceId;
      const saved = localStorage.getItem(`skriptpanda.openTabs.${workspaceId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    const workspaceId = workspaceManager.activeWorkspaceId;
    return localStorage.getItem(`skriptpanda.activeFileId.${workspaceId}`) || null;
  });
  const [mode, setMode] = useState<string>(() => localStorage.getItem("skriptpanda.theme") || "sp-dark");
  const [cursor, setCursor] = useState({ line: 1, column: 1 });

  // Ensure theme is properly applied on mount and synchronized
  useEffect(() => {
    const savedTheme = localStorage.getItem("skriptpanda.theme") || "sp-dark";
    if (mode !== savedTheme) {
      setMode(savedTheme);
    }

    // Force apply theme to ensure synchronization
    const themes = [
      { key: "sp-dark", dark: true },
      { key: "sp-light", dark: false },
      { key: "dracula", dark: true },
      { key: "solarized", dark: false },
    ];

    const theme = themes.find(t => t.key === savedTheme) || themes[0];
    document.body.classList.remove(...themes.map(t => `theme-${t.key}`), "dark");
    document.body.classList.add(`theme-${theme.key}`);
    if (theme.dark) document.body.classList.add("dark");
  }, []);

  // Dialog states
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renameState, setRenameState] = useState<{ id: string; name: string } | null>(null);
  const [createState, setCreateState] = useState<{ parentId: string; type: "file" | "folder"; name: string } | null>(null);

  useEffect(() => {
    setWorkspaceManager((prev) => {
      if (prev.activeWorkspaceId) {
        return updateWorkspaceTree(prev, prev.activeWorkspaceId, tree);
      }
      return prev;
    });
    saveTree(tree);
  }, [tree]);

  // Save open tabs to localStorage whenever they change
  useEffect(() => {
    const workspaceId = workspaceManager.activeWorkspaceId;
    if (workspaceId) {
      localStorage.setItem(`skriptpanda.openTabs.${workspaceId}`, JSON.stringify(openTabs));
    }
  }, [openTabs, workspaceManager.activeWorkspaceId]);

  // Save active file ID to localStorage whenever it changes
  useEffect(() => {
    const workspaceId = workspaceManager.activeWorkspaceId;
    if (workspaceId) {
      if (activeId) {
        localStorage.setItem(`skriptpanda.activeFileId.${workspaceId}`, activeId);
      } else {
        localStorage.removeItem(`skriptpanda.activeFileId.${workspaceId}`);
      }
    }
  }, [activeId, workspaceManager.activeWorkspaceId]);


  const activeFile = useMemo(() => openTabs.find((t) => t.id === activeId) ?? null, [openTabs, activeId]);

  const handleOpenFile = (file: FileLeaf) => {
    setOpenTabs((tabs) => {
      const exists = tabs.some((t) => t.id === file.id);
      return exists ? tabs : [...tabs, file];
    });
    setActiveId(file.id);
  };

  const createIn = (parentId: string, folder: boolean) => {
    const defaultName = folder ? "new-folder" : "new-file.sk";
    setCreateState({ parentId, type: folder ? "folder" : "file", name: defaultName });
  };

  const handleRename = (id: string, current: string) => {
    setRenameState({ id, name: current });
  };

  const handleDelete = (id: string) => {
    setConfirmDelete(id);
  };

  const handleChange = (value: string) => {
    if (!activeFile) return;
    setOpenTabs((tabs) => tabs.map((t) => (t.id === activeFile.id ? { ...t, content: value } : t)));
    setTree((t) => updateFileContent(t, activeFile.id, value));
  };

  const closeTab = (id: string) => {
    setOpenTabs((tabs) => {
      const idx = tabs.findIndex((t) => t.id === id);
      const next = tabs.filter((t) => t.id !== id);
      if (activeId === id) {
        const newActive = next[idx - 1] ?? next[idx] ?? null;
        setActiveId(newActive?.id ?? null);
      }
      return next;
    });
  };

  const selectTab = (id: string) => setActiveId(id);

  const handleExport = async () => {
    const activeWorkspace = workspaceManager.workspaces.find(ws => ws.id === workspaceManager.activeWorkspaceId);
    const fileName = activeWorkspace ? `${activeWorkspace.name.replace(/\s+/g, '-')}-workspace.zip` : "skriptpanda-workspace.zip";
    await exportTreeAsZip(tree, fileName);
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    const updatedManager = switchWorkspace(workspaceManager, workspaceId);
    setWorkspaceManager(updatedManager);
    const workspace = updatedManager.workspaces.find(ws => ws.id === workspaceId);
    if (workspace) {
      setTree(workspace.tree);

      // Load saved state for the new workspace
      try {
        const savedTabs = localStorage.getItem(`skriptpanda.openTabs.${workspaceId}`);
        const savedActiveId = localStorage.getItem(`skriptpanda.activeFileId.${workspaceId}`);

        if (savedTabs) {
          const tabs = JSON.parse(savedTabs);
          // Validate that saved tabs still exist in the workspace tree
          const validTabs = tabs.filter((tab: FileLeaf) => findNode(workspace.tree, tab.id));
          setOpenTabs(validTabs);

          if (savedActiveId && validTabs.some((tab: FileLeaf) => tab.id === savedActiveId)) {
            setActiveId(savedActiveId);
          } else if (validTabs.length > 0) {
            setActiveId(validTabs[0].id);
          } else {
            setActiveId(null);
          }
        } else {
          setOpenTabs([]);
          setActiveId(null);
        }
      } catch {
        setOpenTabs([]);
        setActiveId(null);
      }
    }
    setShowDashboard(false);
  };

  const handleTreeUpdate = (newTree: FileTree) => {
    setTree(newTree);
  };

  // Restore last opened files and validate they still exist in the tree
  useEffect(() => {
    // Validate that saved tabs still exist in the current tree
    const validTabs = openTabs.filter(tab => findNode(tree, tab.id));
    if (validTabs.length !== openTabs.length) {
      setOpenTabs(validTabs);
    }

    // Validate that active file still exists
    if (activeId && !findNode(tree, activeId)) {
      setActiveId(validTabs[0]?.id || null);
    }

    // If no tabs are open, open a default file
    if (validTabs.length === 0) {
      const scriptsFolder = tree.children.find((c) => c.type === "folder") as FileNode | undefined;
      if (scriptsFolder && scriptsFolder.type === "folder" && scriptsFolder.children[0] && scriptsFolder.children[0].type === "file") {
        handleOpenFile(scriptsFolder.children[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (showDashboard) {
    return (
      <WorkspaceDashboard
        manager={workspaceManager}
        onSelectWorkspace={handleSelectWorkspace}
        onUpdateManager={setWorkspaceManager}
      />
    );
  }

  return (
    <SidebarProvider>
      {/* Accessible SEO H1 */}
      <h1 className="sr-only">SkriptPanda IDE - SkriptLang Editor</h1>
      <div className="min-h-screen flex w-full relative">
        <AppSidebar
          tree={tree}
          onCreateFile={(id) => createIn(id, false)}
          onCreateFolder={(id) => createIn(id, true)}
          onOpenFile={handleOpenFile}
          onRename={handleRename}
          onDelete={handleDelete}
          onMove={(sourceId, targetId, position) => setTree((t) => moveNode(t, sourceId, targetId, position))}
          selectedId={activeId}
        />
        <SidebarInset 
          className="flex-1 transition-all duration-300"
          style={{
            width: '100%',
            maxWidth: '100%'
          }}
        >
          {/* Top bar */}
          <header className="h-12 border-b flex items-center justify-between px-3 bg-gradient-to-r from-background via-background/80 to-background/60">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDashboard(true)}
                className="gap-1"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
              <div className="font-semibold tracking-tight text-sm select-none">
                SkriptPanda<span style={{ color: "hsl(var(--brand-orange))" }}>.</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="default" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" /> Export Zip
              </Button>
              <ThemeSwitcher onModeChange={setMode} />
              <Button
                size="sm"
                variant="outline"
                onClick={logout}
                title="Logout from Early Access"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Tabs */}
          <div className="h-9 border-b flex items-stretch overflow-x-auto">
            {openTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={`h-full px-3 flex items-center gap-2 border-r text-sm ${
                  activeId === tab.id ? "bg-muted text-foreground" : "hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <span className="truncate max-w-[220px]">{tab.name}</span>
                <X className="h-3.5 w-3.5" onClick={(e) => (e.stopPropagation(), closeTab(tab.id))} />
              </button>
            ))}
          </div>

          {/* Editor - Full Width */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <EditorPane file={activeFile} onChange={handleChange} themeKey={mode} onCursorChange={setCursor} />
          </div>

          {/* Status bar */}
          <footer className="h-7 border-t text-xs flex items-center justify-between px-3 text-muted-foreground">
            <div>Ln {cursor.line}, Col {cursor.column}</div>
            <div>SkriptLang • Monaco • {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')}</div>
          </footer>
        </SidebarInset>
      </div>

      {/* AI Chat moved into ResizablePanelGroup beside the editor */}

      {/* Create Dialog */}
      <Dialog open={!!createState} onOpenChange={(o) => !o && setCreateState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createState?.type === "folder" ? "New Folder" : "New File"}</DialogTitle>
            <DialogDescription>Enter a name for the {createState?.type}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              value={createState?.name ?? ""}
              onChange={(e) => setCreateState((s) => (s ? { ...s, name: e.target.value } : s))}
              placeholder={createState?.type === "folder" ? "new-folder" : "new-file.sk"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateState(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!createState) return;
                const { parentId, type, name } = createState;
                if (!name.trim()) return;
                const node = type === "folder" ? createFolder(name) : createFile(name, type === "file" ? "# New Skript file\n" : "");
                setTree((t) => addChild(t, parentId, node));
                setCreateState(null);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameState} onOpenChange={(o) => !o && setRenameState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>Enter a new name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              value={renameState?.name ?? ""}
              onChange={(e) => setRenameState((s) => (s ? { ...s, name: e.target.value } : s))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameState(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!renameState) return;
                const { id, name } = renameState;
                if (!name.trim()) return;
                setTree((t) => renameNode(t, id, name));
                setOpenTabs((tabs) => tabs.map((tab) => (tab.id === id ? { ...tab, name } : tab)));
                setRenameState(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmDelete) return;
                const id = confirmDelete;
                setTree((t) => removeNode(t, id));
                setOpenTabs((tabs) => tabs.filter((t) => t.id !== id));
                if (activeId === id) setActiveId(null);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </SidebarProvider>
  );
};

export default Index;
