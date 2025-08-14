import { GoogleGenerativeAI } from "@google/generative-ai";
import { FileTree, FileLeaf, FileNode, createFile, createFolder, addChild, updateFileContent, findNode, isFolder, isFile, removeNode, renameNode } from "@/lib/fs";

// AI Agent System Prompt
const SYSTEM_PROMPT = `You will write skript code, with correct syntax, and always research before writing any code. You can use https://skriptpanda-docs.netlify.app/render9.html docs, it has all skript events, but there are only some of the addons, so always research before writing skript code

You are an AI agent that can:
- Create folders and files in the project
- Read all folders and files in the project
- Edit all files and folders in the project
- Use Google Search to research SkriptLang syntax and features
- Provide accurate, working SkriptLang code examples

When creating files:
- Always use proper .sk extension for SkriptLang files
- Include helpful comments explaining the code
- Use correct SkriptLang syntax
- Consider the existing project structure

When editing files:
- Preserve existing functionality unless explicitly asked to change it
- Make minimal, targeted changes
- Ensure the code remains syntactically correct

When researching:
- Use Google Search to find the latest SkriptLang documentation
- Verify syntax and features before implementing
- Reference official sources when possible`;

export interface AIAgentConfig {
  apiKey: string;
  useGoogleSearch?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface FileOperation {
  type: 'create' | 'edit' | 'delete' | 'rename';
  path: string;
  content?: string;
  newName?: string;
}

export interface AIAgentResponse {
  message: string;
  operations: FileOperation[];
  filesToOpen?: string[];
}

export class AIAgent {
  private genAI: GoogleGenerativeAI;
  private config: AIAgentConfig;

  constructor(config: AIAgentConfig) {
    this.config = {
      useGoogleSearch: true,
      maxTokens: 8192,
      temperature: 0.7,
      ...config
    };
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }

