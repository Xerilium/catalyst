#!/usr/bin/env node

/**
 * CLI executable for Catalyst commands
 * @req FR:cli.entry
 *
 * This shim loads and executes the CLI from the TypeScript build output.
 */

const path = require('path');
const fs = require('fs');

// Check possible CLI locations in order of priority:
// 1. Installed package: ../cli/index.js (when in node_modules/@xerilium/catalyst/bin/)
// 2. Development with tsx: ../src/cli/index.ts (when running from project root without build)
const installedPath = path.join(__dirname, '..', 'cli', 'index.js');
const srcPath = path.join(__dirname, '..', 'src', 'cli', 'index.ts');

let cliPath;
if (fs.existsSync(installedPath)) {
  // Installed package: use compiled JavaScript
  cliPath = installedPath;
} else if (fs.existsSync(srcPath)) {
  // Development: use tsx if available
  try {
    require('tsx/cjs');
    cliPath = srcPath;
  } catch {
    console.error('Error: TypeScript source found but tsx not available.');
    console.error('Run: npm run build or npm install tsx');
    process.exit(1);
  }
} else {
  console.error('Error: Catalyst CLI not found. Run: npm run build');
  process.exit(1);
}

// Load and execute CLI
const cli = require(cliPath);
if (cli.main) {
  cli.main(process.argv.slice(2));
} else if (cli.default) {
  cli.default(process.argv.slice(2));
} else {
  cli(process.argv.slice(2));
}
