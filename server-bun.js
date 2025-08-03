#!/usr/bin/env bun

import { Database } from "bun:sqlite";
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CCMemServer {
  constructor() {
    this.initializeDatabase();
    this.setupMCPHandlers();
  }

  initializeDatabase() {
    try {
      // Get current working directory (project root)
      this.projectPath = process.cwd();
      
      // Create .claude/db directory if it doesn't exist
      const claudeDir = join(this.projectPath, '.claude', 'db');
      if (!existsSync(claudeDir)) {
        mkdirSync(claudeDir, { recursive: true });
      }
      
      // Initialize SQLite database
      this.dbPath = join(claudeDir, 'ccmem.sqlite');
      this.db = new Database(this.dbPath);
      
      // Load and execute schema
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      this.db.exec(schema);
      
      // Enable WAL mode for better performance
      this.db.exec('PRAGMA journal_mode=WAL');
      
    } catch (error) {
      this.sendError(`Database initialization failed: ${error.message}`);
      process.exit(1);
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
        name: "ccmem",
        version: "1.0.0"
      }
    };
  }

  handleListTools() {
    return {
      tools: [
        {
          name: "ccmem_learn_setting",
          description: "Learn and store project settings (start, test, build commands, etc.)",
          inputSchema: {
            type: "object",
            properties: {
              category: { type: "string", description: "Setting category (start, test, build, deploy, env, config)" },
              key: { type: "string", description: "Setting key name" },
              value: { type: "string", description: "Setting value" },
              description: { type: "string", description: "Optional description" }
            },
            required: ["category", "key", "value"]
          }
        },
        {
          name: "ccmem_learn_architecture",
          description: "Learn and store architecture decisions and components",
          inputSchema: {
            type: "object",
            properties: {
              component: { type: "string", description: "Component name" },
              description: { type: "string", description: "Component description" },
              tech_stack: { type: "string", description: "Technologies used (comma-separated)" },
              file_paths: { type: "string", description: "Related file paths (comma-separated)" },
              patterns: { type: "string", description: "Design patterns used" }
            },
            required: ["component", "description", "tech_stack"]
          }
        },
        {
          name: "ccmem_learn_deployment",
          description: "Learn and store deployment procedures",
          inputSchema: {
            type: "object",
            properties: {
              environment: { type: "string", description: "Environment (dev, staging, production)" },
              target_host: { type: "string", description: "Target host or server" },
              deployment_steps: { type: "string", description: "Step-by-step deployment process" },
              test_verification: { type: "string", description: "How to verify deployment" },
              rollback_steps: { type: "string", description: "Rollback procedure" }
            },
            required: ["environment", "deployment_steps"]
          }
        },
        {
          name: "ccmem_create_story",
          description: "Create a user story (instead of GitHub PR)",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Story title" },
              description: { type: "string", description: "Story description" },
              priority: { type: "number", description: "Priority (1=critical, 5=low)" },
              files_affected: { type: "string", description: "Files that will be affected (comma-separated)" }
            },
            required: ["title", "description"]
          }
        },
        {
          name: "ccmem_create_task",
          description: "Create a development task",
          inputSchema: {
            type: "object",
            properties: {
              story_id: { type: "number", description: "Related story ID (optional)" },
              title: { type: "string", description: "Task title" },
              description: { type: "string", description: "Task description" },
              files_affected: { type: "string", description: "Files to be modified" },
              implementation_notes: { type: "string", description: "Implementation notes" }
            },
            required: ["title", "description"]
          }
        },
        {
          name: "ccmem_log_defect",
          description: "Log a bug or defect",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Bug title" },
              description: { type: "string", description: "Bug description" },
              severity: { type: "string", description: "Severity (critical, high, medium, low)" },
              files_affected: { type: "string", description: "Files affected by bug" },
              story_id: { type: "number", description: "Related story ID (optional)" },
              task_id: { type: "number", description: "Related task ID (optional)" }
            },
            required: ["title", "description"]
          }
        },
        {
          name: "ccmem_record_lesson",
          description: "Record lessons learned from development",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Lesson title" },
              description: { type: "string", description: "Detailed lesson description" },
              category: { type: "string", description: "Category (architecture, performance, security, process)" },
              impact_level: { type: "string", description: "Impact level (critical, high, medium, low)" },
              related_files: { type: "string", description: "Related files (comma-separated)" },
              tags: { type: "string", description: "Tags (comma-separated)" }
            },
            required: ["title", "description", "category"]
          }
        },
        {
          name: "ccmem_add_knowledge",
          description: "Add general project knowledge or notes",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Knowledge title" },
              content: { type: "string", description: "Knowledge content" },
              category: { type: "string", description: "Category (general, process, reference, reminder)" },
              tags: { type: "string", description: "Tags (comma-separated)" }
            },
            required: ["title", "content"]
          }
        },
        {
          name: "ccmem_get_context",
          description: "Get project context and memory for development assistance",
          inputSchema: {
            type: "object",
            properties: {
              focus: { type: "string", description: "Focus area (all, settings, architecture, current, recent)" }
            }
          }
        },
        {
          name: "ccmem_search",
          description: "Search project memory",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              category: { type: "string", description: "Limit to category (optional)" }
            },
            required: ["query"]
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
      case 'ccmem_learn_architecture':
        return this.learnArchitecture(args);
      case 'ccmem_learn_deployment':
        return this.learnDeployment(args);
      case 'ccmem_create_story':
        return this.createStory(args);
      case 'ccmem_create_task':
        return this.createTask(args);
      case 'ccmem_log_defect':
        return this.logDefect(args);
      case 'ccmem_record_lesson':
        return this.recordLesson(args);
      case 'ccmem_add_knowledge':
        return this.addKnowledge(args);
      case 'ccmem_get_context':
        return this.getContext(args);
      case 'ccmem_search':
        return this.search(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  learnSetting(args) {
    const { category, key, value, description } = args;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (category, key_name, value, description, updated_at)
      VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(category, key, value, description || null);
    
    return {
      content: [{
        type: "text",
        text: `✅ Learned setting: ${category}.${key} = "${value}"\n\nI'll remember this project configuration for future development assistance.`
      }]
    };
  }

  learnArchitecture(args) {
    const { component, description, tech_stack, file_paths, patterns } = args;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO architecture (component, description, tech_stack, file_paths, patterns, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(component, description, tech_stack, file_paths || null, patterns || null);
    
    return {
      content: [{
        type: "text",
        text: `🏗️ Learned architecture: ${component}\n\nTech stack: ${tech_stack}\n\nI'll use this knowledge for future architectural decisions and code analysis.`
      }]
    };
  }

  learnDeployment(args) {
    const { environment, target_host, deployment_steps, test_verification, rollback_steps } = args;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO deployment (environment, target_host, deployment_steps, test_verification, rollback_steps, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(environment, target_host || null, deployment_steps, test_verification || null, rollback_steps || null);
    
    return {
      content: [{
        type: "text",
        text: `🚀 Learned deployment for ${environment}\n\nI'll remember these deployment procedures for future releases.`
      }]
    };
  }

  createStory(args) {
    const { title, description, priority, files_affected } = args;
    
    const stmt = this.db.prepare(`
      INSERT INTO story (title, description, priority, files_affected)
      VALUES (?1, ?2, ?3, ?4)
    `);
    
    const result = stmt.run(title, description, priority || 3, files_affected || null);
    
    return {
      content: [{
        type: "text",
        text: `📖 Created story #${result.lastInsertRowid}: ${title}\n\nThis replaces traditional GitHub PRs with intelligent project memory.`
      }]
    };
  }

  createTask(args) {
    const { story_id, title, description, files_affected, implementation_notes } = args;
    
    const stmt = this.db.prepare(`
      INSERT INTO task (story_id, title, description, files_affected, implementation_notes)
      VALUES (?1, ?2, ?3, ?4, ?5)
    `);
    
    const result = stmt.run(story_id || null, title, description, files_affected || null, implementation_notes || null);
    
    return {
      content: [{
        type: "text",
        text: `✅ Created task #${result.lastInsertRowid}: ${title}\n\n${story_id ? `Linked to story #${story_id}` : 'Standalone task'}`
      }]
    };
  }

  logDefect(args) {
    const { title, description, severity, files_affected, story_id, task_id } = args;
    
    const stmt = this.db.prepare(`
      INSERT INTO defect (title, description, severity, files_affected, story_id, task_id)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    `);
    
    const result = stmt.run(title, description, severity || 'medium', files_affected || null, story_id || null, task_id || null);
    
    return {
      content: [{
        type: "text",
        text: `🐛 Logged defect #${result.lastInsertRowid}: ${title}\n\nSeverity: ${severity || 'medium'}`
      }]
    };
  }

  recordLesson(args) {
    const { title, description, category, impact_level, related_files, tags } = args;
    
    const stmt = this.db.prepare(`
      INSERT INTO lessons (title, description, category, impact_level, related_files, tags)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    `);
    
    const result = stmt.run(title, description, category, impact_level || 'medium', related_files || null, tags || null);
    
    return {
      content: [{
        type: "text",
        text: `🧠 Recorded lesson: ${title}\n\nCategory: ${category}\nImpact: ${impact_level || 'medium'}\n\nThis wisdom will guide future development decisions.`
      }]
    };
  }

  addKnowledge(args) {
    const { title, content, category, tags } = args;
    
    const stmt = this.db.prepare(`
      INSERT INTO knowledge (title, content, category, tags)
      VALUES (?1, ?2, ?3, ?4)
    `);
    
    const result = stmt.run(title, content, category || 'general', tags || null);
    
    return {
      content: [{
        type: "text",
        text: `📚 Added knowledge: ${title}\n\nThis information is now part of my project memory.`
      }]
    };
  }

  getContext(args) {
    const { focus = 'all' } = args;
    
    let context = [];
    
    try {
      // Get project status
      const status = this.db.prepare('SELECT * FROM project_status').get();
      
      context.push(`## 🎯 Project Status`);
      context.push(`- Active Stories: ${status?.active_stories || 0}`);
      context.push(`- Pending Tasks: ${status?.pending_tasks || 0}`);
      context.push(`- Open Defects: ${status?.open_defects || 0}`);
      context.push(`- Lessons Learned: ${status?.lessons_count || 0}`);
      
      if (status?.start_command) {
        context.push(`- Start Command: \`${status.start_command}\``);
      }
      if (status?.test_command) {
        context.push(`- Test Command: \`${status.test_command}\``);
      }
      
      if (focus === 'all' || focus === 'settings') {
        // Get key settings
        const settings = this.db.prepare('SELECT * FROM settings ORDER BY category, key_name').all();
        if (settings.length > 0) {
          context.push(`\\n## ⚙️ Key Settings`);
          settings.forEach(s => {
            context.push(`- ${s.category}.${s.key_name}: \`${s.value}\``);
          });
        }
      }
      
      if (focus === 'all' || focus === 'architecture') {
        // Get architecture overview
        const arch = this.db.prepare('SELECT * FROM architecture ORDER BY component').all();
        if (arch.length > 0) {
          context.push(`\\n## 🏗️ Architecture`);
          arch.forEach(a => {
            context.push(`- **${a.component}**: ${a.description}`);
            context.push(`  - Tech: ${a.tech_stack}`);
          });
        }
      }
      
      if (focus === 'all' || focus === 'current') {
        // Get current work
        const activeStories = this.db.prepare(`
          SELECT * FROM story WHERE status = 'active' ORDER BY priority, created_at DESC LIMIT 3
        `).all();
        
        if (activeStories.length > 0) {
          context.push(`\\n## 📖 Active Stories`);
          activeStories.forEach(s => {
            context.push(`- **Story #${s.id}**: ${s.title}`);
          });
        }
        
        const pendingTasks = this.db.prepare(`
          SELECT * FROM task WHERE status IN ('todo', 'in_progress') ORDER BY created_at DESC LIMIT 5
        `).all();
        
        if (pendingTasks.length > 0) {
          context.push(`\\n## ✅ Pending Tasks`);
          pendingTasks.forEach(t => {
            context.push(`- **Task #${t.id}**: ${t.title} (${t.status})`);
          });
        }
      }
      
      if (focus === 'all' || focus === 'recent') {
        // Get recent lessons
        const recentLessons = this.db.prepare(`
          SELECT * FROM lessons ORDER BY created_at DESC LIMIT 3
        `).all();
        
        if (recentLessons.length > 0) {
          context.push(`\\n## 🧠 Recent Lessons`);
          recentLessons.forEach(l => {
            context.push(`- **${l.title}** (${l.category}): ${l.description.substring(0, 100)}...`);
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

  search(args) {
    const { query, category } = args;
    
    let results = [];
    const searchTerm = `%${query.toLowerCase()}%`;
    
    try {
      // Search stories
      let stmt = this.db.prepare(`
        SELECT 'story' as type, id, title, description, created_at 
        FROM story 
        WHERE LOWER(title) LIKE ?1 OR LOWER(description) LIKE ?1
        ORDER BY created_at DESC LIMIT 5
      `);
      results.push(...stmt.all(searchTerm));
      
      // Search tasks
      stmt = this.db.prepare(`
        SELECT 'task' as type, id, title, description, created_at 
        FROM task 
        WHERE LOWER(title) LIKE ?1 OR LOWER(description) LIKE ?1
        ORDER BY created_at DESC LIMIT 5
      `);
      results.push(...stmt.all(searchTerm));
      
      // Search lessons
      stmt = this.db.prepare(`
        SELECT 'lesson' as type, id, title, description, created_at 
        FROM lessons 
        WHERE LOWER(title) LIKE ?1 OR LOWER(description) LIKE ?1
        ORDER BY created_at DESC LIMIT 5
      `);
      results.push(...stmt.all(searchTerm));
      
      // Search knowledge
      stmt = this.db.prepare(`
        SELECT 'knowledge' as type, id, title, content as description, created_at 
        FROM knowledge 
        WHERE LOWER(title) LIKE ?1 OR LOWER(content) LIKE ?1
        ORDER BY created_at DESC LIMIT 5
      `);
      results.push(...stmt.all(searchTerm));
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Search error: ${error.message}`
        }]
      };
    }
    
    if (results.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No results found for "${query}"`
        }]
      };
    }
    
    let response = [`## 🔍 Search Results for "${query}"\\n`];
    
    results.forEach(r => {
      response.push(`**${r.type.toUpperCase()} #${r.id}**: ${r.title}`);
      response.push(`${r.description.substring(0, 150)}...\\n`);
    });
    
    return {
      content: [{
        type: "text",
        text: response.join('\\n')
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
const server = new CCMemServer();