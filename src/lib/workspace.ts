import { Workspace, WorkspaceManager } from "@/types/workspace";
import { DEFAULT_TREE, FileTree } from "./fs";

const WORKSPACE_STORAGE_KEY = "skriptpanda-workspaces";
const ACTIVE_WORKSPACE_KEY = "skriptpanda-active-workspace";

export const saveWorkspaces = (manager: WorkspaceManager) => {
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(manager));
};

export const loadWorkspaces = (): WorkspaceManager => {
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) {
      const defaultWorkspace = createDefaultWorkspace();
      const manager = {
        workspaces: [defaultWorkspace],
        activeWorkspaceId: defaultWorkspace.id
      };
      saveWorkspaces(manager);
      return manager;
    }
    const manager = JSON.parse(raw) as WorkspaceManager;
    // Convert date strings back to Date objects
    manager.workspaces = manager.workspaces.map(ws => ({
      ...ws,
      createdAt: new Date(ws.createdAt),
      lastAccessed: new Date(ws.lastAccessed)
    }));
    return manager;
  } catch {
    const defaultWorkspace = createDefaultWorkspace();
    const manager = {
      workspaces: [defaultWorkspace],
      activeWorkspaceId: defaultWorkspace.id
    };
    saveWorkspaces(manager);
    return manager;
  }
};

export const createWorkspace = (name: string, description?: string): Workspace => {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    createdAt: new Date(),
    lastAccessed: new Date(),
    tree: DEFAULT_TREE
  };
};

export const createDefaultWorkspace = (): Workspace => {
  return createWorkspace("Default Workspace", "Your first SkriptPanda workspace");
};

export const updateWorkspaceTree = (manager: WorkspaceManager, workspaceId: string, tree: FileTree): WorkspaceManager => {
  const updated = {
    ...manager,
    workspaces: manager.workspaces.map(ws => 
      ws.id === workspaceId 
        ? { ...ws, tree, lastAccessed: new Date() }
        : ws
    )
  };
  saveWorkspaces(updated);
  return updated;
};

export const addWorkspace = (manager: WorkspaceManager, workspace: Workspace): WorkspaceManager => {
  const updated = {
    ...manager,
    workspaces: [...manager.workspaces, workspace]
  };
  saveWorkspaces(updated);
  return updated;
};

export const deleteWorkspace = (manager: WorkspaceManager, workspaceId: string): WorkspaceManager => {
  if (manager.workspaces.length <= 1) {
    throw new Error("Cannot delete the last workspace");
  }
  
  const updated = {
    ...manager,
    workspaces: manager.workspaces.filter(ws => ws.id !== workspaceId),
    activeWorkspaceId: manager.activeWorkspaceId === workspaceId 
      ? manager.workspaces.find(ws => ws.id !== workspaceId)?.id || null
      : manager.activeWorkspaceId
  };
  saveWorkspaces(updated);
  return updated;
};

export const switchWorkspace = (manager: WorkspaceManager, workspaceId: string): WorkspaceManager => {
  const updated = {
    ...manager,
    activeWorkspaceId: workspaceId,
    workspaces: manager.workspaces.map(ws => 
      ws.id === workspaceId 
        ? { ...ws, lastAccessed: new Date() }
        : ws
    )
  };
  saveWorkspaces(updated);
  return updated;
};