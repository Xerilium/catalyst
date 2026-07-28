#!/usr/bin/env tsx

import * as fs from 'fs';

// Bump the patch number while preserving any prerelease suffix (e.g. 0.2.8-dev -> 0.2.9-dev).
// `npm version patch` can't do this: it either strips the suffix (patch) or appends `.0` (prerelease).

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const match = pkg.version.match(/^(\d+)\.(\d+)\.(\d+)(-.+)?$/);
if (!match) {
  console.error(`❌ Unrecognized version format: ${pkg.version}`);
  process.exit(1);
}

const [, major, minor, patch, suffix = ''] = match;
const newVersion = `${major}.${minor}.${Number(patch) + 1}${suffix}`;

// package.json
pkg.version = newVersion;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

// package-lock.json: update the two canonical version fields (root + "" package).
// Leave the "node_modules/@xerilium/catalyst" self-dependency entry alone — that reflects
// the last built tarball's version and is rewritten by the package build.
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
lock.version = newVersion;
if (lock.packages?.['']) lock.packages[''].version = newVersion;
fs.writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');

console.log(`📦 ${match[0]} → ${newVersion}`);
