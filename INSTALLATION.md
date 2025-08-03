# CCMem Installation Guide

## MCP Installation Standards 2024

CCMem follows the modern Model Context Protocol (MCP) standards established in 2024. This guide covers all installation methods and requirements.

## System Requirements

### Runtime Requirements

**Option 1: Bun (Recommended)**
- **Installation**: `curl -fsSL https://bun.sh/install | bash`
- **Why Bun**: Native SQLite support, faster performance, zero external dependencies
- **Compatibility**: macOS, Linux, Windows (WSL)

**Option 2: Node.js (Fallback)**
- **Version**: Node.js 18.0.0 or higher
- **Installation**: [nodejs.org](https://nodejs.org/) or `brew install node`
- **Note**: Uses JSON storage instead of SQLite for compatibility

**Option 3: UV/UVX (Python Package Manager)**
- **Installation**: 
  - macOS: `brew install uv`
  - Windows: `winget install --id=astral-sh.uv`
- **Use Case**: For Python-based MCP servers and cross-platform compatibility

## Installation Methods

### Method 1: Claude MCP Add (Recommended)

Once published to NPM:

```bash
claude mcp add ccmem -- npx -y @adestefa/ccmem@latest
```

**What this does:**
- Automatically configures Claude Code MCP integration
- Downloads and installs CCMem from NPM
- Sets up hooks for automatic memory capture
- Ready to use immediately

### Method 2: Direct GitHub Installation

Using uvx for direct GitHub installation:

```bash
claude mcp add ccmem -- uvx --from git+https://github.com/adestefa/ccmem ccmem-server
```

**What this does:**
- Installs directly from GitHub repository
- No NPM dependency
- Always uses latest code
- Good for development and testing

### Method 3: NPM Global Installation

```bash
npm install -g @adestefa/ccmem
cd /path/to/your/project
ccmem setup
```

**What this does:**
- Installs CCMem globally on your system
- Provides `ccmem` CLI command
- Requires manual setup per project

### Method 4: Manual Installation

```bash
git clone https://github.com/adestefa/ccmem.git
cd ccmem
npm install -g .
ccmem setup
```

## MCP Server Configuration

### Automatic Configuration (claude mcp add)

When using `claude mcp add`, configuration is automatic. Claude Code creates:

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

### Manual Configuration

For manual setup, add to `~/.claude/mcp_servers.json`:

**NPX Configuration:**
```json
{
  "mcpServers": {
    "ccmem": {
      "command": "npx",
      "args": ["-y", "@adestefa/ccmem@latest"],
      "description": "CCMem - Project memory system"
    }
  }
}
```

**UVX Configuration:**
```json
{
  "mcpServers": {
    "ccmem": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/adestefa/ccmem", "ccmem-server"],
      "description": "CCMem - Project memory system (GitHub)"
    }
  }
}
```

**Local Development Configuration:**
```json
{
  "mcpServers": {
    "ccmem": {
      "command": "bun",
      "args": ["/path/to/ccmem/server-bun.js"],
      "description": "CCMem - Local development"
    }
  }
}
```

## Installation Commands by Platform

### macOS

```bash
# Install Bun (recommended)
curl -fsSL https://bun.sh/install | bash

# Install using Claude MCP Add
claude mcp add ccmem -- npx -y @adestefa/ccmem@latest

# Alternative: Direct GitHub
claude mcp add ccmem -- uvx --from git+https://github.com/adestefa/ccmem ccmem-server
```

### Linux

```bash
# Install dependencies
curl -fsSL https://bun.sh/install | bash  # or use package manager

# Install CCMem
claude mcp add ccmem -- npx -y @adestefa/ccmem@latest
```

### Windows

```powershell
# Install uv first
winget install --id=astral-sh.uv

# Install Node.js if not available
winget install OpenJS.NodeJS

# Install CCMem
claude mcp add ccmem -- npx -y @adestefa/ccmem@latest
```

## Verification

### Test MCP Server

```bash
# Check if CCMem is loaded
claude mcp list

# Test CCMem tools in Claude Code
# Use: ccmem_learn_setting, ccmem_get_context, etc.
```

### Test Database Creation

```bash
cd /path/to/your/project
# Database should be created at .claude/db/ccmem.sqlite (Bun)
# Or .claude/db/ccmem.json (Node.js)
```

## Troubleshooting

### Common Issues

**1. "Command not found" errors**
- Ensure npx is in your system PATH
- Run `npm install -g npm` to update npm/npx

**2. "uvx --from option not recognized"**
- This is a known issue with some uvx versions
- Use NPX method instead: `npx -y @adestefa/ccmem@latest`

**3. Database not created**
- Check .claude directory permissions
- Verify Bun or Node.js is properly installed
- Try manual tool usage to trigger initialization

**4. MCP server not loading**
- Restart Claude Code after configuration changes
- Check `~/.claude/mcp_servers.json` syntax
- Verify command paths are correct

### Debug Commands

```bash
# Test Bun server manually
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize"}' | bun ccmem-server

# Test NPX installation
npx -y @adestefa/ccmem@latest --help

# Check Claude Code logs
# Look for MCP server loading messages
```

## Dependencies Summary

| Runtime | SQLite Support | Installation | Use Case |
|---------|---------------|--------------|----------|
| **Bun** | ✅ Native | `curl -fsSL https://bun.sh/install \| bash` | **Recommended** |
| **Node.js** | ❌ JSON fallback | [nodejs.org](https://nodejs.org) | Compatibility |
| **UV/UVX** | ✅ Via Python | `brew install uv` | Cross-platform |

## Modern MCP Standards Compliance

CCMem follows 2024 MCP standards:

- ✅ **JSON-RPC 2.0 Protocol**: Standard MCP communication
- ✅ **Tool Registration**: Proper MCP tool schema
- ✅ **NPX Compatibility**: Standard NPM package execution  
- ✅ **UVX Support**: Modern Python package runner
- ✅ **Direct GitHub**: Repository-based installation
- ✅ **Claude Code Integration**: Native claude mcp add support

## Next Steps

After installation:

1. **Initialize Project**: `ccmem setup` (if using CLI)
2. **Start Claude Code**: Open in your project directory
3. **Test Tools**: Try `ccmem_learn_setting` and `ccmem_get_context`
4. **Verify Memory**: Check `.claude/db/` for database creation

CCMem will automatically capture your development activities and provide intelligent project memory across Claude Code sessions.