  /**
   * Process a user request and return AI response with file operations
   */
  async processRequest(
    userInput: string,
    fileTree: FileTree,
    onTreeUpdate: (tree: FileTree) => void,
    onFileOpen: (file: FileLeaf) => void
  ): Promise<AIAgentResponse> {
    try {
      console.log("🤖 AI Agent processing request:", userInput);

      // Prepare project context
      const projectContext = this.buildProjectContext(fileTree);
      
      // Create the model with appropriate configuration
      const modelConfig: any = {
        model: "gemini-2.5-pro",
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: this.config.temperature,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: this.config.maxTokens,
          candidateCount: 1,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      };

      // Add Google Search tool if enabled
      if (this.config.useGoogleSearch) {
        modelConfig.tools = [
          {
            googleSearch: {}
          }
        ];
        console.log("🔍 Google Search tool enabled");
      }

      const model = this.genAI.getGenerativeModel(modelConfig);

      // Prepare the prompt
      const prompt = this.buildPrompt(userInput, projectContext);

      console.log("📤 Sending request to Gemini API...");
      const result = await model.generateContent(prompt);
      const response = await result.response;

      // Handle response
      let responseText = "";
      if (response.promptFeedback?.blockReason) {
        console.error("❌ Response blocked by safety filters:", response.promptFeedback.blockReason);
        responseText = `I apologize, but my response was blocked due to safety filters. Reason: ${response.promptFeedback.blockReason}. Please try rephrasing your request.`;
      } else {
        try {
          responseText = response.text();
        } catch (error) {
          console.warn("⚠️ Failed to get text directly, trying alternative method:", error);
          if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
            responseText = response.candidates[0].content.parts[0].text;
          } else {
            responseText = "I apologize, but I couldn't extract the response content. Please try again.";
          }
        }
      }

      // Parse response for file operations
      const operations = this.parseFileOperations(responseText, userInput);
      
      // Execute file operations
      const updatedTree = await this.executeFileOperations(operations, fileTree, onTreeUpdate, onFileOpen);

      // Determine which files to open
      const filesToOpen = operations
        .filter(op => op.type === 'create' && op.path.endsWith('.sk'))
        .map(op => op.path);

      return {
        message: this.cleanResponseMessage(responseText),
        operations,
        filesToOpen
      };

    } catch (error) {
      console.error("❌ Error in AI Agent:", error);
      return {
        message: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API key and try again.`,
        operations: []
      };
    }
  }

  /**
   * Build comprehensive project context
   */
  private buildProjectContext(fileTree: FileTree): string {
    const structure = this.getFileTreeStructure(fileTree as FileNode);
    const fileContents = this.getAllFileContents(fileTree as FileNode);
    const stats = this.getProjectStats(fileTree as FileNode);

    return `
PROJECT CONTEXT:
================
Project Structure:
${structure}

File Contents:
${fileContents}

Project Statistics:
- Total files: ${stats.fileCount}
- Total folders: ${stats.folderCount}
- Skript files: ${stats.skriptFileCount}
- Total lines of code: ${stats.totalLines}

Current working directory: root/
================
`;
  }

  /**
   * Get file tree structure as text
   */
  private getFileTreeStructure(node: FileNode, depth = 0): string {
    const indent = "  ".repeat(depth);
    let result = `${indent}${node.name}${isFolder(node) ? "/" : ""}\n`;

    if (isFolder(node)) {
      for (const child of node.children) {
        result += this.getFileTreeStructure(child, depth + 1);
      }
    }

    return result;
  }

  /**
   * Get all file contents with formatting
   */
  private getAllFileContents(node: FileNode, path = ""): string {
    let result = "";

    if (isFile(node)) {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      const content = node.content || "";
      const contentPreview = content.length > 2000 ? content.substring(0, 2000) + "\n... (content truncated)" : content;

      result += `\n=== FILE: ${fullPath} ===\n`;
      result += `Size: ${content.length} characters\n`;
      result += `Content:\n${contentPreview || "(empty file)"}\n`;
      result += `=== END OF ${fullPath} ===\n\n`;
    } else if (isFolder(node)) {
      const currentPath = path ? `${path}/${node.name}` : node.name;
      for (const child of node.children) {
        result += this.getAllFileContents(child, currentPath);
      }
    }

    return result;
  }

  /**
   * Get project statistics
   */
  private getProjectStats(node: FileNode): { fileCount: number; folderCount: number; skriptFileCount: number; totalLines: number } {
    let fileCount = 0;
    let folderCount = 0;
    let skriptFileCount = 0;
    let totalLines = 0;

    const walk = (n: FileNode) => {
      if (isFile(n)) {
        fileCount++;
        if (n.name.endsWith('.sk')) {
          skriptFileCount++;
        }
        totalLines += (n.content || '').split('\n').length;
      } else if (isFolder(n)) {
        folderCount++;
        for (const child of n.children) {
          walk(child);
        }
      }
    };

    walk(node);
    return { fileCount, folderCount, skriptFileCount, totalLines };
  }

  /**
   * Build the prompt for the AI
   */
  private buildPrompt(userInput: string, projectContext: string): string {
    return `User Request: "${userInput}"

${projectContext}

Instructions:
1. Analyze the user's request carefully
2. If they want to create files or folders, provide the exact file operations needed
3. If they want to edit existing files, provide the updated content
4. Use Google Search if needed to research SkriptLang syntax
5. Always use proper SkriptLang syntax and include helpful comments
6. Respond naturally and helpfully

Please provide your response and any file operations needed.`;
  }

  /**
   * Parse file operations from AI response
   */
  private parseFileOperations(response: string, userInput: string): FileOperation[] {
    const operations: FileOperation[] = [];

    // Check for file creation requests
    const createFileMatch = response.match(/CREATE_FILE:\s*([^\n]+)/i);
    if (createFileMatch) {
      const filePath = createFileMatch[1].trim();
      const codeMatch = response.match(/```(?:skript|sk)?\n([\s\S]*?)\n```/);
      const content = codeMatch ? codeMatch[1] : this.generateBasicContent(filePath, userInput);
      
      operations.push({
        type: 'create',
        path: filePath,
        content
      });
    }

    // Check for folder creation requests
    const createFolderMatch = response.match(/CREATE_FOLDER:\s*([^\n]+)/i);
    if (createFolderMatch) {
      const folderPath = createFolderMatch[1].trim();
      operations.push({
        type: 'create',
        path: folderPath
      });
    }

    // Check for file edit requests
    const editFileMatch = response.match(/EDIT_FILE:\s*([^\n]+)/i);
    if (editFileMatch) {
      const filePath = editFileMatch[1].trim();
      const codeMatch = response.match(/```(?:skript|sk)?\n([\s\S]*?)\n```/);
      if (codeMatch) {
        operations.push({
          type: 'edit',
          path: filePath,
          content: codeMatch[1]
        });
      }
    }

    // Check for file deletion requests
    const deleteFileMatch = response.match(/DELETE_FILE:\s*([^\n]+)/i);
    if (deleteFileMatch) {
      const filePath = deleteFileMatch[1].trim();
      operations.push({
        type: 'delete',
        path: filePath
      });
    }

    // Check for rename requests
    const renameMatch = response.match(/RENAME:\s*([^\n]+)\s*->\s*([^\n]+)/i);
    if (renameMatch) {
      const oldPath = renameMatch[1].trim();
      const newName = renameMatch[2].trim();
      operations.push({
        type: 'rename',
        path: oldPath,
        newName
      });
    }

    return operations;
  }

  /**
   * Execute file operations on the file tree
   */
  private async executeFileOperations(
    operations: FileOperation[],
    fileTree: FileTree,
    onTreeUpdate: (tree: FileTree) => void,
    onFileOpen: (file: FileLeaf) => void
  ): Promise<FileTree> {
    let updatedTree = fileTree;

    for (const operation of operations) {
      try {
        switch (operation.type) {
          case 'create':
            if (operation.path.endsWith('/') || !operation.path.includes('.')) {
              // Create folder
              const folderName = operation.path.replace(/\/$/, '');
              const newFolder = createFolder(folderName);
              updatedTree = addChild(updatedTree, updatedTree.id, newFolder);
              console.log("📁 Created folder:", folderName);
            } else {
              // Create file
              const pathParts = operation.path.split('/');
              const fileName = pathParts.pop()!;
              const folderPath = pathParts.join('/');
              
              let targetParentId = updatedTree.id;
              
              // Create folder structure if needed
              if (folderPath) {
                for (const folderName of folderPath.split('/')) {
                  let existingFolder = this.findFolderByName(updatedTree, folderName, targetParentId);
                  if (!existingFolder) {
                    const newFolder = createFolder(folderName);
                    updatedTree = addChild(updatedTree, targetParentId, newFolder);
                    targetParentId = newFolder.id;
                  } else {
                    targetParentId = existingFolder.id;
                  }
                }
              }
              
              const file = createFile(fileName, operation.content || '');
              updatedTree = addChild(updatedTree, targetParentId, file);
              onFileOpen(file);
              console.log("📄 Created file:", operation.path);
            }
            break;

          case 'edit':
            const fileToEdit = this.findFileByPath(updatedTree, operation.path);
            if (fileToEdit && isFile(fileToEdit)) {
              updatedTree = updateFileContent(updatedTree, fileToEdit.id, operation.content || '');
              console.log("✏️ Edited file:", operation.path);
            }
            break;

          case 'delete':
            const fileToDelete = this.findFileByPath(updatedTree, operation.path);
            if (fileToDelete) {
              updatedTree = removeNode(updatedTree, fileToDelete.id);
              console.log("🗑️ Deleted file:", operation.path);
            }
            break;

          case 'rename':
            const fileToRename = this.findFileByPath(updatedTree, operation.path);
            if (fileToRename && operation.newName) {
              updatedTree = renameNode(updatedTree, fileToRename.id, operation.newName);
              console.log("🔄 Renamed file:", operation.path, "->", operation.newName);
            }
            break;
        }
      } catch (error) {
        console.error(`❌ Error executing operation ${operation.type}:`, error);
      }
    }

    onTreeUpdate(updatedTree);
    return updatedTree;
  }

  /**
   * Find folder by name within a specific parent
   */
  private findFolderByName(tree: FileTree, name: string, parentId: string): FileNode | null {
    const parent = findNode(tree, parentId);
    if (!parent || !isFolder(parent)) return null;

    return parent.children.find(child => child.name === name) || null;
  }

  /**
   * Find file by path
   */
  private findFileByPath(tree: FileTree, path: string): FileNode | null {
    const pathParts = path.split('/');
    let current = tree as FileNode;

    for (const part of pathParts) {
      if (!isFolder(current)) return null;
      const child = current.children.find(c => c.name === part);
      if (!child) return null;
      current = child;
    }

    return current;
  }

  /**
   * Generate basic content for new files
   */
  private generateBasicContent(filePath: string, userInput: string): string {
    if (filePath.endsWith('.sk')) {
      const lowerInput = userInput.toLowerCase();
      
      if (lowerInput.includes('teleport') || lowerInput.includes('tp')) {
        return `# Teleport command
command /tp <player> <target>:
    permission: teleport.use
    trigger:
        teleport arg-1 to arg-2
        send "&aTeleported!" to sender`;
      }
      
      if (lowerInput.includes('heal')) {
        return `# Heal command
command /heal [player]:
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
  }

  /**
   * Clean response message by removing operation markers
   */
  private cleanResponseMessage(response: string): string {
    return response
      .replace(/CREATE_FILE:\s*[^\n]+\n?/gi, '')
      .replace(/CREATE_FOLDER:\s*[^\n]+\n?/gi, '')
      .replace(/EDIT_FILE:\s*[^\n]+\n?/gi, '')
      .replace(/DELETE_FILE:\s*[^\n]+\n?/gi, '')
      .replace(/RENAME:\s*[^\n]+\s*->\s*[^\n]+\n?/gi, '')
      .trim();
  }

  /**
   * Test the AI agent with a simple request
   */
  async test(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-pro",
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.1,
        },
      });

      const result = await model.generateContent("Say hello");
      const response = await result.response;
      const text = response.text();

      console.log("✅ AI Agent test successful, response:", text);
      return text.length > 0;
    } catch (error) {
      console.error("❌ AI Agent test failed:", error);
      return false;
    }
  }
}