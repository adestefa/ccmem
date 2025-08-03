#!/usr/bin/env node

// Simple Node.js MCP server for CCMem
// Uses JSON file storage instead of SQLite for Node.js compatibility

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CCMemNodeServer {
  constructor() {
    this.initializeStorage();
    this.setupMCPHandlers();
  }

  initializeStorage() {
    try {
      // Get current working directory (project root)
      this.projectPath = process.cwd();
      
      // Create .claude/db directory if it doesn't exist
      const claudeDir = join(this.projectPath, '.claude', 'db');
      if (!existsSync(claudeDir)) {
        mkdirSync(claudeDir, { recursive: true });
      }
      
      // Use JSON file for Node.js compatibility
      this.dbPath = join(claudeDir, 'ccmem.json');
      
      // Initialize storage structure
      if (!existsSync(this.dbPath)) {
        this.data = {
          settings: [],
          architecture: [],
          deployment: [],
          story: [],
          task: [],
          defect: [],
          lessons: [],
          knowledge: []
        };
        this.saveData();
      } else {
        this.loadData();
      }
      
    } catch (error) {
      this.sendError(`Storage initialization failed: ${error.message}`);
      process.exit(1);
    }
  }

  loadData() {
    try {
      const data = readFileSync(this.dbPath, 'utf8');
      this.data = JSON.parse(data);
    } catch (error) {
      this.data = {
        settings: [],
        architecture: [],
        deployment: [],
        story: [],
        task: [],
        defect: [],
        lessons: [],
        knowledge: []
      };
    }
  }

  saveData() {
    try {
      writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  setupMCPHandlers() {
    process.stdin.on('data', (data) => {
      try {
        const request = JSON.parse(data.toString());
        this.handleMCPRequest(request);
      } catch (error) {
        this.sendError(`Invalid JSON: ${error.message}`);
      }
    });
  }

  async handleMCPRequest(request) {
    const { id, method, params } = request;

    try {
      let result;
      
      switch (method) {
        case 'initialize':
          result = this.handleInitialize();
          break;
        case 'list_tools':
          result = this.handleListTools();
          break;
        case 'call_tool':
          result = await this.handleCallTool(params);
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }

      this.sendResponse(id, result);
    } catch (error) {
      this.sendError(error.message, id);
    }
  }

  handleInitialize() {
    return {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: "ccmem-node",
        version: "1.0.0"
      }
    };
  }

  handleListTools() {
    return {
      tools: [
        {
          name: "ccmem_learn_setting",
          description: "Learn and store project settings",
          inputSchema: {
            type: "object",
            properties: {
              category: { type: "string", description: "Setting category" },
              key: { type: "string", description: "Setting key name" },
              value: { type: "string", description: "Setting value" },
              description: { type: "string", description: "Optional description" }
            },
            required: ["category", "key", "value"]
          }
        },
        {
          name: "ccmem_get_context",
          description: "Get project context and memory",
          inputSchema: {
            type: "object",
            properties: {
              focus: { type: "string", description: "Focus area (all, settings, architecture)" }
            }
          }
        }
      ]
    };
  }

  async handleCallTool(params) {
    const { name, arguments: args } = params;

    switch (name) {
      case 'ccmem_learn_setting':
        return this.learnSetting(args);
      case 'ccmem_get_context':
        return this.getContext(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  learnSetting(args) {
    const { category, key, value, description } = args;
    
    // Remove existing setting with same category/key
    this.data.settings = this.data.settings.filter(
      s => !(s.category === category && s.key_name === key)
    );
    
    // Add new setting
    this.data.settings.push({
      id: Date.now(),
      category,
      key_name: key,
      value,
      description: description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    this.saveData();
    
    return {
      content: [{
        type: "text",
        text: `✅ Learned setting: ${category}.${key} = "${value}"\n\nI'll remember this project configuration for future development assistance.`
      }]
    };
  }

  getContext(args) {
    const { focus = 'all' } = args;
    
    let context = [];
    
    try {
      const settingsCount = this.data.settings.length;
      const architectureCount = this.data.architecture.length;
      const storiesCount = this.data.story.filter(s => s.status === 'active').length;
      
      context.push(`## 🎯 Project Status`);
      context.push(`- Settings Learned: ${settingsCount}`);
      context.push(`- Architecture Components: ${architectureCount}`);
      context.push(`- Active Stories: ${storiesCount}`);
      
      if (focus === 'all' || focus === 'settings') {
        if (this.data.settings.length > 0) {
          context.push(`\\n## ⚙️ Key Settings`);
          this.data.settings.forEach(s => {
            context.push(`- ${s.category}.${s.key_name}: \`${s.value}\``);
          });
        }
      }
      
    } catch (error) {
      context.push(`Error loading context: ${error.message}`);
    }
    
    return {
      content: [{
        type: "text",
        text: context.join('\\n')
      }]
    };
  }

  sendResponse(id, result) {
    const response = {
      jsonrpc: "2.0",
      id,
      result
    };
    console.log(JSON.stringify(response));
  }

  sendError(message, id = null) {
    const error = {
      jsonrpc: "2.0",
      id,
      error: {
        code: -1,
        message
      }
    };
    console.error(JSON.stringify(error));
  }
}

// Start the server
const server = new CCMemNodeServer();