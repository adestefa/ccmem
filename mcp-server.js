#!/usr/bin/env node

// MCP Server entry point for use with `claude mcp add ccmem -- npx -y @claude-code-community/ccmem@latest`
// This is a minimal wrapper that launches the appropriate server based on runtime

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if Bun is available, otherwise use Node.js
async function detectRuntime() {
  try {
    const { execSync } = await import('child_process');
    execSync('which bun', { stdio: 'ignore' });
    return 'bun';
  } catch (error) {
    return 'node';
  }
}

async function startServer() {
  const runtime = await detectRuntime();
  
  let serverFile;
  let command;
  
  if (runtime === 'bun') {
    serverFile = join(__dirname, 'server-bun.js');
    command = 'bun';
  } else {
    serverFile = join(__dirname, 'server-node.js');
    command = 'node';
  }
  
  // Launch the appropriate server
  const serverProcess = spawn(command, [serverFile], {
    stdio: 'inherit'
  });
  
  // Handle server exit
  serverProcess.on('exit', (code) => {
    process.exit(code);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    serverProcess.kill('SIGTERM');
  });
}

startServer().catch(error => {
  console.error('Failed to start CCMem server:', error);
  process.exit(1);
});