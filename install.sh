#!/bin/bash

# CCMem Installation Script
# One-liner: curl -fsSL https://raw.githubusercontent.com/adestefa/ccmem/main/install.sh | bash

set -e

echo "🧠 Installing CCMem - Claude Code Memory..."

# Check if Bun is available
if command -v bun >/dev/null 2>&1; then
    echo "✅ Bun detected - using native SQLite support"
    RUNTIME="bun"
    SERVER_FILE="server-bun.js"
elif command -v node >/dev/null 2>&1; then
    echo "✅ Node.js detected - will use simpler approach"
    RUNTIME="node"
    SERVER_FILE="server.js"
else
    echo "❌ Neither Bun nor Node.js found. Please install one of them:"
    echo "   Bun (recommended): curl -fsSL https://bun.sh/install | bash"
    echo "   Node.js: https://nodejs.org/"
    exit 1
fi

# Create temporary directory
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

# Download CCMem
echo "📥 Downloading CCMem..."
if command -v git >/dev/null 2>&1; then
    git clone https://github.com/adestefa/ccmem.git
    cd ccmem
else
    # Fallback to curl/wget
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL https://github.com/adestefa/ccmem/archive/main.tar.gz | tar -xz
        cd ccmem-main
    elif command -v wget >/dev/null 2>&1; then
        wget -qO- https://github.com/adestefa/ccmem/archive/main.tar.gz | tar -xz
        cd ccmem-main
    else
        echo "❌ git, curl, or wget required for installation"
        exit 1
    fi
fi

# Install CCMem globally
echo "🔧 Installing CCMem globally..."

# Create installation directory
INSTALL_DIR="$HOME/.ccmem"
mkdir -p "$INSTALL_DIR"

# Copy files
cp -r . "$INSTALL_DIR/"

# Make executable
chmod +x "$INSTALL_DIR/cli.js"
chmod +x "$INSTALL_DIR/$SERVER_FILE"

# Create wrapper script
WRAPPER_SCRIPT="$INSTALL_DIR/ccmem"
cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash
if [ "\$1" = "--server" ]; then
    # Run as MCP server
    $RUNTIME "$INSTALL_DIR/$SERVER_FILE"
else
    # Run as CLI
    $RUNTIME "$INSTALL_DIR/cli.js" "\$@"
fi
EOF
chmod +x "$WRAPPER_SCRIPT"

# Add to PATH
echo "🔗 Adding CCMem to PATH..."

# Determine shell profile file
if [ -n "$ZSH_VERSION" ]; then
    PROFILE_FILE="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    PROFILE_FILE="$HOME/.bashrc"
    if [ ! -f "$PROFILE_FILE" ]; then
        PROFILE_FILE="$HOME/.bash_profile"
    fi
else
    PROFILE_FILE="$HOME/.profile"
fi

# Add to PATH if not already there
if ! grep -q "/.ccmem" "$PROFILE_FILE" 2>/dev/null; then
    echo "" >> "$PROFILE_FILE"
    echo "# CCMem - Claude Code Memory" >> "$PROFILE_FILE"
    echo "export PATH=\"\$HOME/.ccmem:\$PATH\"" >> "$PROFILE_FILE"
    echo "✅ Added CCMem to $PROFILE_FILE"
    
    # Also add symlink to /usr/local/bin if writable
    if [ -w "/usr/local/bin" ]; then
        ln -sf "$WRAPPER_SCRIPT" "/usr/local/bin/ccmem"
        echo "✅ Created symlink in /usr/local/bin"
    fi
else
    echo "✅ CCMem already in PATH"
fi

# Clean up
cd /
rm -rf "$TMP_DIR"

# Test installation
echo "🧪 Testing installation..."
export PATH="$HOME/.ccmem:$PATH"
if "$WRAPPER_SCRIPT" --help >/dev/null 2>&1; then
    echo "✅ CCMem installed successfully!"
else
    echo "⚠️  Installation completed but test failed"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Restart your terminal or run: source $PROFILE_FILE"
echo "2. Go to your project: cd /path/to/your/project"
echo "3. Setup CCMem: ccmem setup"
echo "4. Start using Claude Code with memory!"
echo ""
echo "📚 For more info: ccmem help"