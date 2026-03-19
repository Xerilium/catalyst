/**
 * Integration tests for CLI commands
 * @req FR:cli.help
 * @req FR:cli.version
 * @req FR:run.execute
 * @req FR:run.output
 * @req FR:catalyst-cli/traceability.execute
 * @req FR:catalyst-cli/traceability.output
 * @req FR:catalyst-cli/traceability.priority
 * @req FR:catalyst-cli/traceability.thresholds
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const CLI_PATH = path.join(__dirname, '../../../bin/catalyst.js');
const ROOT_DIR = path.join(__dirname, '../../..');

// Helper to run CLI commands
function runCLI(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args.join(' ')}`, {
      encoding: 'utf-8',
      cwd: ROOT_DIR,
      env: { ...process.env, NO_COLOR: '1' } // Disable colors for consistent output
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || '',
      exitCode: execError.status || 1
    };
  }
}

describe('Catalyst CLI', () => {
  // Skip tests if CLI source doesn't exist yet
  const cliSourceExists = fs.existsSync(path.join(ROOT_DIR, 'src/cli/index.ts'));
  const conditionalTest = cliSourceExists ? it : it.skip;

  describe('--help', () => {
    // @req FR:cli.help
    conditionalTest('should display help with --help flag', () => {
      const result = runCLI(['--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('catalyst');
    });

    // @req FR:cli.help
    conditionalTest('should display help with -h flag', () => {
      const result = runCLI(['-h']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });

    // @req FR:cli.help
    // @req FR:cli.banner
    conditionalTest('should display banner in help output', () => {
      const result = runCLI(['--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Catalyst');
    });

    // @req FR:cli.help
    conditionalTest('should display help when no arguments provided', () => {
      const result = runCLI([]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });
  });

  describe('--version', () => {
    // @req FR:cli.version
    conditionalTest('should display version with --version flag', () => {
      const result = runCLI(['--version']);
      expect(result.exitCode).toBe(0);
      // Version should match semver pattern
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    // Note: -v flag now means verbose, not version
    // Version is only available via --version (long form)
    conditionalTest('should show help with -v flag (verbose mode)', () => {
      const result = runCLI(['-v']);
      expect(result.exitCode).toBe(0);
      // With -v (verbose) and no command, shows help
      expect(result.stdout).toMatch(/Usage:/);
    });
  });

  describe('run command', () => {
    // @req FR:run.execute
    conditionalTest('should show error when no playbook ID provided', () => {
      const result = runCLI(['run']);
      // Commander.js handles missing required arguments with exit code 1
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('missing required argument');
    });

    // @req FR:run.execute
    conditionalTest('should show error for non-existent playbook', () => {
      const result = runCLI(['run', 'non-existent-playbook']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('PlaybookNotFound');
    });

    // @req FR:run.execute
    conditionalTest('should accept --input flag', () => {
      // Even if playbook doesn't exist, input parsing should work
      const result = runCLI(['run', 'test-playbook', '--input', 'key=value']);
      // Will fail with PlaybookNotFound, not InvalidInput
      expect(result.stderr).not.toContain('InvalidInput');
    });

    // @req FR:run.execute
    conditionalTest('should accept -i short flag for input', () => {
      const result = runCLI(['run', 'test-playbook', '-i', 'key=value']);
      // Will fail with PlaybookNotFound, not InvalidInput
      expect(result.stderr).not.toContain('InvalidInput');
    });

    // @req FR:errors.InvalidInput
    conditionalTest('should show error for invalid input format', () => {
      const result = runCLI(['run', 'test-playbook', '--input', 'invalid-no-equals']);
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('InvalidInput');
    });
  });

  describe('run --help', () => {
    // @req FR:cli.help
    conditionalTest('should display run command help', () => {
      const result = runCLI(['run', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('run');
      expect(result.stdout).toContain('playbook');
    });
  });

  describe('traceability command', () => {
    // @req FR:catalyst-cli/traceability.execute
    conditionalTest('should run traceability analysis for all features', () => {
      const result = runCLI(['traceability']);
      // Exit code 0 or 1 depending on coverage thresholds
      expect([0, 1]).toContain(result.exitCode);
      expect(result.stdout).toContain('Requirement Traceability Report');
    });

    // @req FR:catalyst-cli/traceability.execute
    conditionalTest('should filter to a single feature by ID', () => {
      const result = runCLI(['traceability', 'error-handling']);
      expect(result.stdout).toContain('Traceability Report: error-handling');
    });

    // @req FR:catalyst-cli/traceability.execute
    conditionalTest('should extract feature ID from path', () => {
      const result = runCLI(['traceability', '.xe/features/error-handling']);
      expect(result.stdout).toContain('Traceability Report: error-handling');
    });

    // @req FR:catalyst-cli/traceability.execute
    conditionalTest('should show error for non-existent feature', () => {
      const result = runCLI(['traceability', 'non-existent-feature']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('TraceabilityAnalysisFailed');
    });

    // @req FR:catalyst-cli/traceability.priority
    conditionalTest('should accept --min-priority flag', () => {
      const result = runCLI(['traceability', '--min-priority', 'P2']);
      // Exit code 0 or 1 depending on coverage thresholds
      expect([0, 1]).toContain(result.exitCode);
      expect(result.stdout).toContain('Requirement Traceability Report');
    });

    // @req FR:catalyst-cli/traceability.priority
    conditionalTest('should show error for invalid priority', () => {
      const result = runCLI(['traceability', '--min-priority', 'P0']);
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('InvalidPriority');
    });

    // @req FR:catalyst-cli/traceability.output
    conditionalTest('should output JSON with --json flag', () => {
      const result = runCLI(['traceability', '--json']);
      // Exit code 0 or 1 depending on coverage thresholds
      expect([0, 1]).toContain(result.exitCode);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      const parsed = JSON.parse(result.stdout);
      expect(parsed.summary).toBeDefined();
    });

    // @req FR:catalyst-cli/traceability.output
    conditionalTest('should suppress output with --quiet flag', () => {
      const result = runCLI(['traceability', '--quiet']);
      expect(result.stdout.trim()).toBe('');
    });

    // @req FR:catalyst-cli/traceability.thresholds
    conditionalTest('should return exit code based on threshold results', () => {
      const result = runCLI(['traceability']);
      // Valid exit codes: 0 (thresholds met) or 1 (thresholds not met)
      expect([0, 1]).toContain(result.exitCode);
    });

    // @req FR:catalyst-cli/traceability.execute
    conditionalTest('should support wildcard patterns', () => {
      const result = runCLI(['traceability', 'error-*']);
      expect(result.stdout).toContain('Traceability Report: error-handling');
    });
  });

  describe('traceability --help', () => {
    // @req FR:cli.help
    conditionalTest('should display traceability command help', () => {
      const result = runCLI(['traceability', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('traceability');
      expect(result.stdout).toContain('--min-priority');
    });
  });
});
