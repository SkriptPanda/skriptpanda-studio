import { FileTree, FileLeaf, FileNode, createFile, createFolder, addChild, updateFileContent, findNode, isFolder, isFile } from "@/lib/fs";
import { callGeminiAPI, GeminiMessage } from "@/lib/gemini";

// Helper function to get file tree structure as text
const getFileTreeStructure = (node: FileNode, depth = 0): string => {
  const indent = "  ".repeat(depth);
  let result = `${indent}${node.name}${isFolder(node) ? "/" : ""}\n`;

  if (isFolder(node)) {
    for (const child of node.children) {
      result += getFileTreeStructure(child, depth + 1);
    }
  }

  return result;
};

// Helper function to get all file contents with better formatting
const getAllFileContents = (node: FileNode, path = ""): string => {
  let result = "";

  if (isFile(node)) {
    const fullPath = path ? `${path}/${node.name}` : node.name;
    result += `\n=== FILE: ${fullPath} ===\n`;
    result += `Content:\n${node.content || "(empty file)"}\n`;
    result += `=== END OF ${fullPath} ===\n\n`;
  } else if (isFolder(node)) {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    for (const child of node.children) {
      result += getAllFileContents(child, currentPath);
    }
  }

  return result;
};

// Helper function to get detailed project summary
const getProjectSummary = (tree: FileTree): string => {
  const structure = getFileTreeStructure(tree as FileNode);
  const contents = getAllFileContents(tree as FileNode);

  return `
PROJECT OVERVIEW:
================
Structure:
${structure}

File Contents:
${contents}

Total files: ${countFiles(tree as FileNode)}
Total folders: ${countFolders(tree as FileNode)}
================
`;
};

// Helper functions to count files and folders
const countFiles = (node: FileNode): number => {
  if (isFile(node)) return 1;
  if (isFolder(node)) {
    return node.children.reduce((count, child) => count + countFiles(child), 0);
  }
  return 0;
};

const countFolders = (node: FileNode): number => {
  if (isFile(node)) return 0;
  if (isFolder(node)) {
    return 1 + node.children.reduce((count, child) => count + countFolders(child), 0);
  }
  return 0;
};

// AI command processing using Gemini API
export const processAICommand = async (
  input: string,
  tree: FileTree,
  onTreeUpdate: (tree: FileTree) => void,
  onFileOpen: (file: any) => void,
  apiKey: string
): Promise<string> => {
  // Get comprehensive project context for better AI understanding
  const projectSummary = getProjectSummary(tree);
  console.log("📁 Project context prepared, files:", countFiles(tree as FileNode));

  const messages: GeminiMessage[] = [
    {
      role: "user",
      parts: [{
        text: `You are SkriptPanda, a helpful SkriptLang assistant with complete access to the user's project.

USER REQUEST: "${input}"

${projectSummary}

CAPABILITIES:
- Create files and folders directly
- Read and analyze existing files
- Modify existing files
- Understand project structure and context

INSTRUCTIONS:
- If the user wants to create a file (like "create me a simple skript in example.sk"), create it with appropriate SkriptLang code
- If the user asks about existing files, provide information about them
- If the user wants to edit files, modify them as requested
- Always be helpful and provide working SkriptLang code when creating files
- Use proper SkriptLang syntax and include helpful comments
- Format your responses using markdown for better readability
- Use code blocks with \`\`\`skript for SkriptLang code
- Use headings, lists, and formatting to make responses clear and organized

For file creation requests, provide the code in a code block and I'll create the file automatically.`
      }]
    }
  ];

  try {
    console.log("🚀 Sending request to Gemini API...");
    const response = await callGeminiAPI(messages, apiKey, true, false);
    console.log("✅ Received response from Gemini API");
    console.log("📝 Response length:", response.length);
    console.log("📝 Response content:", response.substring(0, 200) + "...");

    // Check if the response contains code and suggests file creation
    const codeMatch = response.match(/```(?:skript|sk)?\n([\s\S]*?)\n```/);
    if (codeMatch) {
      const code = codeMatch[1];
      // Try to extract filename from the response or user input
      let fileName = extractFileNameFromResponse(response) || extractFileNameFromResponse(input);

      // If no filename found, use example.sk as default
      if (!fileName) {
        fileName = "example.sk";
      }

      // Create the file
      const file = createFile(fileName, code);
      const updatedTree = addChild(tree, tree.id, file);
      onTreeUpdate(updatedTree);
      onFileOpen(file);
      console.log("📄 Auto-created file:", fileName);
      return response + `\n\n✅ I've created the file "${fileName}" for you with this code!`;
    }

    // Ensure we always return something
    if (!response || response.trim().length === 0) {
      console.error("❌ Empty response from AI processing");
      return "I apologize, but I couldn't generate a proper response. Please try rephrasing your request.";
    }

    return response;
  } catch (error) {
    console.error("❌ Error in AI processing:", error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("401")) {
        return "❌ Invalid API key. Please check your Gemini API key and try again.";
      } else if (error.message.includes("403")) {
        return "❌ API access denied. Please verify your Gemini API key has the necessary permissions.";
      } else if (error.message.includes("429")) {
        return "❌ Rate limit exceeded. Please wait a moment and try again.";
      } else if (error.message.includes("500")) {
        return "❌ Gemini API server error. This might be a temporary issue. Please try again in a few moments.";
      }
    }

    return `❌ I'm having trouble connecting to the AI service. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API key and internet connection.`;
  }


};

