export type NodeType = "file" | "folder";

export type FileNodeBase = {
  id: string;
  name: string;
  type: NodeType;
};

export type FileLeaf = FileNodeBase & {
  type: "file";
  content: string;
};

export type FolderNode = FileNodeBase & {
  type: "folder";
  children: FileNode[];
};

export type FileNode = FileLeaf | FolderNode;

export type FileTree = FolderNode; // root folder

export const isFolder = (n: FileNode): n is FolderNode => n.type === "folder";
export const isFile = (n: FileNode): n is FileLeaf => n.type === "file";

export const createFile = (name: string, content = ""): FileLeaf => ({
  id: crypto.randomUUID(),
  name,
  type: "file",
  content,
});

export const createFolder = (name: string, children: FileNode[] = []): FolderNode => ({
  id: crypto.randomUUID(),
  name,
  type: "folder",
  children,
});

export function findNode(root: FileNode, id: string): FileNode | null {
  if (root.id === id) return root;
  if (isFolder(root)) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function updateFileContent(root: FileTree, id: string, content: string): FileTree {
  const clone = structuredClone(root) as FileTree;
  function walk(node: FileNode) {
    if (node.id === id && isFile(node)) {
      node.content = content;
      return;
    }
    if (isFolder(node)) node.children.forEach(walk);
  }
  walk(clone);
  return clone;
}

export function addChild(root: FileTree, parentId: string, child: FileNode): FileTree {
  const clone = structuredClone(root) as FileTree;
  function walk(node: FileNode) {
    if (node.id === parentId && isFolder(node)) {
      node.children.push(child);
      return;
    }
    if (isFolder(node)) node.children.forEach(walk);
  }
  walk(clone);
  return clone;
}

export function removeNode(root: FileTree, removeId: string): FileTree {
  const clone = structuredClone(root) as FileTree;
  function walk(node: FolderNode) {
    node.children = node.children.filter((c) => c.id !== removeId);
    node.children.forEach((c) => {
      if (isFolder(c)) walk(c);
    });
  }
  walk(clone);
  return clone;
}

export function renameNode(root: FileTree, id: string, newName: string): FileTree {
  const clone = structuredClone(root) as FileTree;
  function walk(node: FileNode) {
    if (node.id === id) {
      node.name = newName;
      return;
    }
    if (isFolder(node)) node.children.forEach(walk);
  }
  walk(clone);
  return clone;
}

export const DEFAULT_TREE: FileTree = createFolder("workspace", [
  createFolder("scripts", [
    createFile("hello.sk", "command /hello:\n  trigger:\n    message \"Hello from SkriptPanda!\""),
  ]),
  createFile("README.md", "# SkriptPanda Workspace\n\nWelcome! Create .sk files and export as zip."),
]);

export const STORAGE_KEY = "skriptpanda.fs";

export function saveTree(tree: FileTree) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
}

export function loadTree(): FileTree {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_TREE;
  try {
    return JSON.parse(raw) as FileTree;
  } catch {
    return DEFAULT_TREE;
  }
}
