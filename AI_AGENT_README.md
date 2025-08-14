# SkriptPanda AI Agent 🤖

A powerful AI agent for SkriptLang development, built with Gemini 2.5 Pro and integrated into the SkriptPanda Studio IDE.

## 🚀 Features

### Core Capabilities
- **File & Folder Management**: Create, edit, delete, and rename files and folders
- **SkriptLang Code Generation**: Write proper SkriptLang code with correct syntax
- **Google Search Integration**: Research latest SkriptLang features and syntax
- **Project Context Awareness**: Understand and analyze your entire project structure
- **Conversation Memory**: Maintain context across multiple interactions

### AI Model
- **Model**: Gemini 2.5 Pro
- **Search Grounding**: Google Search tool for real-time research
- **System Prompt**: Optimized for SkriptLang development
- **Token Limit**: 8,192 tokens for comprehensive responses

## 🛠️ Technical Implementation

### Architecture
```
src/
├── lib/
│   ├── ai-agent.ts          # Main AI Agent class
│   ├── ai-agent-test.ts     # Test utilities
│   └── gemini.ts           # Gemini API integration
├── components/
│   └── chat/
│       └── NewAIChat.tsx   # React component
└── pages/
    └── Index.tsx           # Main app integration
```

### Key Components

#### AIAgent Class (`src/lib/ai-agent.ts`)
- **processRequest()**: Main method for handling user requests
- **buildProjectContext()**: Creates comprehensive project context
- **parseFileOperations()**: Extracts file operations from AI responses
- **executeFileOperations()**: Performs file system operations
- **test()**: Validates API connectivity

#### NewAIChat Component (`src/components/chat/NewAIChat.tsx`)
- Modern chat interface with markdown support
- API key management
- Real-time file operation feedback
- Conversation history persistence

## 📝 Usage

### Getting Started
1. **Get API Key**: Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Set API Key**: Enter your API key in the chat interface
3. **Start Chatting**: Press `Ctrl+L` to open the AI Agent

### Example Commands

#### File Operations
```
"Create a folder called 'commands'"
"Create a file called 'teleport.sk' with a teleport command"
"Delete the file 'old-script.sk'"
"Rename 'script.sk' to 'main.sk'"
```

#### Code Generation
```
"Create a teleport command script"
"Add a heal command to my existing script"
"Create a join event that gives players a welcome message"
"Write a script that creates a custom item"
```

#### Research & Learning
```
"Research the latest SkriptLang join event syntax"
"What's the correct syntax for custom commands?"
"Show me examples of SkriptLang loops"
```

## 🔧 Configuration

### AIAgentConfig Interface
```typescript
interface AIAgentConfig {
  apiKey: string;           // Gemini API key
  useGoogleSearch?: boolean; // Enable Google Search (default: true)
  maxTokens?: number;       // Max response tokens (default: 8192)
  temperature?: number;     // Response creativity (default: 0.7)
}
```

### System Prompt
The AI Agent uses a specialized system prompt optimized for SkriptLang development:
- Emphasizes correct syntax and research
- References official SkriptLang documentation
- Provides guidance for file operations
- Maintains conversation context

## 🧪 Testing

### Manual Testing
```typescript
import { runAllTests } from './lib/ai-agent-test';

// Run all tests
await runAllTests(apiKey);
```

### Test Functions
- **testAIAgent()**: Validates API connectivity
- **testFileOperations()**: Tests file system operations
- **runAllTests()**: Executes all test suites

## 🔍 File Operation Parsing

The AI Agent parses responses for file operations using specific markers:

### Create Operations
```
CREATE_FILE: path/to/file.sk
CREATE_FOLDER: folder-name
```

### Edit Operations
```
EDIT_FILE: path/to/file.sk
```

### Delete Operations
```
DELETE_FILE: path/to/file.sk
```

### Rename Operations
```
RENAME: old-name.sk -> new-name.sk
```

## 📊 Project Context

The AI Agent provides comprehensive project context including:
- **File Tree Structure**: Complete project hierarchy
- **File Contents**: All file contents (truncated for large files)
- **Project Statistics**: File counts, line counts, etc.
- **Conversation History**: Recent chat context

## 🚨 Error Handling

### API Errors
- Invalid API key detection
- Rate limiting handling
- Network connectivity issues
- Safety filter blocking

### File Operation Errors
- Invalid file paths
- Permission issues
- File system conflicts
- Operation failures

## 🔄 Integration Points

### File System Integration
- Uses existing `@/lib/fs` utilities
- Maintains file tree consistency
- Supports workspace management
- Preserves file metadata

### UI Integration
- Integrates with existing chat system
- Uses established UI components
- Maintains theme consistency
- Provides real-time feedback

## 🎯 Best Practices

### For Users
1. **Be Specific**: Provide clear, detailed requests
2. **Use Examples**: Reference existing code when asking for modifications
3. **Research First**: Ask the AI to research before implementing new features
4. **Review Code**: Always review generated code before using in production

### For Developers
1. **Test Thoroughly**: Use the test utilities to validate functionality
2. **Monitor Logs**: Check console logs for debugging information
3. **Handle Errors**: Implement proper error handling for all operations
4. **Update Context**: Ensure project context is always current

## 🔮 Future Enhancements

### Planned Features
- **Multi-file Operations**: Batch file operations
- **Code Analysis**: Advanced code review and suggestions
- **Template System**: Pre-built SkriptLang templates
- **Version Control**: Git integration for file operations
- **Collaboration**: Multi-user chat sessions

### Potential Improvements
- **Custom Prompts**: User-defined system prompts
- **Plugin System**: Extensible AI capabilities
- **Performance Optimization**: Caching and optimization
- **Advanced Search**: Semantic code search

## 📚 Documentation References

- [SkriptLang Documentation](https://skriptpanda-docs.netlify.app/render9.html)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Google AI Studio](https://aistudio.google.com/app/apikey)

## 🤝 Contributing

To contribute to the AI Agent:

1. **Fork the repository**
2. **Create a feature branch**
3. **Implement your changes**
4. **Add tests for new functionality**
5. **Submit a pull request**

## 📄 License

This AI Agent is part of the SkriptPanda Studio project and follows the same licensing terms.