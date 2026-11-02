#!/usr/bin/env node

/**
 * Installs the project's @xerilium/catalyst package with the project's package
 * manager when it's missing. Portable plugin skills run it via
 * `npx -y -p @xerilium/catalyst catalyst-bootstrap`.
 *
 * @req FR:ai-plugin/bootstrap.@cli
 */

const path = require('path');
const fs = require('fs');

// 1. Installed package: ../ai/plugin/bootstrap.js
// 2. Local dev build: ../dist/ai/plugin/bootstrap.js
// 3. Development with tsx: ../src/ai/plugin/bootstrap.ts
const installedPath = path.join(__dirname, '..', 'ai', 'plugin', 'bootstrap.js');
const distPath = path.join(__dirname, '..', 'dist', 'ai', 'plugin', 'bootstrap.js');
const srcPath = path.join(__dirname, '..', 'src', 'ai', 'plugin', 'bootstrap.ts');

let modulePath;
if (fs.existsSync(installedPath)) {
  modulePath = installedPath;
} else if (fs.existsSync(distPath)) {
  modulePath = distPath;
} else if (fs.existsSync(srcPath)) {
  try {
    require('tsx/cjs');
    modulePath = srcPath;
  } catch {
    console.error('Error: TypeScript source found but tsx not available. Run: npm run build');
    process.exit(1);
  }
} else {
  console.error('Error: Catalyst bootstrap not found. Run: npm run build');
  process.exit(1);
}

process.exitCode = require(modulePath).main(process.argv.slice(2));
