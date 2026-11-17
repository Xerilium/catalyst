// @req FR:devops-build/build.deps
// Plain Node (no dependencies): runs as the `prebuild` hook, before `tsx` is needed.

const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(process.cwd(), 'node_modules', '.bin', 'tsc'))) {
  console.error('Dependencies are not installed (fresh clone or worktree?). Run `npm ci`, then `npm run build`.');
  process.exit(1);
}
