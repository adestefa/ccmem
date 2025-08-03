#!/usr/bin/env python3

import os
import json
import subprocess
from pathlib import Path
from datetime import datetime

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

def capture_session_end(hook_data):
    """Capture session end and save summary"""
    try:
        session_duration = hook_data.get('duration', 'unknown')
        message_count = hook_data.get('message_count', 0)
        tools_used = hook_data.get('tools_used', [])
        
        # Create session summary
        summary_parts = [
            f"Claude Code session completed",
            f"Duration: {session_duration}",
            f"Messages: {message_count}",
        ]
        
        if tools_used:
            summary_parts.append(f"Tools used: {', '.join(tools_used[:5])}")
            
        summary = ". ".join(summary_parts)
        
        # Save session milestone
        call_ccmem_tool("ccmem_add_knowledge", {
            "title": f"Session End - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "content": summary,
            "category": "process",
            "tags": "session,milestone,claude-code"
        })
        
        # If significant development work was done, create a lesson
        significant_tools = ['Edit', 'Write', 'MultiEdit', 'Bash']
        used_significant_tools = [tool for tool in tools_used if any(sig in tool for sig in significant_tools)]
        
        if len(used_significant_tools) >= 3:
            call_ccmem_tool("ccmem_record_lesson", {
                "title": "Development Session Insights",
                "description": f"Productive development session with {len(used_significant_tools)} significant actions. Tools: {', '.join(used_significant_tools[:5])}. Consider documenting any architectural decisions or patterns discovered.",
                "category": "process",
                "impact_level": "medium",
                "tags": "session,development,productivity"
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
            hook_data = {"trigger": "session_end"}
    except:
        hook_data = {"trigger": "session_end"}
        
    capture_session_end(hook_data)