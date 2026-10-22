#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

console.log('🧹 Cleaning previous build...');
for (const dir of ['dist']) {
  if (fs.existsSync(dir)) {
    execSync(`rm -rf ${dir}`, { stdio: 'inherit' });
  }
}

console.log('🤖 Generating AI provider registry...');
execSync('tsx scripts/generate-provider-registry.ts', { stdio: 'inherit' });

console.log('📝 Generating action registry...');
execSync('tsx scripts/generate-action-registry.ts', { stdio: 'inherit' });

console.log('📚 Generating loader catalog...');
execSync('tsx scripts/generate-loader-catalog.ts', { stdio: 'inherit' });

console.log('✅ Validating action conventions...');
execSync('tsx scripts/validate-action-conventions.ts', { stdio: 'inherit' });

console.log('🔨 Compiling TypeScript...');
execSync('./node_modules/.bin/tsc', { stdio: 'inherit' });

console.log('🔗 Resolving path aliases...');
execSync('./node_modules/.bin/tsc-alias', { stdio: 'inherit' });

console.log('📋 Preparing package structure...');
execSync('mkdir -p dist', { stdio: 'inherit' });

// Copy src directory contents to dist root, excluding TypeScript and source map files
console.log('Copying source files to dist...');
execSync('rsync -av --exclude="*.ts" --exclude="*.map" src/ dist/', { stdio: 'inherit' });

// Move resources to root level for cleaner dist structure
// playbooks YAML/MD → dist/playbooks/ (merged with compiled engine code)
// templates → dist/templates/
// ai-plugin → build input for generate-plugin; not shipped as-is
console.log('Moving resources to root level...');
if (fs.existsSync('dist/resources/playbooks')) {
  execSync('rsync -av dist/resources/playbooks/ dist/playbooks/', { stdio: 'inherit' });
  execSync('rm -rf dist/resources/playbooks', { stdio: 'inherit' });
}
if (fs.existsSync('dist/resources/templates')) {
  execSync('mv dist/resources/templates dist/templates', { stdio: 'inherit' });
}
if (fs.existsSync('dist/resources/ai-plugin')) {
  execSync('rm -rf dist/resources/ai-plugin', { stdio: 'inherit' });
}
if (fs.existsSync('dist/resources/standards')) {
  execSync('mv dist/resources/standards dist/standards', { stdio: 'inherit' });
}
// Remove empty resources directory if it exists
if (fs.existsSync('dist/resources')) {
  execSync('rmdir dist/resources 2>/dev/null || true', { stdio: 'inherit' });
}

console.log('📋 Generating playbook schema...');
execSync('tsx scripts/generate-playbook-schema.ts', { stdio: 'inherit' });

// One package: the Claude Code plugin (`skills/`, `.claude-plugin/`) and the
// Agent Plugins payload (`agent-plugin/`) are added to dist/ beside the CLI.
// The CLI launchers live in `launchers/`, never `bin/`, which claude.ai and
// Cowork refuse in a plugin.
// @req FR:ai-plugin/plugin.publish
// @req FR:ai-plugin/plugin.no-bin
console.log('🔌 Generating AI plugin payloads...');
execSync('tsx scripts/generate-plugin.ts', { stdio: 'inherit' });

// Copy launchers directory to dist
console.log('Copying launchers directory...');
execSync('cp -r launchers dist/', { stdio: 'inherit' });

// Copy package metadata files to dist
console.log('Copying package metadata...');
execSync('cp package.json dist/', { stdio: 'inherit' });
execSync('cp README.md dist/', { stdio: 'inherit' });
execSync('cp LICENSE dist/', { stdio: 'inherit' });

console.log('📦 Creating packages...');
execSync('cd dist && npm pack', { stdio: 'inherit' });
execSync('mv dist/*-catalyst-*.tgz dist/catalyst-latest.tgz', { stdio: 'inherit' });

// Check if --skip-install flag was passed
const skipInstall = process.argv.includes('--skip-install');

if (!skipInstall) {
  console.log('📥 Installing locally...');

  // Clean up existing installation to avoid ENOTEMPTY errors
  if (fs.existsSync('node_modules/@xerilium')) {
    execSync('rm -rf node_modules/@xerilium', { stdio: 'inherit' });
  }

  // `--no-save` on purpose. The steps below run the freshly built CLI out of
  // node_modules, so the tarball has to be installed — but saving it would
  // write `"@xerilium/catalyst": "file:dist/catalyst-latest.tgz"` into
  // package.json, making the package depend on itself. That broke `npm ci` on
  // every fresh checkout: `dist/` is build output no clone has, so install died
  // with ENOENT on a cold cache, and it only ever appeared to work because the
  // tarball was already in the local npm cache. Keeping it out of package.json
  // also removes the need to restore package-lock.json's integrity hash
  // afterwards, since the lockfile no longer changes here.
  execSync('npm install --no-save file:./dist/catalyst-latest.tgz', { stdio: 'inherit' });

  console.log('🔧 Running catalyst init...');
  try {
    execSync('node node_modules/@xerilium/catalyst/launchers/catalyst.js init', { stdio: 'inherit' });
  } catch (error) {
    console.error('catalyst init failed:', (error as Error).message);
  }

  console.log('🔌 Self-hosting AI plugin from dist/...');
  try {
    execSync('tsx scripts/generate-plugin.ts --self-host', { stdio: 'inherit' });
  } catch (error) {
    console.error('Plugin self-hosting failed:', (error as Error).message);
  }

  console.log('💬 Injecting feedback into skills...');
  try {
    execSync('tsx scripts/inject-feedback.ts', { stdio: 'inherit' });
  } catch (error) {
    console.error('Feedback injection failed:', (error as Error).message);
  }
} else {
  console.log('⏭️  Skipping local install (--skip-install flag provided)');
}

console.log('✅ Build complete!');