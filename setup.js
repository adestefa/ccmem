#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CCMemSetup {
  constructor() {
    this.projectPath = process.cwd();
    this.claudeDir = join(process.env.HOME, '.claude');
    this.projectClaudeDir = join(this.projectPath, '.claude');
  }

  async setup() {
    console.log('🧠 Setting up CCMem - Claude Code Memory\\n');
    
    try {
      // Step 1: Create project .claude directory
      this.createProjectDirectories();
      
      // Step 2: Setup global Claude Code configuration
      this.setupGlobalConfiguration();
      
      // Step 3: Install hooks
      this.installHooks();
      
      // Step 4: Initialize database
      this.initializeDatabase();
      
      // Step 5: Verify installation
      this.verifyInstallation();
      
      console.log('\\n✅ CCMem setup complete!\\n');
      console.log('🎯 Next steps:');
      console.log('1. Restart Claude Code to load the MCP server');
      console.log('2. Start a conversation - CCMem will begin learning automatically');
      console.log('3. Use `ccmem context` to see what Claude remembers about your project\\n');
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  createProjectDirectories() {
    console.log('📁 Creating project directories...');
    
    const dirs = [
      join(this.projectPath, '.claude'),
      join(this.projectPath, '.claude', 'db'),
      join(this.projectPath, '.claude', 'config')
    ];
    
    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`   Created: ${dir}`);
      }
    });
  }

  setupGlobalConfiguration() {
    console.log('\\n⚙️  Setting up global Claude Code configuration...');
    
    // Ensure ~/.claude directory exists
    if (!existsSync(this.claudeDir)) {
      mkdirSync(this.claudeDir, { recursive: true });
    }
    
    // Setup MCP servers configuration
    const mcpConfigPath = join(this.claudeDir, 'mcp_servers.json');
    let mcpConfig = {};
    
    if (existsSync(mcpConfigPath)) {
      try {
        mcpConfig = JSON.parse(readFileSync(mcpConfigPath, 'utf8'));
      } catch (error) {
        console.log('   Creating new MCP configuration...');
      }
    }
    
    if (!mcpConfig.mcpServers) {
      mcpConfig.mcpServers = {};
    }
    
    // Add CCMem server
    mcpConfig.mcpServers.ccmem = {
      command: "ccmem",
      args: [],
      description: "Project memory system for Claude Code"
    };
    
    writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
    console.log(`   Updated: ${mcpConfigPath}`);
  }

  installHooks() {
    console.log('\\n🪝 Installing Claude Code hooks...');
    
    const hooksDir = join(this.claudeDir, 'hooks');
    if (!existsSync(hooksDir)) {
      mkdirSync(hooksDir, { recursive: true });
    }
    
    // Copy hook scripts
    const hookFiles = [
      'session_start.py',
      'session_end.py', 
      'tool_complete.py',
      'assistant_response.py'
    ];
    
    const sourceHooksDir = join(__dirname, 'hooks');
    
    hookFiles.forEach(hookFile => {
      const sourcePath = join(sourceHooksDir, hookFile);
      const destPath = join(hooksDir, hookFile);
      
      if (existsSync(sourcePath)) {
        copyFileSync(sourcePath, destPath);
        console.log(`   Installed: ${hookFile}`);
        
        // Make executable
        try {
          execSync(`chmod +x "${destPath}"`);
        } catch (error) {
          // Ignore chmod errors on non-Unix systems
        }
      }
    });
    
    // Setup hooks configuration
    const hooksConfigPath = join(this.claudeDir, 'hooks_config.json');
    const hooksConfig = {
      hooks: {
        session_start: {
          enabled: true,
          script: "session_start.py",
          description: "Initialize project context and load memory"
        },
        session_end: {
          enabled: true,
          script: "session_end.py",
          description: "Save session summary and capture milestones"
        },
        tool_complete: {
          enabled: true,
          script: "tool_complete.py",
          description: "Capture significant development actions"
        },
        assistant_response: {
          enabled: true,
          script: "assistant_response.py",
          description: "Extract and save architectural insights"
        }
      },
      settings: {
        min_response_length: 100,
        capture_tool_types: ["Edit", "Write", "MultiEdit", "Bash"],
        ignore_patterns: ["npm install", "git status", "ls", "pwd"],
        auto_categorize: true
      }
    };
    
    writeFileSync(hooksConfigPath, JSON.stringify(hooksConfig, null, 2));
    console.log(`   Created: hooks_config.json`);
  }

  initializeDatabase() {
    console.log('\\n🗄️  Initializing project database...');
    
    try {
      // Use the ccmem server to initialize the database
      const { spawn } = require('child_process');
      
      const initRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize"
      };
      
      // This will create the database when the server starts
      console.log('   Database will be created on first use');
      
    } catch (error) {
      console.log('   Database will be initialized when CCMem first runs');
    }
  }

  verifyInstallation() {
    console.log('\\n🔍 Verifying installation...');
    
    const checks = [
      {
        name: 'Project .claude directory',
        path: join(this.projectPath, '.claude'),
        required: true
      },
      {
        name: 'Global MCP configuration',
        path: join(this.claudeDir, 'mcp_servers.json'),
        required: true
      },
      {
        name: 'Hooks directory',
        path: join(this.claudeDir, 'hooks'),
        required: true
      },
      {
        name: 'Hooks configuration',
        path: join(this.claudeDir, 'hooks_config.json'),
        required: true
      }
    ];
    
    let allPassed = true;
    
    checks.forEach(check => {
      const exists = existsSync(check.path);
      const status = exists ? '✅' : (check.required ? '❌' : '⚠️');
      console.log(`   ${status} ${check.name}`);
      
      if (check.required && !exists) {
        allPassed = false;
      }
    });
    
    if (!allPassed) {
      throw new Error('Some required components failed to install');
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
    default:
      const setup = new CCMemSetup();
      setup.setup();
      break;
  }
}