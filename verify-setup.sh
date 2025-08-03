#!/bin/bash

# CCMem Setup Verification Script
# Checks system requirements and validates installation

echo "CCMem Setup Verification"
echo "======================="

# Check runtime availability
echo "🔍 Checking runtime requirements..."

BUN_AVAILABLE=false
NODE_AVAILABLE=false  
UVX_AVAILABLE=false

if command -v bun >/dev/null 2>&1; then
    BUN_VERSION=$(bun --version 2>/dev/null)
    echo "✅ Bun: $BUN_VERSION (Recommended)"
    BUN_AVAILABLE=true
else
    echo "❌ Bun: Not installed"
    echo "   Install with: curl -fsSL https://bun.sh/install | bash"
fi

if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version 2>/dev/null)
    echo "✅ Node.js: $NODE_VERSION"
    NODE_AVAILABLE=true
else
    echo "❌ Node.js: Not installed"
    echo "   Install from: https://nodejs.org"
fi

if command -v uvx >/dev/null 2>&1; then
    UVX_VERSION=$(uvx --version 2>/dev/null | head -n1)
    echo "✅ UVX: $UVX_VERSION"
    UVX_AVAILABLE=true
else
    echo "❌ UVX: Not installed"
    echo "   Install with: brew install uv (macOS) or winget install --id=astral-sh.uv (Windows)"
fi

echo ""

# Check if at least one runtime is available
if [[ "$BUN_AVAILABLE" == false && "$NODE_AVAILABLE" == false ]]; then
    echo "❌ ERROR: No suitable runtime found!"
    echo "   Install Bun (recommended) or Node.js to use CCMem"
    exit 1
fi

# Test CCMem functionality if available locally
echo "🧪 Testing CCMem functionality..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "$SCRIPT_DIR/ccmem-server" ]]; then
    echo "✅ CCMem server wrapper found"
    
    # Test MCP initialization
    if echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize"}' | timeout 5 "$SCRIPT_DIR/ccmem-server" >/dev/null 2>&1; then
        echo "✅ MCP server initialization: PASSED"
    else
        echo "❌ MCP server initialization: FAILED"
    fi
else
    echo "⚠️  CCMem server not found locally (normal for NPM installation)"
fi

echo ""

# Check Claude Code MCP configuration
echo "🔧 Checking Claude Code MCP configuration..."

CLAUDE_MCP_CONFIG="$HOME/.claude/mcp_servers.json"

if [[ -f "$CLAUDE_MCP_CONFIG" ]]; then
    echo "✅ Claude MCP config found: $CLAUDE_MCP_CONFIG"
    
    if grep -q "ccmem" "$CLAUDE_MCP_CONFIG" 2>/dev/null; then
        echo "✅ CCMem server configured in Claude Code"
    else
        echo "⚠️  CCMem not found in Claude MCP configuration"
        echo "   Add with: claude mcp add ccmem -- npx -y @adestefa/ccmem@latest"
    fi
else
    echo "❌ Claude MCP config not found"
    echo "   Claude Code may not be installed or MCP not configured"
fi

echo ""

# Installation recommendations
echo "📋 Installation Recommendations:"

if [[ "$BUN_AVAILABLE" == true ]]; then
    echo "🎯 RECOMMENDED: Use Bun for best performance"
    echo "   claude mcp add ccmem -- npx -y @adestefa/ccmem@latest"
elif [[ "$NODE_AVAILABLE" == true ]]; then
    echo "✅ Node.js available - compatible installation"
    echo "   claude mcp add ccmem -- npx -y @adestefa/ccmem@latest"
fi

if [[ "$UVX_AVAILABLE" == true ]]; then  
    echo "🚀 Direct GitHub installation available:"
    echo "   claude mcp add ccmem -- uvx --from git+https://github.com/adestefa/ccmem ccmem-server"
fi

echo ""

# Summary
echo "📊 Setup Summary:"

READY=true

if [[ "$BUN_AVAILABLE" == false && "$NODE_AVAILABLE" == false ]]; then
    echo "❌ Runtime: Missing (install Bun or Node.js)"
    READY=false
else
    echo "✅ Runtime: Available"
fi

if [[ -f "$CLAUDE_MCP_CONFIG" ]]; then
    echo "✅ Claude Code: MCP configured" 
else
    echo "⚠️  Claude Code: MCP not configured"
fi

if [[ "$READY" == true ]]; then
    echo ""
    echo "🎉 CCMem is ready for installation!"
    echo "   Choose your preferred installation method above."
else
    echo ""
    echo "⚠️  Please install missing requirements before using CCMem."
fi