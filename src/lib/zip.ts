import JSZip from "jszip";
import { saveAs } from "file-saver";
import { FileNode, FileTree, isFolder, isFile } from "./fs";

function addNodeToZip(zip: JSZip, node: FileNode, path: string = "") {
  if (isFolder(node)) {
    const folder = zip.folder(node.name)!;
    node.children.forEach((child) => addNodeToZip(folder as unknown as JSZip, child, `${path}${node.name}/`));
  } else if (isFile(node)) {
    zip.file(node.name, node.content ?? "");
  }
}

export async function exportTreeAsZip(tree: FileTree, filename = "skriptpanda.zip") {
  const zip = new JSZip();
  // Add children of root at root level in zip (root folder is a container only)
  tree.children.forEach((c) => addNodeToZip(zip, c));
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, filename);
}
