module.exports = {
  preset: "ts-jest",
  testEnvironment: "node", // Using 'node' since this is a CLI/command tool, not DOM-based
  // Prefer .ts over .js so ts-jest processes source files (not compiled .js in src/)
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testMatch: [
    "<rootDir>/tests/**/*.test.ts",
    "<rootDir>/tests/**/*.test.tsx",
    "<rootDir>/src/**/__tests__/**/*.test.ts",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    // Fixture test files are example code for testing the scanner, not actual tests
    "<rootDir>/tests/fixtures/",
  ],
  watchPathIgnorePatterns: [
    // Ephemeral run state and rollout files — changes here should not trigger test re-runs
    "<rootDir>/.xe/runs",
    "<rootDir>/.xe/rollouts",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{ts,tsx}",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    // Resolve this package's own name to the build output. `src/` ships code
    // that reaches its own packaged assets by package name — e.g.
    // `require.resolve('@xerilium/catalyst/playbooks/schema.json')` in
    // src/playbooks/yaml/validator.ts — which is correct once installed, but
    // unresolvable inside this repo unless the repo depends on itself. It used
    // to, via `file:dist/catalyst-latest.tgz`, which broke `npm ci` on any
    // fresh checkout (`dist/` is build output nobody has yet). Mapping the name
    // to `dist/` keeps those call sites working here without the self-dependency.
    // `npm run build` must have run; tests needing it already require that.
    "^@xerilium/catalyst$": "<rootDir>/dist",
    "^@xerilium/catalyst/(.*)$": "<rootDir>/dist/$1",
    // Strip `.js` from alias imports so ts-jest resolves the TypeScript source
    // via `moduleFileExtensions` (ts > js). Without this, tests silently run
    // against stale compiled `.js` artifacts in `src/` (tsc outDir).
    // `.js`-suffixed rules MUST come before the bare-alias rules below.
    "^@/(.*)\\.js$": "<rootDir>/src/$1",
    "^@ai/(.*)\\.js$": "<rootDir>/src/ai/$1",
    "^@core/(.*)\\.js$": "<rootDir>/src/core/$1",
    "^@playbooks/(.*)\\.js$": "<rootDir>/src/playbooks/$1",
    "^@resources/(.*)\\.js$": "<rootDir>/src/resources/$1",
    "^@traceability/(.*)\\.js$": "<rootDir>/src/traceability/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@ai/(.*)$": "<rootDir>/src/ai/$1",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@playbooks/(.*)$": "<rootDir>/src/playbooks/$1",
    "^@resources/(.*)$": "<rootDir>/src/resources/$1",
    "^@traceability/(.*)$": "<rootDir>/src/traceability/$1",
    // Strip `.js` from relative imports too — `src/` internally uses `./foo.js`
    // and `../foo.js` (NodeNext convention), which would otherwise exact-match
    // the stale compiled `.js` sibling in `src/` and bypass the .ts source.
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};