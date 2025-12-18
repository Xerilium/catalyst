#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

console.log('🧹 Cleaning previous build...');
if (fs.existsSync('dist')) {
  execSync('rm -rf dist', { stdio: 'inherit' });
}

console.log('🤖 Generating AI provider registry...');
execSync('tsx scripts/generate-provider-registry.ts', { stdio: 'inherit' });

console.log('📝 Generating action registry...');
execSync('tsx scripts/generate-action-registry.ts', { stdio: 'inherit' });

console.log('✅ Validating action conventions...');
execSync('tsx scripts/validate-action-conventions.ts', { stdio: 'inherit' });

console.log('🔨 Compiling TypeScript...');
execSync('./node_modules/.bin/tsc', { stdio: 'inherit' });

console.log('📋 Preparing package structure...');
execSync('mkdir -p dist', { stdio: 'inherit' });

// Copy src directory contents to dist root, excluding TypeScript and source map files
console.log('Copying source files to dist...');
execSync('rsync -av --exclude="*.ts" --exclude="*.map" src/ dist/', { stdio: 'inherit' });

// Move resources to root level for cleaner dist structure
// playbooks YAML/MD → dist/playbooks/ (merged with compiled engine code)
// templates → dist/templates/
// ai-config → dist/ai-config/
console.log('Moving resources to root level...');
if (fs.existsSync('dist/resources/playbooks')) {
  execSync('rsync -av dist/resources/playbooks/ dist/playbooks/', { stdio: 'inherit' });
  execSync('rm -rf dist/resources/playbooks', { stdio: 'inherit' });
}
if (fs.existsSync('dist/resources/templates')) {
  execSync('mv dist/resources/templates dist/templates', { stdio: 'inherit' });
}
if (fs.existsSync('dist/resources/ai-config')) {
  execSync('mv dist/resources/ai-config dist/ai-config', { stdio: 'inherit' });
}
// Remove empty resources directory if it exists
if (fs.existsSync('dist/resources')) {
  execSync('rmdir dist/resources 2>/dev/null || true', { stdio: 'inherit' });
}

console.log('📋 Generating playbook schema...');
execSync('tsx scripts/generate-playbook-schema.ts', { stdio: 'inherit' });

// Copy package metadata files to dist
console.log('Copying package metadata...');
execSync('cp package.json dist/', { stdio: 'inherit' });
execSync('cp README.md dist/', { stdio: 'inherit' });
execSync('cp LICENSE dist/', { stdio: 'inherit' });

console.log('📦 Creating package...');
execSync('cd dist && npm pack', { stdio: 'inherit' });
execSync('mv dist/*-catalyst-*.tgz dist/catalyst-latest.tgz', { stdio: 'inherit' });

// Check if --skip-install flag was passed
const skipInstall = process.argv.includes('--skip-install');

if (!skipInstall) {
  console.log('📥 Installing locally...');

  // Save current integrity hash for @xerilium/catalyst
  let currentHash: string = '';
  if (fs.existsSync('package-lock.json')) {
    try {
      const lock: any = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
      const pkg: any = lock.packages['node_modules/@xerilium/catalyst'];
      currentHash = pkg ? pkg.integrity || '' : '';
      console.log(`Saved current hash: ${currentHash.substring(0, 20)}...`);
    } catch (e) {
      console.log('Could not read current hash');
    }
  }

  // Save package.json and package-lock.json
  const packageJsonBackup = fs.readFileSync('package.json', 'utf8');
  const packageLockBackup = fs.existsSync('package-lock.json')
    ? fs.readFileSync('package-lock.json', 'utf8')
    : null;

  // Clean up existing installation to avoid ENOTEMPTY errors
  if (fs.existsSync('node_modules/@xerilium')) {
    execSync('rm -rf node_modules/@xerilium', { stdio: 'inherit' });
  }

  execSync('npm install --save-dev file:./dist/catalyst-latest.tgz', { stdio: 'inherit' });

  console.log('🔧 Running postinstall...');
  try {
    execSync('node node_modules/@xerilium/catalyst/setup/postinstall.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('Postinstall failed:', (error as Error).message);
  }

  // Restore the original integrity hash
  if (currentHash) {
    try {
      const lock: any = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
      if (lock.packages && lock.packages['node_modules/@xerilium/catalyst']) {
        lock.packages['node_modules/@xerilium/catalyst'].integrity = currentHash;
        fs.writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
        console.log('Restored original integrity hash');
      }
    } catch (e: any) {
      console.error('Error restoring hash:', e.message);
    }
  }
} else {
  console.log('⏭️  Skipping local install (--skip-install flag provided)');
}

console.log('✅ Build complete!');