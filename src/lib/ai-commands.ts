import { FileTree, FileLeaf, FileNode, createFile, createFolder, addChild, updateFileContent, findNode, isFolder, isFile } from "@/lib/fs";
import { callGeminiAPI, GeminiMessage } from "@/lib/gemini";
import { searchSkriptLangSpecific, SearchResult } from "@/lib/google-search";

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

// Helper function to get all file contents
const getAllFileContents = (node: FileNode): string => {
  let result = "";

  if (isFile(node)) {
    result += `\n--- File: ${node.name} ---\n${node.content}\n`;
  } else if (isFolder(node)) {
    for (const child of node.children) {
      result += getAllFileContents(child);
    }
  }

  return result;
};

// AI command processing using Gemini API
export const processAICommand = async (
  input: string,
  tree: FileTree,
  onTreeUpdate: (tree: FileTree) => void,
  onFileOpen: (file: any) => void,
  apiKey: string
): Promise<string> => {
  const lowerInput = input.toLowerCase();

  // First handle direct file/folder creation commands
  if (lowerInput.includes("create") && lowerInput.includes("folder")) {
    const match = input.match(/folder.*?['""]([^'""]+)['""]|folder.*?([\w-]+)/i);
    if (match) {
      const folderName = match[1] || match[2];
      const folder = createFolder(folderName);
      const updatedTree = addChild(tree, tree.id, folder);
      onTreeUpdate(updatedTree);
      return `Created folder "${folderName}" successfully!`;
    }
    return "Please specify a folder name, like: 'Create a folder called commands'";
  }

  if (lowerInput.includes("create") && lowerInput.includes("file")) {
    const match = input.match(/file.*?['"\"]([^'"\"]+)['"\"]|file.*?([\w.-]+)/i);
    if (match) {
      const fileName = match[1] || match[2];
      try {
        // MANDATORY: Search before generating any SkriptLang code
        console.log(`🔍 Searching for: ${input}`);
        const searchResults = await searchSkriptLangSpecific(input, 'examples');
        console.log(`📚 Search completed, generating content for: ${fileName}`);

        // Get project context for better file generation
        const projectStructure = getFileTreeStructure(tree as FileNode);
        const allFileContents = getAllFileContents(tree as FileNode);

        const content = await generateFileContent(fileName, input, apiKey, searchResults, projectStructure, allFileContents);
        const file = createFile(fileName, content);
        const updatedTree = addChild(tree, tree.id, file);
        onTreeUpdate(updatedTree);
        onFileOpen(file);
        return `Created file "${fileName}" with AI-generated content (researched current SkriptLang documentation) and opened it for you!\n\n📚 Research conducted: ${searchResults.split('\n')[0]}`;
      } catch (error) {
        const basicContent = getBasicFileContent(fileName, input);
        const file = createFile(fileName, basicContent);
        const updatedTree = addChild(tree, tree.id, file);
        onTreeUpdate(updatedTree);
        onFileOpen(file);
        return `Created file "${fileName}" with basic content. (AI generation failed, but file was created successfully)`;
      }
    }
    return "Please specify a file name, like: 'Create a file called teleport.sk'";
  }

  // Update/modify/overwrite an existing file
  if ((lowerInput.includes("update") || lowerInput.includes("modify") || lowerInput.includes("change") || lowerInput.includes("overwrite") || lowerInput.includes("write to")) && lowerInput.includes("file")) {
    const match = input.match(/['"\"]([^'"\"]+\.[\w]+)['"\"]|(\b[\w.-]+\.sk\b)/i);
    if (match) {
      const fileName = (match[1] || match[2]).trim();
      const target = findFileByName(tree, fileName);
      if (!target) {
        return `I couldn't find a file named "${fileName}". Please check the name.`;
      }

      // If user provided a code block, use it directly; otherwise, ask Gemini to transform current content per instruction
      const directCode = extractCodeFromText(input);
      let newContent: string;
      if (directCode) {
        newContent = directCode;
      } else {
        // MANDATORY: Search before updating any SkriptLang code
        const searchResults = await searchSkriptLangSpecific(input, 'syntax');
        const projectStructure = getFileTreeStructure(tree as FileNode);
        const allFileContents = getAllFileContents(tree as FileNode);
        newContent = await generateUpdatedContent(target.content, input, fileName, apiKey, searchResults, projectStructure, allFileContents);
      }

      const updatedTree = updateFileContent(tree as FileTree, target.id, newContent);
      onTreeUpdate(updatedTree);
      const updatedNode = findNode(updatedTree, target.id);
      if (updatedNode && isFile(updatedNode)) {
        onFileOpen(updatedNode);
      }
      return `Updated file "${fileName}" successfully.`;
    }
    return "Please specify which file to update, e.g., Update file 'example.sk' to add a heal command.";
  }

  // Append to an existing file
  if (lowerInput.includes("append") && lowerInput.includes("file")) {
    const match = input.match(/['"\"]([^'"\"]+\.[\w]+)['"\"]|(\b[\w.-]+\.sk\b)/i);
    if (match) {
      const fileName = (match[1] || match[2]).trim();
      const target = findFileByName(tree, fileName);
      if (!target) {
        return `I couldn't find a file named "${fileName}". Please check the name.`;
      }

      const directCode = extractCodeFromText(input);
      let newContent: string;
      if (directCode) {
        newContent = target.content + (target.content.endsWith("\n") ? "" : "\n") + directCode + "\n";
      } else {
        // MANDATORY: Search before appending any SkriptLang code
        const searchResults = await searchSkriptLangSpecific(input, 'examples');
        const projectStructure = getFileTreeStructure(tree as FileNode);
        const allFileContents = getAllFileContents(tree as FileNode);
        // Ask Gemini to apply an append-style change and return the full updated content
        newContent = await generateUpdatedContent(target.content, input + " (Append the requested logic/content to the end where appropriate.)", fileName, apiKey, searchResults, projectStructure, allFileContents);
      }

      const updatedTree = updateFileContent(tree as FileTree, target.id, newContent);
      onTreeUpdate(updatedTree);
      const updatedNode = findNode(updatedTree, target.id);
      if (updatedNode && isFile(updatedNode)) {
        onFileOpen(updatedNode);
      }
      return `Appended content to "${fileName}" successfully.`;
    }
    return "Please specify which file to append to, e.g., Append to 'example.sk': <code>...";
  }

  // For other requests, use Gemini API to generate intelligent responses
  try {
    // MANDATORY: Search before providing any SkriptLang assistance
    const searchResults = await searchSkriptLangSpecific(input, 'general');

    // Get current project context
    const projectStructure = getFileTreeStructure(tree as FileNode);
    const allFileContents = getAllFileContents(tree as FileNode);

    const messages: GeminiMessage[] = [
      {
        role: "user",
        parts: [{
          text: `You are a SkriptLang assistant with FULL ACCESS to the user's project. The user said: "${input}".

IMPORTANT: I have conducted research for you. Here are the current search results:
${searchResults}

CURRENT PROJECT CONTEXT:
Project Structure:
${projectStructure}

All File Contents:
${allFileContents}

Based on this research, the reference documentation at https://skriptlang-docs.netlify.app/render9.html, and the COMPLETE project context above, provide accurate, up-to-date assistance.

You can:
- Create new .sk files and folders
- Modify existing files
- See all current file contents
- Understand the full project structure

If they want to create a specific script or need help with SkriptLang code, provide helpful code examples and explanations using current syntax. Always consider the existing project structure and files when making suggestions.

Respond helpfully and concisely. If they're asking for a specific script, provide clean, working SkriptLang code based on the research above and project context.`
        }]
      }
    ];

    const response = await callGeminiAPI(messages, apiKey);
    
    // Check if the response suggests creating a file and do it automatically
    if (response.toLowerCase().includes("create") && response.toLowerCase().includes(".sk")) {
      const codeMatch = response.match(/```(?:skript|sk)?\n([\s\S]*?)\n```/);
      if (codeMatch) {
        const code = codeMatch[1];
        const fileName = extractFileNameFromResponse(response) || "generated-script.sk";
        const file = createFile(fileName, code);
        const updatedTree = addChild(tree, tree.id, file);
        onTreeUpdate(updatedTree);
        onFileOpen(file);
        return response + `\n\n✅ I've also created the file "${fileName}" for you with this code!`;
      }
    }
    
    return response;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "I'm having trouble connecting to the AI service. Please check your API key and internet connection.";
  }
};

const generateFileContent = async (
  fileName: string,
  prompt: string,
  apiKey: string,
  searchResults?: string,
  projectStructure?: string,
  allFileContents?: string
): Promise<string> => {
  const messages: GeminiMessage[] = [
    {
      role: "user",
      parts: [{
        text: `Generate SkriptLang code for a file named "${fileName}" based on this request: "${prompt}".

${searchResults ? `RESEARCH CONDUCTED: Here are current search results for reference:
${searchResults}

Use this research and the documentation at https://skriptlang-docs.netlify.app/render9.html to ensure accuracy.` : ''}

${projectStructure ? `CURRENT PROJECT STRUCTURE:
${projectStructure}` : ''}

${allFileContents ? `EXISTING FILE CONTENTS:
${allFileContents}` : ''}

Please provide clean, working SkriptLang code that follows current best practices. Include appropriate comments and make sure the syntax is correct for current SkriptLang versions. Consider the existing project structure and files when creating this new file.

Only respond with the code, no extra explanation text.`
      }]
    }
  ];

  const response = await callGeminiAPI(messages, apiKey);

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
  searchResults?: string,
  projectStructure?: string,
  allFileContents?: string
): Promise<string> => {
  const messages: GeminiMessage[] = [
    {
      role: "user",
      parts: [{
        text: `You are updating an existing file named "${fileName}". Current content between fences:\n\n\`\`\`\n${currentContent}\n\`\`\`\n\nApply the following change request to this file: "${instruction}".

${searchResults ? `RESEARCH CONDUCTED: Here are current search results for reference:
${searchResults}

Use this research and the documentation at https://skriptlang-docs.netlify.app/render9.html to ensure accuracy and current syntax.` : ''}

${projectStructure ? `CURRENT PROJECT STRUCTURE:
${projectStructure}` : ''}

${allFileContents ? `ALL PROJECT FILES CONTENT:
${allFileContents}` : ''}

Return the FULL updated file content only, in a single fenced code block labeled 'skript' if applicable. Do not include explanations. Consider the full project context when making changes.`
      }]
    }
  ];
  const response = await callGeminiAPI(messages, apiKey);
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

const extractFileNameFromResponse = (response: string): string | null => {
  const fileMatch = response.match(/file.*?['""]([^'""]+\.sk)['""]|(\w+\.sk)/i);
  return fileMatch ? (fileMatch[1] || fileMatch[2]) : null;
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
