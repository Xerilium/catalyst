#!/usr/bin/env tsx

import { execSync } from 'child_process';
import * as fs from 'fs';

const args = process.argv.slice(2);
const customVersion = args.find(arg => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');

console.log('🚀 Catalyst Release Script\n');

// Get current version
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = pkg.version;
const releaseVersion = customVersion || currentVersion.replace('-dev', '');

// Create tag version (strip .0 patch, but keep minor version)
const tagVersion = releaseVersion.replace(/^(\d+\.\d+)\.0$/, '$1');

console.log(`📦 Current version in package.json: ${currentVersion}`);
console.log(`🎯 Release version (package.json): ${releaseVersion}`);
console.log(`🏷️  GitHub tag: v${tagVersion}`);
console.log(`📦 NPM package version: ${releaseVersion}`);

if (customVersion) {
  console.log(`\n   ℹ️  Custom version provided: ${customVersion}`);
} else {
  console.log(`\n   ℹ️  Version derived from package.json (stripped -dev)`);
}
console.log();

if (dryRun) {
  console.log('🔍 DRY RUN - No workflows will be triggered\n');
  console.log('Would execute:');
  console.log(`  1. Trigger "Create Release" workflow${customVersion ? ` with version=${releaseVersion}` : ''}`);
  console.log(`  2. Wait for release workflow to complete`);
  console.log(`  3. Trigger "Publish to NPM" workflow`);
  console.log(`  4. Wait for publish workflow to complete\n`);
  process.exit(0);
}

// Confirm with user
console.log('This will:');
console.log(`  1. Create GitHub release v${releaseVersion}`);
console.log(`  2. Publish @xerilium/catalyst@${releaseVersion} to NPM`);
console.log(`  3. Bump version to next dev version\n`);

try {
  // Step 1: Trigger release workflow
  console.log('📤 Triggering "Create Release" workflow...');
  const releaseCmd = customVersion
    ? `gh workflow run "Create Release" -f version=${releaseVersion}`
    : `gh workflow run "Create Release"`;

  execSync(releaseCmd, { stdio: 'inherit' });

  // Wait a moment for workflow to start
  console.log('⏳ Waiting for workflow to start...');
  execSync('sleep 5', { stdio: 'inherit' });

  // Step 2: Wait for release workflow to complete
  console.log('⏳ Waiting for "Create Release" workflow to complete...');
  const runId = execSync(
    `gh run list --workflow="Create Release" --limit 1 --json databaseId --jq '.[0].databaseId'`,
    { encoding: 'utf8' }
  ).trim();

  console.log(`   Run ID: ${runId}`);
  execSync(`gh run watch ${runId}`, { stdio: 'inherit' });

  // Check if release workflow succeeded
  const status = execSync(
    `gh run view ${runId} --json conclusion --jq '.conclusion'`,
    { encoding: 'utf8' }
  ).trim();

  if (status !== 'success') {
    console.error(`\n❌ Release workflow failed with status: ${status}`);
    console.error(`   View details: gh run view ${runId} --web`);
    process.exit(1);
  }

  console.log('✅ Release workflow completed successfully\n');

  // Step 3: Trigger publish workflow
  console.log('📤 Triggering "Publish to NPM" workflow...');
  console.log(`   Publishing tag: v${tagVersion}`);
  execSync(`gh workflow run "Publish to NPM" -f tag=v${tagVersion}`, { stdio: 'inherit' });

  // Wait a moment for workflow to start
  console.log('⏳ Waiting for workflow to start...');
  execSync('sleep 5', { stdio: 'inherit' });

  // Step 4: Wait for publish workflow to complete
  console.log('⏳ Waiting for "Publish to NPM" workflow to complete...');
  const publishRunId = execSync(
    `gh run list --workflow="Publish to NPM" --limit 1 --json databaseId --jq '.[0].databaseId'`,
    { encoding: 'utf8' }
  ).trim();

  console.log(`   Run ID: ${publishRunId}`);
  execSync(`gh run watch ${publishRunId}`, { stdio: 'inherit' });

  // Check if publish workflow succeeded
  const publishStatus = execSync(
    `gh run view ${publishRunId} --json conclusion --jq '.conclusion'`,
    { encoding: 'utf8' }
  ).trim();

  if (publishStatus !== 'success') {
    console.error(`\n❌ Publish workflow failed with status: ${publishStatus}`);
    console.error(`   View details: gh run view ${publishRunId} --web`);
    process.exit(1);
  }

  console.log('✅ Publish workflow completed successfully\n');
  console.log('🎉 Release complete!');
  console.log(`   GitHub: https://github.com/xerilium/catalyst/releases/tag/v${tagVersion}`);
  console.log(`   NPM: https://www.npmjs.com/package/@xerilium/catalyst/v/${releaseVersion}`);

} catch (error) {
  console.error('\n❌ Error during release process:', (error as Error).message);
  process.exit(1);
}
