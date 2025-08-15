# SkriptPanda Studio - MCP-Powered AI System

## Overview

SkriptPanda Studio now features an intelligent AI assistant powered by the **Model Context Protocol (MCP)** and **Gemini 2.5 Pro**. This system provides direct file system manipulation capabilities and intelligent Skript code generation.

## Key Features

### 🔧 File Operations
- **Create Files**: Generate new Skript files with intelligent content
- **Edit Files**: Modify existing files with context-aware changes
- **Read Files**: Access and analyze file contents
- **Delete Files**: Remove files and folders safely

### 📁 Folder Management
- **Create Folders**: Build organized project structures
- **List Contents**: Browse directory contents
- **Navigate Hierarchy**: Understand project organization

### 🧠 Intelligent Code Generation
- **Skript Syntax**: Proper SkriptLang syntax with validation
- **Documentation Research**: Automatic reference to SkriptPanda docs
- **Context Awareness**: Understands existing project structure
- **Error Handling**: Robust error management and recovery

## System Architecture

### Core Components

1. **SkriptPandaMCPAgent** (`src/lib/mcp-agent.ts`)
   - MCP server implementation
   - Tool registration and management
   - File system operations
   - Resource management

2. **SkriptPandaMCPClient** (`src/lib/mcp-client.ts`)
   - MCP client interface
   - Gemini API integration
   - Command processing and analysis
   - Tool execution coordination

3. **AI Commands** (`src/lib/ai-commands.ts`)
   - Main entry point for AI interactions
   - MCP client initialization
   - Legacy compatibility layer

### Available Tools

The MCP agent provides these tools:

- `create-file`: Create new files with content
- `create-folder`: Create directory structures
- `edit-file`: Modify existing file contents
- `read-file`: Read file contents
- `delete-item`: Remove files or folders
- `list-directory`: Browse directory contents
- `generate-skript`: Generate Skript code with AI

### System Prompt

The AI operates with this system prompt:

```
You will write skript code, with correct syntax, and always research before writing any code. 
You can use https://skriptpanda-docs.netlify.app/render9.html docs, it has all skript events, 
but there are only some of the addons, so always research before writing skript code
```

## Usage Examples

### Creating Files
```
"Create a teleport command in commands/teleport.sk"
"Generate a join event script with welcome messages"
"Make a new file called utils.sk with helper functions"
```

### Managing Folders
```
"Create a folder called commands"
"Make a scripts/events directory structure"
"Show me what's in the scripts folder"
```

### Editing Files
```
"Edit the main.sk file to add error handling"
"Update teleport.sk to include permission checks"
"Add comments to the join event script"
```

### Code Generation
```
"Write a heal command with permission checks"
"Generate a player join/leave event handler"
"Create a simple economy system script"
```

## Technical Implementation

### MCP Integration
- Uses `@modelcontextprotocol/sdk` for MCP functionality
- Implements both server and client components
- Provides tool-based architecture for extensibility

### Gemini API Integration
- Leverages Gemini 2.5 Pro for intelligent responses
- Includes web search capabilities for documentation research
- Context-aware code generation with project understanding

### File System Operations
- Direct manipulation of the virtual file system
- Real-time updates to the UI
- Automatic folder creation for nested paths
- Safe error handling and recovery

## Benefits Over Previous System

### Before (Simple Prompts)
- Limited to basic pattern matching
- No direct file system access
- Manual file creation required
- No context awareness

### After (MCP-Powered)
- Intelligent command analysis
- Direct file and folder manipulation
- Automatic code generation
- Full project context understanding
- Tool-based extensible architecture
- Research capabilities with documentation

## Future Enhancements

- Additional tools for project management
- Integration with version control systems
- Advanced code analysis and refactoring
- Multi-file operations and batch processing
- Custom tool development for specific workflows

## Dependencies

- `@modelcontextprotocol/sdk`: MCP implementation
- `zod`: Schema validation
- `@google/generative-ai`: Gemini API integration

The new MCP-powered AI system transforms SkriptPanda Studio into a truly intelligent development environment with direct file system capabilities and advanced code generation features.
