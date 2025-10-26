#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

console.log('🔨 Compiling TypeScript...');
execSync('./node_modules/.bin/tsc', { stdio: 'inherit' });

console.log('📋 Copying runtime assets...');
execSync('cp -r src/integrations dist/', { stdio: 'inherit' });
execSync('cp -r src/templates dist/', { stdio: 'inherit' });
execSync('cp -r src/playbooks dist/', { stdio: 'inherit' });

console.log('Moving postinstall script...');
execSync('mv dist/src/scripts/postinstall.js dist/postinstall.js', { stdio: 'inherit' });

console.log('📦 Creating package...');
execSync('mkdir -p dist', { stdio: 'inherit' });
execSync('npm pack', { stdio: 'inherit' });
execSync('mv *-catalyst-*.tgz ./dist/catalyst-latest.tgz', { stdio: 'inherit' });

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

execSync('npm install file:./dist/catalyst-latest.tgz', { stdio: 'inherit' });

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

console.log('✅ Build complete!');