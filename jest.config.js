module.exports = {
  preset: "ts-jest",
  testEnvironment: "node", // Using 'node' since this is a CLI/command tool, not DOM-based
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
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@ai/(.*)$": "<rootDir>/src/ai/$1",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@playbooks/(.*)$": "<rootDir>/src/playbooks/$1",
    "^@resources/(.*)$": "<rootDir>/src/resources/$1",
    "^@traceability/(.*)$": "<rootDir>/src/traceability/$1",
  },
};