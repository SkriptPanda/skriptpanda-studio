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

export const DEFAULT_TREE: FileTree = createFolder("SkriptPanda", [
  createFolder("scripts", [
    createFile("example.sk", "# Example Skript file\n\n# Start writing your Skript here.\n"),
  ]),
  createFolder("Greets", [
    createFile("join-leave.sk", `# Join and Leave Messages
# This script handles player join and leave messages

on join:
    # Send a welcome message to the joining player
    send "&a&lWelcome to the server, %player%!" to player
    send "&7Hope you enjoy your stay!" to player

    # Broadcast join message to all players
    broadcast "&8[&a+&8] &7%player% &ajoined the server"

    # Optional: Play a sound effect
    play sound "entity.player.levelup" with volume 0.5 and pitch 1.2 to player

on quit:
    # Broadcast leave message to all players
    broadcast "&8[&c-&8] &7%player% &cleft the server"

    # Optional: You can add custom leave reasons or effects here
    # Example: if player has permission "vip":
    #     broadcast "&6VIP player %player% has left!"

# Optional: First join special message
on first join:
    wait 1 second
    send "&6&l=== WELCOME TO THE SERVER ===" to player
    send "&eThis is your first time joining!" to player
    send "&eType /help for a list of commands" to player
    send "&6&l=========================" to player

    # Give starter items (optional)
    give player 1 bread
    give player 1 wooden sword

    # Broadcast special first join message
    broadcast "&6&lEveryone welcome &e%player% &6&lto the server for the first time!"
`),
  ]),
  createFile("README.md", "# SkriptPanda.\n\nWelcome to SkriptPanda IDE."),
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
