#!/usr/bin/env node

import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

class CCMemCLI {
  constructor() {
    this.projectPath = process.cwd();
    this.dbPath = join(this.projectPath, '.claude', 'db', 'ccmem.sqlite');
  }

  async runMCPRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: "2.0",
        id: 1,
        method,
        params
      };

      const serverProcess = spawn('node', [join(import.meta.dirname, 'server.js')], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let responseData = '';
      let errorData = '';

      serverProcess.stdout.on('data', (data) => {
        responseData += data.toString();
      });

      serverProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      serverProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const lines = responseData.trim().split('\\n');
            const lastLine = lines[lines.length - 1];
            const response = JSON.parse(lastLine);
            resolve(response);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`Server exited with code ${code}: ${errorData}`));
        }
      });

      // Send the request
      serverProcess.stdin.write(JSON.stringify(request));
      serverProcess.stdin.end();
    });
  }

  async status() {
    try {
      if (!existsSync(this.dbPath)) {
        console.log('❌ CCMem not initialized in this project');
        console.log('Run `ccmem setup` to initialize');
        return;
      }

      const response = await this.runMCPRequest('call_tool', {
        name: 'ccmem_get_context',
        arguments: { focus: 'all' }
      });

      if (response.result && response.result.content && response.result.content[0]) {
        console.log('🧠 CCMem Project Status\\n');
        console.log(response.result.content[0].text);
      } else {
        console.log('📭 No project memory found');
      }
    } catch (error) {
      console.error('❌ Error getting status:', error.message);
    }
  }

  async search(query) {
    try {
      if (!existsSync(this.dbPath)) {
        console.log('❌ CCMem not initialized in this project');
        return;
      }

      if (!query) {
        console.log('❌ Please provide a search query');
        console.log('Usage: ccmem search "authentication"');
        return;
      }

      const response = await this.runMCPRequest('call_tool', {
        name: 'ccmem_search',
        arguments: { query }
      });

      if (response.result && response.result.content && response.result.content[0]) {
        console.log(response.result.content[0].text);
      } else {
        console.log(`📭 No results found for "${query}"`);
      }
    } catch (error) {
      console.error('❌ Error searching:', error.message);
    }
  }

  async context(focus = 'all') {
    try {
      if (!existsSync(this.dbPath)) {
        console.log('❌ CCMem not initialized in this project');
        return;
      }

      const response = await this.runMCPRequest('call_tool', {
        name: 'ccmem_get_context',
        arguments: { focus }
      });

      if (response.result && response.result.content && response.result.content[0]) {
        console.log(response.result.content[0].text);
      } else {
        console.log('📭 No project context found');
      }
    } catch (error) {
      console.error('❌ Error getting context:', error.message);
    }
  }

  async learn(type, ...args) {
    try {
      let toolName, arguments_;

      switch (type) {
        case 'setting':
          if (args.length < 3) {
            console.log('Usage: ccmem learn setting <category> <key> <value> [description]');
            return;
          }
          toolName = 'ccmem_learn_setting';
          arguments_ = {
            category: args[0],
            key: args[1],
            value: args[2],
            description: args[3] || null
          };
          break;

        case 'architecture':
          if (args.length < 3) {
            console.log('Usage: ccmem learn architecture <component> <description> <tech_stack>');
            return;
          }
          toolName = 'ccmem_learn_architecture';
          arguments_ = {
            component: args[0],
            description: args[1],
            tech_stack: args[2]
          };
          break;

        default:
          console.log('Available learn types: setting, architecture');
          return;
      }

      const response = await this.runMCPRequest('call_tool', {
        name: toolName,
        arguments: arguments_
      });

      if (response.result && response.result.content && response.result.content[0]) {
        console.log(response.result.content[0].text);
      } else {
        console.log('✅ Learning recorded');
      }
    } catch (error) {
      console.error('❌ Error learning:', error.message);
    }
  }

  showHelp() {
    console.log(`
🧠 CCMem - Claude Code Memory

Usage:
  ccmem setup                                    Initialize CCMem in current project
  ccmem status                                   Show project status and memory
  ccmem search <query>                          Search project memory
  ccmem context [focus]                         Get project context (all, settings, architecture, current, recent)
  ccmem learn setting <cat> <key> <value>      Learn a project setting
  ccmem learn architecture <comp> <desc> <tech> Learn architecture info
  ccmem help                                    Show this help

Examples:
  ccmem setup
  ccmem status
  ccmem search "authentication"
  ccmem context architecture
  ccmem learn setting start command "npm start"
  ccmem learn architecture "API Server" "REST API using Express" "Node.js,Express,PostgreSQL"

For Claude Code integration, CCMem works automatically through MCP server and hooks.
    `);
  }
}

// CLI interface
const cli = new CCMemCLI();
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'setup':
    // Dynamic import for setup
    import('./setup.js').then(() => {
      const { spawn } = require('child_process');
      spawn('node', [join(import.meta.dirname, 'setup.js'), 'setup'], { stdio: 'inherit' });
    });
    break;

  case 'status':
    cli.status();
    break;

  case 'search':
    cli.search(args[0]);
    break;

  case 'context':
    cli.context(args[0]);
    break;

  case 'learn':
    cli.learn(args[0], ...args.slice(1));
    break;

  case 'help':
  case '--help':
  case '-h':
  default:
    cli.showHelp();
    break;
}