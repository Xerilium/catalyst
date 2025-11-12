#!/usr/bin/env node

/**
 * CLI executable for catalyst-github commands
 *
 * This shim loads and executes the CLI parser from the TypeScript build output.
 */

const path = require('path');

// Load CLI parser from dist/ output
const cliPath = path.join(__dirname, '..', 'dist', 'playbooks', 'scripts', 'github', 'cli.js');
const cli = require(cliPath);

// Execute CLI with process arguments
cli.main(process.argv.slice(2));
