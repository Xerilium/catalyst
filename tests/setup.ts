// Jest setup file for template validation tests

// Disable colors for deterministic test output. Picocolors caches
// isColorSupported at module load, so this must happen before any test
// file imports picocolors (transitively or directly).
process.env.NO_COLOR = '1';
delete process.env.FORCE_COLOR;
