import { exec, type ChildProcess } from 'child_process';
import type { CliDependency, EnvDependency, CheckResult } from '../types';

/**
 * Service for validating playbook action dependencies
 *
 * Checks external CLI tools and environment variables required by actions.
 * Provides platform-agnostic dependency validation with clear error messages.
 *
 * @example
 * ```typescript
 * const checker = new DependencyChecker();
 *
 * // Check CLI tool
 * const bashResult = await checker.checkCli({
 *   name: 'bash',
 *   versionCommand: 'bash --version',
 *   minVersion: '5.0.0'
 * });
 *
 * if (!bashResult.available) {
 *   console.error(bashResult.error);
 * }
 *
 * // Check environment variable
 * const tokenResult = await checker.checkEnv({
 *   name: 'GITHUB_TOKEN',
 *   required: true,
 *   description: 'GitHub API token'
 * });
 * ```
 */
export class DependencyChecker {
  /**
   * Check CLI tool availability
   *
   * Uses two-tier validation strategy:
   * 1. If versionCommand provided, execute it to verify tool exists
   * 2. Otherwise fall back to platform-specific command (which/where)
   *
   * Respects platform filtering and validates version requirements if specified.
   *
   * @param dep - CLI dependency to check
   * @returns Promise resolving to check result with availability status
   */
  async checkCli(dep: CliDependency): Promise<CheckResult> {
    // Filter by platform first
    if (dep.platforms && !dep.platforms.includes(process.platform)) {
      return {
        available: true // Not required on this platform
      };
    }

    // Strategy 1: Try version command
    if (dep.versionCommand) {
      try {
        const { stdout } = await this.execWithTimeout(dep.versionCommand, 5000);
        const version = this.parseVersion(stdout);

        // Check version requirement if specified
        let meetsMinVersion: boolean | undefined;
        if (dep.minVersion && version) {
          meetsMinVersion = this.compareVersions(version, dep.minVersion);
        }

        return {
          available: true,
          version,
          meetsMinVersion
        };
      } catch (err) {
        // Version command failed - tool likely missing
        return {
          available: false,
          error: `${dep.name} not found - install from ${dep.installDocs || 'package manager'}`,
          installDocs: dep.installDocs
        };
      }
    }

    // Strategy 2: Fall back to which/where
    const checkCommand = process.platform === 'win32' ? 'where' : 'which';
    try {
      await this.execWithTimeout(`${checkCommand} ${dep.name}`, 5000);
      return { available: true };
    } catch (err) {
      return {
        available: false,
        error: `${dep.name} not found - install from ${dep.installDocs || 'package manager'}`,
        installDocs: dep.installDocs
      };
    }
  }

  /**
   * Check environment variable presence
   *
   * Validates that required environment variables are set.
   * Optional variables pass validation even if missing.
   *
   * @param dep - Environment dependency to check
   * @returns Promise resolving to check result with availability status
   */
  async checkEnv(dep: EnvDependency): Promise<CheckResult> {
    const value = process.env[dep.name];

    if (!value && dep.required) {
      const description = dep.description ? `: ${dep.description}` : '';
      return {
        available: false,
        error: `Required environment variable ${dep.name} not set${description}`
      };
    }

    return {
      available: true
    };
  }

  /**
   * Execute command with timeout
   *
   * Runs a shell command and resolves with stdout/stderr.
   * Kills process and rejects if timeout exceeded.
   *
   * @private
   * @param command - Command to execute
   * @param timeoutMs - Maximum execution time in milliseconds
   * @returns Promise resolving to command output
   */
  private async execWithTimeout(command: string, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let timedOut = false;

      const child: ChildProcess = exec(command, (error, stdout, stderr) => {
        if (timedOut) {
          return; // Timeout already handled
        }

        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });

      const timeout = setTimeout(() => {
        timedOut = true;
        if (child.kill) {
          child.kill();
        }
        reject(new Error(`Command timeout: ${command}`));
      }, timeoutMs);

      // Clear timeout if command completes
      child.on('exit', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Parse version string from command output
   *
   * Extracts semantic version (X.Y.Z) from command output.
   * Handles common version formats:
   * - "1.2.3"
   * - "v1.2.3"
   * - "version 1.2.3"
   * - "tool version v1.2.3 (2024-01-01)"
   *
   * @private
   * @param output - Command stdout
   * @returns Semantic version string or undefined if not found
   */
  private parseVersion(output: string): string | undefined {
    // Common version patterns: "1.2.3", "v1.2.3", "version 1.2.3"
    const match = output.match(/v?(\d+\.\d+\.\d+)/);
    return match ? match[1] : undefined;
  }

  /**
   * Compare semantic versions
   *
   * Checks if detected version meets minimum requirement.
   * Uses semantic versioning comparison (major.minor.patch).
   *
   * @private
   * @param detected - Detected version string (e.g., "2.42.1")
   * @param required - Minimum required version (e.g., "2.0.0")
   * @returns True if detected >= required, false otherwise
   */
  private compareVersions(detected: string | undefined, required: string): boolean {
    if (!detected) return false;

    const [dMajor, dMinor, dPatch] = detected.split('.').map(Number);
    const [rMajor, rMinor, rPatch] = required.split('.').map(Number);

    if (dMajor > rMajor) return true;
    if (dMajor < rMajor) return false;
    if (dMinor > rMinor) return true;
    if (dMinor < rMinor) return false;
    return dPatch >= rPatch;
  }
}
