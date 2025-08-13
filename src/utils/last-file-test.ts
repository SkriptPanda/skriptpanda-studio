// Utility functions for testing last file functionality
// These can be called from the browser console for testing

export const clearLastFileData = () => {
  // Clear all workspace-specific last file data
  const keys = Object.keys(localStorage).filter(key => 
    key.startsWith("skriptpanda.openTabs.") || 
    key.startsWith("skriptpanda.activeFileId.")
  );
  
  keys.forEach(key => localStorage.removeItem(key));
  console.log("Cleared last file data for all workspaces:", keys);
  window.location.reload();
};

export const showLastFileData = () => {
  const keys = Object.keys(localStorage).filter(key => 
    key.startsWith("skriptpanda.openTabs.") || 
    key.startsWith("skriptpanda.activeFileId.")
  );
  
  const data: Record<string, any> = {};
  keys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      data[key] = key.includes("openTabs") ? JSON.parse(value || "[]") : value;
    } catch {
      data[key] = localStorage.getItem(key);
    }
  });
  
  console.log("Last file data:", data);
  return data;
};

export const setTestLastFile = (workspaceId: string, fileId: string, fileName: string) => {
  const testTab = {
    id: fileId,
    name: fileName,
    type: "file",
    content: "# Test file content\nThis is a test file for last file functionality."
  };
  
  localStorage.setItem(`skriptpanda.openTabs.${workspaceId}`, JSON.stringify([testTab]));
  localStorage.setItem(`skriptpanda.activeFileId.${workspaceId}`, fileId);
  
  console.log(`Set test last file for workspace ${workspaceId}:`, testTab);
  window.location.reload();
};

// Make functions available globally for testing
if (typeof window !== "undefined") {
  (window as any).lastFileTest = {
    clearLastFileData,
    showLastFileData,
    setTestLastFile,
  };
}
