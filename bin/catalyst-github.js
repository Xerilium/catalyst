#!/usr/bin/env node

/**
 * CLI executable for catalyst-github commands
 *
 * This shim loads and executes the CLI parser from the TypeScript build output.
 */

const path = require('path');
const fs = require('fs');

// Check if running from built dist/ or source src/
const distPath = path.join(__dirname, '..', 'dist', 'playbooks', 'scripts', 'github', 'cli.js');
const srcPath = path.join(__dirname, '..', 'src', 'playbooks', 'scripts', 'github', 'cli.ts');

let cliPath;
if (fs.existsSync(distPath)) {
  // Production: use compiled JavaScript
  cliPath = distPath;
} else if (fs.existsSync(srcPath)) {
  // Development: use ts-node if available
  try {
    require('ts-node/register');
    cliPath = srcPath;
  } catch {
    console.error('Error: TypeScript source found but ts-node not available.');
    console.error('Run: npm run build or npm install ts-node');
    process.exit(1);
  }
} else {
  console.error('Error: catalyst-github CLI not found. Run: npm run build');
  process.exit(1);
}

// Load and execute CLI
const cli = require(cliPath);
cli.main(process.argv.slice(2));
