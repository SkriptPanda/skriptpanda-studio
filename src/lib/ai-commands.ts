import { FileTree, FileLeaf, FileNode, createFile, createFolder, addChild, updateFileContent, findNode, isFolder, isFile } from "@/lib/fs";
import { callGeminiAPI, GeminiMessage } from "@/lib/gemini";
import { Message, formatMessagesForAI } from "@/lib/chat-storage";

// Helper function to find a node by name within a specific parent
const findNodeByName = (tree: FileTree, name: string, parentId: string): FileNode | null => {
  const parent = findNode(tree, parentId);
  if (!parent || !isFolder(parent)) return null;

  return parent.children.find(child => child.name === name) || null;
};

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
    const content = node.content || "";
    const contentPreview = content.length > 1000 ? content.substring(0, 1000) + "\n... (content truncated)" : content;

    result += `\n=== FILE: ${fullPath} ===\n`;
    result += `Size: ${content.length} characters\n`;
    result += `Content:\n${contentPreview || "(empty file)"}\n`;
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
  const fileCount = countFiles(tree as FileNode);
  const folderCount = countFolders(tree as FileNode);

  const summary = `
PROJECT OVERVIEW:
================
Structure:
${structure}

File Contents:
${contents}

Total files: ${fileCount}
Total folders: ${folderCount}
================
`;

  // If the summary is too long, provide a condensed version
  if (summary.length > 15000) {
    return `
PROJECT OVERVIEW:
================
Structure:
${structure}

Total files: ${fileCount}
Total folders: ${folderCount}

Note: Project contains many files. Full content available upon request.
================
`;
  }

  return summary;
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
  apiKey: string,
  chatHistory: Message[] = []
): Promise<string> => {
  // For debugging, let's use a minimal project summary to avoid token limits
  const fileCount = countFiles(tree as FileNode);
  const folderCount = countFolders(tree as FileNode);

  const projectSummary = `
PROJECT OVERVIEW:
================
Total files: ${fileCount}
Total folders: ${folderCount}
Current project structure available.
================
`;

  console.log("📁 Project context prepared, files:", fileCount);
  console.log("📝 Using minimal project summary to avoid token limits");

  // Format chat history for context
  const chatContext = formatMessagesForAI(chatHistory);

  const messages: GeminiMessage[] = [
    {
      role: "user",
      parts: [{
        text: `You are a helpful assistant for SkriptLang development.

${chatContext}

User request: "${input}"

${projectSummary}

Please help the user with their SkriptLang development request. If they want to create a file, provide the code in a skript code block. If they ask about existing files, describe what you find.

Consider the conversation history above to maintain context and provide relevant responses.`
      }]
    }
  ];

  try {
    console.log("🚀 Sending request to Gemini API...");
    console.log("📝 Project summary length:", projectSummary.length);
    console.log("📝 Input length:", input.length);
    console.log("📝 Total message length:", messages[0].parts[0].text.length);

    // First try a simple test to see if API is working
    if (input.toLowerCase().includes("test api")) {
      const testMessages: GeminiMessage[] = [
        {
          role: "user",
          parts: [{ text: "Say hello and confirm you can respond." }]
        }
      ];
      console.log("🧪 Running API test...");
      const testResponse = await callGeminiAPI(testMessages, apiKey, false, false);
      console.log("🧪 Test response:", testResponse);
      return `API Test Result: ${testResponse}`;
    }

    const response = await callGeminiAPI(messages, apiKey, true, false);
    console.log("✅ Received response from Gemini API");
    console.log("📝 Response length:", response.length);
    console.log("📝 Response content:", response.substring(0, 200) + "...");

    // Only auto-create files if the user explicitly requested file creation
    const isFileCreationRequest = /\b(create|make|generate|write|add)\b.*\b(file|script|\.sk)\b/i.test(input) ||
                                 /\b(new|create)\b.*\b(script|skript)\b/i.test(input);

    const codeMatch = response.match(/```(?:skript|sk)?\n([\s\S]*?)\n```/);
    if (codeMatch && isFileCreationRequest) {
      const code = codeMatch[1];
      // Try to extract filename from the response or user input
      let fileName = extractFileNameFromResponse(response) || extractFileNameFromResponse(input);

      // If no filename found, use example.sk as default
      if (!fileName) {
        fileName = "example.sk";
      }

      // Handle file creation with proper folder structure
      let updatedTree = tree;
      let targetParentId = tree.id;

      // Check if filename includes a path (e.g., "scripts/example.sk")
      if (fileName.includes('/')) {
        const pathParts = fileName.split('/');
        const actualFileName = pathParts.pop()!;

        // Create folders if they don't exist
        for (const folderName of pathParts) {
          let existingFolder = findNodeByName(updatedTree, folderName, targetParentId);
          if (!existingFolder) {
            const newFolder = createFolder(folderName);
            updatedTree = addChild(updatedTree, targetParentId, newFolder);
            targetParentId = newFolder.id;
            console.log("📁 Created folder:", folderName);
          } else {
            targetParentId = existingFolder.id;
          }
        }
        fileName = actualFileName;
      }

      // Create the file in the appropriate folder
      const file = createFile(fileName, code);
      updatedTree = addChild(updatedTree, targetParentId, file);
      onTreeUpdate(updatedTree);
      onFileOpen(file);
      console.log("📄 Auto-created file:", fileName);

      // Generate a natural AI response about the file creation
      const fileCreationMessages: GeminiMessage[] = [
        {
          role: "user",
          parts: [{
            text: `User requested: "${input}"

I've created a file called "${fileName}" with the following code:

\`\`\`skript
${code}
\`\`\`

The file has been successfully created and opened in the editor. Please respond naturally to the user about creating this file and briefly explain what the code does.`
          }]
        }
      ];

      return await callGeminiAPI(fileCreationMessages, apiKey, true, false);
    }

    // Check for folder creation requests
    const isFolderCreationRequest = /\b(create|make|add|new)\b.*\b(folder|directory)\b/i.test(input);

    if (isFolderCreationRequest) {
      // Extract folder name from input - try multiple patterns
      let folderName = null;

      // Pattern 1: "create folder greet" or "create a folder called greet"
      const pattern1 = input.match(/(?:create|make|add|new)\s+(?:a\s+)?(?:folder|directory)\s+(?:called\s+|named\s+)?['""]?([^'""\s]+)['""]?/i);
      if (pattern1) folderName = pattern1[1];

      // Pattern 2: "create folder 'greet'" or "create folder "greet""
      if (!folderName) {
        const pattern2 = input.match(/(?:folder|directory)\s+['""]([^'""]+)['""]?/i);
        if (pattern2) folderName = pattern2[1];
      }

      // Pattern 3: Just quoted text "greet"
      if (!folderName) {
        const pattern3 = input.match(/['""]([^'""]+)['""]/) || input.match(/\b([a-zA-Z][a-zA-Z0-9_-]*)\s*$/);
        if (pattern3) folderName = pattern3[1];
      }

      if (folderName) {
        // Create the folder
        const newFolder = createFolder(folderName);
        const updatedTree = addChild(tree, tree.id, newFolder);
        onTreeUpdate(updatedTree);
        console.log("📁 Auto-created folder:", folderName);

        // Let the AI respond naturally about the folder creation
        const folderCreationContext = `[SYSTEM: Folder "${folderName}" has been successfully created in the project.]`;

        // Generate a natural AI response about the folder creation
        const messages: GeminiMessage[] = [
          {
            role: "user",
            parts: [{
              text: `User requested: "${input}"

${folderCreationContext}

Please respond naturally to the user about creating the folder. Be conversational and helpful.`
            }]
          }
        ];

        return await callGeminiAPI(messages, apiKey, true, false);
      } else {
        // Let the AI respond naturally about needing clarification
        const messages: GeminiMessage[] = [
          {
            role: "user",
            parts: [{
              text: `User requested: "${input}"

The user wants to create a folder but I couldn't determine the folder name from their request. Please respond naturally asking them to clarify the folder name they want to create.`
            }]
          }
        ];

        return await callGeminiAPI(messages, apiKey, true, false);
      }
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
