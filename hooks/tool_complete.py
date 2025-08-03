#!/usr/bin/env python3

import os
import json
import subprocess
from pathlib import Path
import re

def call_ccmem_tool(tool_name, arguments):
    """Call a ccmem MCP tool"""
    try:
        cwd = os.getcwd()
        ccmem_db = Path(cwd) / ".claude" / "db" / "ccmem.sqlite"
        
        if not ccmem_db.exists():
            return None
            
        # Prepare MCP request
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "call_tool",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        
        # Find ccmem executable
        ccmem_path = subprocess.run(['which', 'ccmem'], capture_output=True, text=True)
        if ccmem_path.returncode != 0:
            return None
            
        # Call ccmem
        result = subprocess.run(
            [ccmem_path.stdout.strip()],
            input=json.dumps(request),
            capture_output=True,
            text=True,
            cwd=cwd
        )
        
        if result.returncode == 0:
            return json.loads(result.stdout)
        return None
        
    except Exception:
        return None

def is_significant_command(command):
    """Check if a command is significant enough to capture"""
    ignore_patterns = [
        r'^npm install$',
        r'^git status$', 
        r'^ls\b',
        r'^pwd$',
        r'^cd\b',
        r'^echo\b',
        r'^cat\b',
        r'^head\b',
        r'^tail\b'
    ]
    
    for pattern in ignore_patterns:
        if re.match(pattern, command.strip()):
            return False
    return True

def capture_tool_complete(hook_data):
    """Capture significant tool executions"""
    try:
        tool_name = hook_data.get('tool_name', '')
        tool_params = hook_data.get('parameters', {})
        success = hook_data.get('success', True)
        
        if not success:
            return
            
        # Handle file creation/editing
        if tool_name in ['Edit', 'Write', 'MultiEdit']:
            file_path = tool_params.get('file_path', '')
            if file_path:
                # Extract filename for learning
                filename = os.path.basename(file_path)
                
                # Learn about file modifications
                call_ccmem_tool("ccmem_add_knowledge", {
                    "title": f"File Modified: {filename}",
                    "content": f"Claude modified {file_path} using {tool_name} tool. This indicates active development on this component.",
                    "category": "development",
                    "tags": f"file-modification,{tool_name.lower()},{filename}"
                })
                
                # Detect configuration files
                config_files = ['package.json', 'go.mod', 'requirements.txt', 'Dockerfile', 'docker-compose.yml', '.env']
                if filename in config_files:
                    call_ccmem_tool("ccmem_learn_setting", {
                        "category": "config",
                        "key": f"{filename}_modified",
                        "value": "true",
                        "description": f"Configuration file {filename} was recently modified"
                    })
        
        # Handle command execution
        elif tool_name == 'Bash':
            command = tool_params.get('command', '')
            if command and is_significant_command(command):
                
                # Learn about build/test/start commands
                if 'npm run build' in command or 'go build' in command or 'make build' in command:
                    call_ccmem_tool("ccmem_learn_setting", {
                        "category": "build",
                        "key": "command",
                        "value": command.strip(),
                        "description": "Build command discovered from Claude's actions"
                    })
                    
                elif 'npm test' in command or 'go test' in command or 'pytest' in command:
                    call_ccmem_tool("ccmem_learn_setting", {
                        "category": "test", 
                        "key": "command",
                        "value": command.strip(),
                        "description": "Test command discovered from Claude's actions"
                    })
                    
                elif 'npm start' in command or 'go run' in command or 'python' in command and 'main' in command:
                    call_ccmem_tool("ccmem_learn_setting", {
                        "category": "start",
                        "key": "command",
                        "value": command.strip(), 
                        "description": "Start command discovered from Claude's actions"
                    })
                    
                # Learn about deployment commands
                elif any(deploy_word in command.lower() for deploy_word in ['deploy', 'scp', 'rsync', 'docker push', 'git push']):
                    call_ccmem_tool("ccmem_learn_deployment", {
                        "environment": "discovered",
                        "deployment_steps": f"Command used: {command}",
                        "test_verification": "Verify deployment manually"
                    })
                    
                # General significant command
                else:
                    call_ccmem_tool("ccmem_add_knowledge", {
                        "title": f"Command Executed: {command[:50]}",
                        "content": f"Claude executed: {command}. This may indicate a development workflow step.",
                        "category": "development",
                        "tags": "command,bash,workflow"
                    })
        
        # Handle other significant tools
        elif tool_name in ['WebFetch', 'WebSearch']:
            url_or_query = tool_params.get('url') or tool_params.get('query', '')
            if url_or_query:
                call_ccmem_tool("ccmem_add_knowledge", {
                    "title": f"Research: {url_or_query[:50]}",
                    "content": f"Claude researched: {url_or_query}. This indicates learning about external resources or documentation.",
                    "category": "research",
                    "tags": "research,external,documentation"
                })
                
    except Exception as e:
        # Fail silently - hooks should not interrupt Claude Code
        pass

if __name__ == "__main__":
    import sys
    
    # Read hook data from stdin or parse from arguments
    try:
        if not sys.stdin.isatty():
            hook_data = json.load(sys.stdin)
        else:
            hook_data = {"tool_name": "unknown"}
    except:
        hook_data = {"tool_name": "unknown"}
        
    capture_tool_complete(hook_data)