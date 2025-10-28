#!/usr/bin/env node

// This stub script exists to prevent npm install errors during development/CI.
// The real postinstall script is in src/scripts/postinstall.ts and gets compiled
// to dist/scripts/postinstall.js during the build process.
// When the package is published, this stub is replaced by the compiled version.

console.log('Skipping postinstall - running in development mode');
process.exit(0);
