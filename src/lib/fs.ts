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

export type MovePosition = "inside" | "before" | "after";

function findParentAndIndex(root: FolderNode, id: string): { parent: FolderNode; index: number } | null {
  if (root.children.some((c) => c.id === id)) {
    return { parent: root, index: root.children.findIndex((c) => c.id === id) };
  }
  for (const child of root.children) {
    if (isFolder(child)) {
      const res = findParentAndIndex(child, id);
      if (res) return res;
    }
  }
  return null;
}

function isDescendant(root: FileNode, ancestorId: string, nodeId: string): boolean {
  const ancestor = findNode(root, ancestorId);
  if (!ancestor || !isFolder(ancestor)) return false;
  function walk(n: FileNode): boolean {
    if (n.id === nodeId) return true;
    if (isFolder(n)) return n.children.some(walk);
    return false;
  }
  return ancestor.children.some(walk);
}

export function moveNode(root: FileTree, sourceId: string, targetId: string, position: MovePosition): FileTree {
  if (sourceId === targetId) return root;
  const clone = structuredClone(root) as FileTree;

  const srcInfo = findParentAndIndex(clone, sourceId);
  const targetNode = findNode(clone, targetId);
  if (!srcInfo || !targetNode) return clone;

  // prevent moving a node inside its own descendant
  if (isDescendant(clone, sourceId, targetId)) return clone;

  const sourceNode = srcInfo.parent.children[srcInfo.index];
  // remove from previous location
  srcInfo.parent.children.splice(srcInfo.index, 1);

  if (position === "inside" && isFolder(targetNode)) {
    targetNode.children.push(sourceNode);
    return clone;
  }

  // Insert before/after target within its parent
  const targetParentInfo = findParentAndIndex(clone, targetId);
  if (!targetParentInfo) return clone;
  let insertIndex = targetParentInfo.index + (position === "after" ? 1 : 0);

  // If moving within the same parent and source was before target, account for index shift
  if (targetParentInfo.parent.id === srcInfo.parent.id && srcInfo.index < targetParentInfo.index) {
    insertIndex -= 1;
  }
  targetParentInfo.parent.children.splice(insertIndex, 0, sourceNode);
  return clone;
}

...

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
