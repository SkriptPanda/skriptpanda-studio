import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Workspace, WorkspaceManager } from "@/types/workspace";
import { createWorkspace, deleteWorkspace } from "@/lib/workspace";
import { Plus, Trash2, FolderOpen } from "lucide-react";

interface WorkspaceDashboardProps {
  manager: WorkspaceManager;
  onSelectWorkspace: (workspaceId: string) => void;
  onUpdateManager: (manager: WorkspaceManager) => void;
}

export const WorkspaceDashboard = ({ manager, onSelectWorkspace, onUpdateManager }: WorkspaceDashboardProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(null);
  const [newWorkspace, setNewWorkspace] = useState({ name: "", description: "" });

  const handleCreateWorkspace = () => {
    if (!newWorkspace.name.trim()) return;
    
    const workspace = createWorkspace(newWorkspace.name.trim(), newWorkspace.description.trim() || undefined);
    const updatedManager = {
      ...manager,
      workspaces: [...manager.workspaces, workspace]
    };
    onUpdateManager(updatedManager);
    setNewWorkspace({ name: "", description: "" });
    setShowCreateDialog(false);
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    try {
      const updatedManager = deleteWorkspace(manager, workspaceId);
      onUpdateManager(updatedManager);
      setDeleteWorkspaceId(null);
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">SkriptPanda Workspaces</h1>
            <p className="text-muted-foreground mt-2">Manage your SkriptLang projects</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Workspace
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {manager.workspaces.map((workspace) => (
            <Card key={workspace.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{workspace.name}</CardTitle>
                    {workspace.description && (
                      <CardDescription className="mt-1">{workspace.description}</CardDescription>
                    )}
                  </div>
                  {manager.workspaces.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteWorkspaceId(workspace.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>Created: {formatDate(workspace.createdAt)}</div>
                  <div>Last accessed: {formatDate(workspace.lastAccessed)}</div>
                </div>
                <Button 
                  className="w-full mt-4 gap-2"
                  onClick={() => onSelectWorkspace(workspace.id)}
                >
                  <FolderOpen className="h-4 w-4" />
                  Open Workspace
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="workspace-name">Name</Label>
              <Input
                id="workspace-name"
                value={newWorkspace.name}
                onChange={(e) => setNewWorkspace(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Project"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="workspace-description">Description (optional)</Label>
              <Textarea
                id="workspace-description"
                value={newWorkspace.description}
                onChange={(e) => setNewWorkspace(prev => ({ ...prev, description: e.target.value }))}
                placeholder="A brief description of your project..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={!newWorkspace.name.trim()}>
              Create Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteWorkspaceId} onOpenChange={() => setDeleteWorkspaceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workspace? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteWorkspaceId && handleDeleteWorkspace(deleteWorkspaceId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};