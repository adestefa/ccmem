#!/usr/bin/env python3

import os
import json
import subprocess
from pathlib import Path

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

def capture_session_start(hook_data):
    """Capture session start and load project context"""
    try:
        # Add general knowledge that Claude Code session started
        call_ccmem_tool("ccmem_add_knowledge", {
            "title": "Claude Code Session Started",
            "content": f"New development session started in project. Ready to assist with development tasks.",
            "category": "process",
            "tags": "session,claude-code"
        })
        
        # Try to detect and learn common project settings if not already known
        cwd = os.getcwd()
        
        # Check for package.json (Node.js project)
        package_json = Path(cwd) / "package.json"
        if package_json.exists():
            try:
                with open(package_json, 'r') as f:
                    package_data = json.load(f)
                    
                scripts = package_data.get('scripts', {})
                
                # Learn common commands
                if 'start' in scripts:
                    call_ccmem_tool("ccmem_learn_setting", {
                        "category": "start",
                        "key": "command", 
                        "value": f"npm start",
                        "description": f"Start command: {scripts['start']}"
                    })
                    
                if 'test' in scripts:
                    call_ccmem_tool("ccmem_learn_setting", {
                        "category": "test",
                        "key": "command",
                        "value": f"npm test", 
                        "description": f"Test command: {scripts['test']}"
                    })
                    
                if 'build' in scripts:
                    call_ccmem_tool("ccmem_learn_setting", {
                        "category": "build",
                        "key": "command",
                        "value": f"npm run build",
                        "description": f"Build command: {scripts['build']}"
                    })
                    
            except Exception:
                pass
                
        # Check for other common project files and learn from them
        
        # Go projects
        go_mod = Path(cwd) / "go.mod"
        if go_mod.exists():
            call_ccmem_tool("ccmem_learn_setting", {
                "category": "start",
                "key": "command",
                "value": "go run .",
                "description": "Go project - run main package"
            })
            call_ccmem_tool("ccmem_learn_setting", {
                "category": "test", 
                "key": "command",
                "value": "go test ./...",
                "description": "Go project - run all tests"
            })
            
        # Python projects
        requirements_txt = Path(cwd) / "requirements.txt"
        pyproject_toml = Path(cwd) / "pyproject.toml"
        if requirements_txt.exists() or pyproject_toml.exists():
            call_ccmem_tool("ccmem_learn_setting", {
                "category": "start",
                "key": "command",
                "value": "python main.py",
                "description": "Python project - run main script"
            })
            call_ccmem_tool("ccmem_learn_setting", {
                "category": "test",
                "key": "command", 
                "value": "pytest",
                "description": "Python project - run tests with pytest"
            })
            
    except Exception as e:
        # Fail silently - hooks should not interrupt Claude Code
        pass

if __name__ == "__main__":
    import sys
    
    # Read hook data from stdin or command line
    if len(sys.argv) > 1:
        hook_data = {"trigger": "session_start"}
    else:
        hook_data = {"trigger": "session_start"}
        
    capture_session_start(hook_data)