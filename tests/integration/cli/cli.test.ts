/**
 * Integration tests for CLI commands
 * @req FR:cli.help
 * @req FR:cli.version
 * @req FR:run.execute
 * @req FR:run.output
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
});
