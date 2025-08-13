export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  lastAccessed: Date;
  tree: any; // FileTree type from fs.ts
}

export interface WorkspaceManager {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
}