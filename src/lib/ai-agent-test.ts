import { AIAgent } from './ai-agent';
import { FileTree, createFile, createFolder } from './fs';

// Test function to verify AI Agent functionality
export const testAIAgent = async (apiKey: string): Promise<boolean> => {
  try {
    console.log("🧪 Testing AI Agent...");
    
    // Create a test AI Agent
    const agent = new AIAgent({
      apiKey,
      useGoogleSearch: true,
      maxTokens: 2048,
      temperature: 0.7
    });

    // Test basic API connectivity
    const isConnected = await agent.test();
    if (!isConnected) {
      console.error("❌ AI Agent test failed - API connectivity issue");
      return false;
    }

    console.log("✅ AI Agent test passed - API connectivity working");
    return true;

  } catch (error) {
    console.error("❌ AI Agent test failed:", error);
    return false;
  }
};

// Test function to verify file operations
export const testFileOperations = async (apiKey: string): Promise<boolean> => {
  try {
    console.log("🧪 Testing file operations...");
    
    // Create a test file tree
    const testTree: FileTree = {
      id: "root",
      name: "root",
      type: "folder",
      children: [
        createFile("test.sk", "# Test file\ncommand /test:\n    trigger:\n        send 'Hello World!' to sender")
      ]
    };

    // Create a test AI Agent
    const agent = new AIAgent({
      apiKey,
      useGoogleSearch: false, // Disable for testing
      maxTokens: 1024,
      temperature: 0.1
    });

    // Mock callbacks
    let updatedTree = testTree;
    let openedFile: any = null;

    const onTreeUpdate = (tree: FileTree) => {
      updatedTree = tree;
      console.log("📁 Tree updated");
    };

    const onFileOpen = (file: any) => {
      openedFile = file;
      console.log("📄 File opened:", file.name);
    };

    // Test a simple request
    const response = await agent.processRequest(
      "Create a folder called 'commands'",
      testTree,
      onTreeUpdate,
      onFileOpen
    );

    console.log("✅ File operations test completed");
    console.log("📝 Response:", response.message);
    console.log("🔧 Operations:", response.operations);
    
    return true;

  } catch (error) {
    console.error("❌ File operations test failed:", error);
    return false;
  }
};

// Export test functions
export const runAllTests = async (apiKey: string): Promise<void> => {
  console.log("🚀 Running AI Agent tests...");
  
  const agentTest = await testAIAgent(apiKey);
  const fileTest = await testFileOperations(apiKey);
  
  if (agentTest && fileTest) {
    console.log("✅ All tests passed!");
  } else {
    console.log("❌ Some tests failed");
  }
};