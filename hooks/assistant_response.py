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

def extract_insights(response_text):
    """Extract architectural insights and decisions from Claude's response"""
    insights = []
    
    # Look for architectural decisions
    arch_patterns = [
        r'I\'ll use (\w+) (?:pattern|architecture|approach)',
        r'This follows the (\w+) pattern',
        r'(?:Using|Implementing) (\w+) (?:pattern|architecture)',
        r'The (\w+) approach (?:ensures|provides|allows)',
        r'I\'m implementing (\w+) to (?:handle|manage|ensure)'
    ]
    
    for pattern in arch_patterns:
        matches = re.finditer(pattern, response_text, re.IGNORECASE)
        for match in matches:
            insights.append({
                'type': 'architecture',
                'content': match.group(0),
                'key_concept': match.group(1)
            })
    
    # Look for technology decisions
    tech_patterns = [
        r'I\'ll use (\w+(?:\.\w+)*) (?:library|framework|tool)',
        r'Using (\w+(?:\.\w+)*) for (?:this|the)',
        r'(?:Installing|Adding) (\w+) (?:package|dependency)',
        r'This requires (\w+(?:\.\w+)*) (?:to|for)'
    ]
    
    for pattern in tech_patterns:
        matches = re.finditer(pattern, response_text, re.IGNORECASE)
        for match in matches:
            insights.append({
                'type': 'technology',
                'content': match.group(0),
                'key_concept': match.group(1)
            })
    
    # Look for security considerations
    security_patterns = [
        r'(?:for security|security (?:reason|concern))',
        r'(?:to prevent|preventing) (\w+) (?:attack|vulnerability)',
        r'(?:authentication|authorization|validation|sanitization)',
        r'(?:HTTPS|SSL|TLS|encryption|hashing)'
    ]
    
    for pattern in security_patterns:
        matches = re.finditer(pattern, response_text, re.IGNORECASE)
        for match in matches:
            insights.append({
                'type': 'security',
                'content': match.group(0)
            })
    
    # Look for performance considerations
    perf_patterns = [
        r'(?:for performance|performance (?:reason|optimization))',
        r'(?:to optimize|optimizing) (\w+)',
        r'(?:caching|indexing|lazy loading|pagination)',
        r'(?:async|asynchronous|concurrent|parallel) (?:processing|execution)'
    ]
    
    for pattern in perf_patterns:
        matches = re.finditer(pattern, response_text, re.IGNORECASE)
        for match in matches:
            insights.append({
                'type': 'performance',
                'content': match.group(0)
            })
    
    return insights

def capture_assistant_response(hook_data):
    """Capture Claude's insights and architectural decisions"""
    try:
        response_text = hook_data.get('response_text', '')
        response_length = len(response_text)
        
        # Only process substantial responses
        if response_length < 100:
            return
            
        # Extract insights from the response
        insights = extract_insights(response_text)
        
        if not insights:
            return
            
        # Group insights by type
        insight_groups = {}
        for insight in insights:
            insight_type = insight['type']
            if insight_type not in insight_groups:
                insight_groups[insight_type] = []
            insight_groups[insight_type].append(insight)
        
        # Save architectural insights
        if 'architecture' in insight_groups:
            arch_insights = insight_groups['architecture']
            concepts = [insight.get('key_concept', '') for insight in arch_insights if insight.get('key_concept')]
            
            if concepts:
                call_ccmem_tool("ccmem_record_lesson", {
                    "title": f"Architectural Decision: {', '.join(concepts[:3])}",
                    "description": f"Claude made architectural decisions involving: {', '.join(concepts)}. " + 
                                 ". ".join([insight['content'] for insight in arch_insights[:2]]),
                    "category": "architecture",
                    "impact_level": "medium",
                    "tags": "architecture,decision,pattern"
                })
        
        # Save technology decisions
        if 'technology' in insight_groups:
            tech_insights = insight_groups['technology']
            technologies = [insight.get('key_concept', '') for insight in tech_insights if insight.get('key_concept')]
            
            if technologies:
                call_ccmem_tool("ccmem_learn_architecture", {
                    "component": "Technology Stack",
                    "description": f"Technologies being used in this project: {', '.join(technologies)}",
                    "tech_stack": ', '.join(technologies),
                    "patterns": "Technology integration patterns discovered from Claude's decisions"
                })
        
        # Save security insights
        if 'security' in insight_groups:
            security_insights = insight_groups['security']
            call_ccmem_tool("ccmem_record_lesson", {
                "title": "Security Considerations",
                "description": "Security considerations identified: " + 
                             ". ".join([insight['content'] for insight in security_insights[:3]]),
                "category": "security",
                "impact_level": "high",
                "tags": "security,best-practices,protection"
            })
        
        # Save performance insights
        if 'performance' in insight_groups:
            perf_insights = insight_groups['performance']
            call_ccmem_tool("ccmem_record_lesson", {
                "title": "Performance Optimization",
                "description": "Performance considerations: " + 
                             ". ".join([insight['content'] for insight in perf_insights[:3]]),
                "category": "performance", 
                "impact_level": "medium",
                "tags": "performance,optimization,efficiency"
            })
        
        # Save general development insights for longer responses
        if response_length > 500 and len(insights) >= 2:
            call_ccmem_tool("ccmem_add_knowledge", {
                "title": "Development Insights",
                "content": f"Claude provided detailed technical guidance with {len(insights)} insights across {len(insight_groups)} categories. " +
                          "This indicates significant architectural or implementation decisions being made.",
                "category": "development",
                "tags": "insights,technical-guidance,development"
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
            hook_data = {"response_text": ""}
    except:
        hook_data = {"response_text": ""}
        
    capture_assistant_response(hook_data)