# CCMem - Claude Code Memory

A standardized MCP server that provides Claude Code with persistent project memory and context-aware development assistance.

## Overview

CCMem (Claude Code Memory) transforms Claude Code from a stateless assistant into a project-aware development partner by maintaining persistent memory across sessions. The system captures and stores project context, architectural decisions, development history, and accumulated knowledge.

### Key Features

- **Project Settings Management**: Stores and recalls start, test, build, and deployment commands
- **Architecture Documentation**: Maintains tech stack decisions, patterns, and design choices
- **Development History**: Tracks stories, tasks, bugs, and lessons learned
- **Knowledge Accumulation**: Builds context and insights over time
- **Zero Token Cost**: Uses local SQLite database instead of expensive embedding services
- **Automatic Capture**: Intelligent hooks capture development activity seamlessly

## Installation

### Quick Install (Recommended)

Use Claude's built-in MCP manager:

```bash
claude mcp add ccmem -- npx -y @adestefa/ccmem@latest
```

This method automatically configures Claude Code integration and sets up memory capture hooks.

### Alternative Installation Methods

#### NPM Global Installation

```bash
npm install -g @adestefa/ccmem
cd /path/to/your/project
ccmem setup
```

#### Direct Installation Script

```bash
curl -fsSL https://raw.githubusercontent.com/adestefa/ccmem/main/install.sh | bash
```

#### Manual Installation

```bash
git clone https://github.com/adestefa/ccmem.git
cd ccmem
npm install -g .
ccmem setup
```

## Configuration

### Automatic Configuration

When using `claude mcp add`, configuration is handled automatically. The system will:

1. Install the MCP server
2. Configure Claude Code integration
3. Set up automatic memory capture hooks
4. Initialize project database on first use

### Manual Configuration

If installing manually, add to your `~/.claude/mcp_servers.json`:

```json
{
  "mcpServers": {
    "ccmem": {
      "command": "npx",
      "args": ["-y", "@adestefa/ccmem@latest"],
      "description": "Project memory system for Claude Code"
    }
  }
}
```

## Usage

### Command Line Interface

CCMem provides a comprehensive CLI for project memory management:

```bash
# Initialize memory system in current project
ccmem setup

# View project status and memory
ccmem status

# Search project memory
ccmem search "authentication"

# Get project context
ccmem context

# Learn project settings
ccmem learn setting start command "npm start"
ccmem learn architecture "API Server" "REST API using Express" "Node.js,Express,PostgreSQL"
```

### Available Commands

- `ccmem setup` - Initialize CCMem in current project
- `ccmem status` - Display project status and memory summary
- `ccmem search <query>` - Search across all project memory
- `ccmem context [focus]` - Get project context (all, settings, architecture, current, recent)
- `ccmem learn setting <category> <key> <value>` - Store project configuration
- `ccmem learn architecture <component> <description> <tech>` - Document architecture decisions

### Integration with Claude Code

Once installed, CCMem operates transparently with Claude Code:

1. **Session Initialization**: Automatically loads project context when Claude starts
2. **Active Development**: Captures file modifications, command executions, and architectural insights
3. **Knowledge Building**: Extracts and stores development patterns and decisions
4. **Context Provision**: Provides relevant memory when Claude needs project information

## Architecture

### Database Schema

CCMem uses a local SQLite database with the following core tables:

- **settings** - Project configuration and commands
- **architecture** - System design and technology decisions
- **deployment** - Release and deployment procedures
- **story** - User stories and feature development
- **task** - Development tasks and implementation notes
- **defect** - Bug reports and fixes
- **lessons** - Architectural decisions and learnings
- **knowledge** - General project context and notes

### Memory Capture System

The system includes intelligent hooks that automatically capture:

- **File Operations**: Significant code modifications and their context
- **Command Execution**: Build, test, and deployment commands
- **Architectural Insights**: Technical decisions extracted from Claude's responses
- **Development Milestones**: Session summaries and progress markers

### Data Storage

- **Location**: `.claude/db/ccmem.sqlite` in each project directory
- **Isolation**: Each project maintains its own separate database
- **Performance**: Optimized with indexes and prepared statements
- **Portability**: Standard SQLite format for easy backup and migration

## MCP Tools

CCMem provides the following MCP tools for Claude Code:

### Learning Tools
- `ccmem_learn_setting` - Store project configuration
- `ccmem_learn_architecture` - Document system architecture
- `ccmem_learn_deployment` - Record deployment procedures

### Development Tracking
- `ccmem_create_story` - Create user stories
- `ccmem_create_task` - Track development tasks
- `ccmem_log_defect` - Record bugs and fixes

### Knowledge Management
- `ccmem_record_lesson` - Capture lessons learned
- `ccmem_add_knowledge` - Store general project knowledge
- `ccmem_get_context` - Retrieve project context
- `ccmem_search` - Search project memory

## Development Modes

### Green Mode (Active Development)
During active development, CCMem automatically:
- Captures file modifications and their significance
- Records command executions and their outcomes
- Extracts architectural insights from Claude's responses
- Documents development milestones and session summaries

### Brown Mode (Discovery)
When exploring existing projects, CCMem:
- Documents discovered project structure and technologies
- Maps configuration files and their purposes
- Captures existing workflows and development patterns
- Identifies knowledge gaps for future investigation

## Benefits

### For Individual Developers
- **Continuity**: Maintain context across development sessions
- **Learning**: Build institutional knowledge about projects
- **Efficiency**: Eliminate need to re-explain project context

### For Development Teams
- **Onboarding**: Provide instant project context for new team members
- **Knowledge Sharing**: Centralize architectural decisions and patterns
- **Consistency**: Standardize development approaches across projects

### For Claude Code
- **Context Awareness**: Understand project history and decisions
- **Intelligent Assistance**: Provide relevant, project-specific guidance
- **Reduced Repetition**: Eliminate need to re-establish context each session

## Requirements

- Node.js 18.0.0 or higher
- Claude Code with MCP support
- SQLite (bundled with Node.js)

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome. Please see the repository for contribution guidelines.

## Support

For issues and support, please use the GitHub issue tracker at https://github.com/adestefa/ccmem/issues.