const generateFileContent = async (
  fileName: string,
  prompt: string,
  apiKey: string,
  projectSummary?: string
): Promise<string> => {
  const messages: GeminiMessage[] = [
    {
      role: "user",
      parts: [{
        text: `Generate SkriptLang code for "${fileName}" based on: "${prompt}"

${projectSummary ? `Project Context:
${projectSummary}` : ''}

Create clean, working SkriptLang code with proper syntax and comments. Consider the existing project files.

Return only the code, no explanations.`
      }]
    }
  ];

  const response = await callGeminiAPI(messages, apiKey, true, false); // Disable grounding for file generation

  // Extract code from response if it's wrapped in code blocks
  const codeMatch = response.match(/```(?:skript|sk)?\n([\s\S]*?)\n```/);
  if (codeMatch) {
    return codeMatch[1];
  }

  return response;
};

const generateUpdatedContent = async (
  currentContent: string,
  instruction: string,
  fileName: string,
  apiKey: string,
  projectSummary?: string
): Promise<string> => {
  const messages: GeminiMessage[] = [
    {
      role: "user",
      parts: [{
        text: `Update file "${fileName}". Current content:

\`\`\`
${currentContent}
\`\`\`

Change request: "${instruction}"

${projectSummary ? `Project Context:
${projectSummary}` : ''}

Return the FULL updated file content in a code block. No explanations.`
      }]
    }
  ];
  const response = await callGeminiAPI(messages, apiKey, true, false); // Disable grounding for file updates
  const code = extractCodeFromText(response);
  return code ?? response;
};

const findFileByName = (root: FileTree | FileNode, name: string): FileLeaf | null => {
  const targetName = name.trim();
  const walk = (node: FileNode): FileLeaf | null => {
    if (isFolder(node)) {
      for (const child of node.children) {
        const found = walk(child);
        if (found) return found;
      }
      return null;
    }
    // file
    if (node.name === targetName) return node as FileLeaf;
    return null;
  };
  return walk(root as FileNode);
};

const extractCodeFromText = (text: string): string | null => {
  const match = text.match(/```(?:skript|sk)?\n([\s\S]*?)\n```/);
  return match ? match[1] : null;
};

const extractFileNameFromResponse = (text: string): string | null => {
  // Look for file names in quotes or mentioned directly
  const patterns = [
    /['"`]([^'"`]+\.sk)['"`]/i,
    /file\s+(?:named\s+|called\s+)?['"`]?([^'"`\s]+\.sk)['"`]?/i,
    /(?:in|create|make)\s+([a-zA-Z0-9_-]+\.sk)/i,
    /([a-zA-Z0-9_-]+\.sk)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

const getBasicFileContent = (fileName: string, input: string): string => {
  const lowerInput = input.toLowerCase();
  
  if (fileName.endsWith('.sk')) {
    if (lowerInput.includes("teleport") || lowerInput.includes("tp")) {
      return `command /tp <player> <target>:
    permission: teleport.use
    trigger:
        teleport arg-1 to arg-2
        send "&aTeleported!" to sender`;
    }
    
    if (lowerInput.includes("heal")) {
      return `command /heal [player]:
    permission: heal.use
    trigger:
        if arg-1 is set:
            heal arg-1
            send "&aHealed %arg-1%!" to sender
        else:
            heal sender
            send "&aYou have been healed!" to sender`;
    }

    return `# New SkriptLang file
# Write your script here

on load:
    send "&aScript loaded successfully!" to console`;
  }
  
  return "# New file\n";
};
