// @req FR:playbook-definition/types.dependencies.interface
// @req FR:playbook-definition/types.dependencies.cli
// @req FR:playbook-definition/types.dependencies.env
// @req FR:playbook-definition/types.dependencies.check-result
// @req FR:playbook-definition/types.dependencies.checker

/**
 * Dependency metadata for playbook actions
 *
 * Describes external CLI tools and environment variables required by an action.
 * Actions declare dependencies via optional `dependencies` property on PlaybookAction interface.
 *
 * @req FR:playbook-definition/types.dependencies.interface
 *
 * @example
 * ```typescript
 * class BashAction implements PlaybookAction<string> {
 *   static readonly dependencies: PlaybookActionDependencies = {
 *     cli: [{
 *       name: 'bash',
 *       versionCommand: 'bash --version',
 *       platforms: ['linux', 'darwin'],
 *       installDocs: 'https://www.gnu.org/software/bash/'
 *     }]
 *   };
 *
 *   async execute(config: string): Promise<PlaybookActionResult> {
 *     // Execute bash script
 *   }
 * }
 * ```
 */
export interface PlaybookActionDependencies {
  /**
   * CLI tool dependencies (bash, pwsh, gh, etc.)
   *
   * External commands that must be available in PATH for action to execute.
   */
  cli?: CliDependency[];

  /**
   * Environment variable dependencies (GITHUB_TOKEN, etc.)
   *
   * Environment variables that must be set for action to execute.
   */
  env?: EnvDependency[];
}

/**
 * CLI tool dependency metadata
 *
 * Describes an external command-line tool required by an action.
 *
 * @req FR:playbook-definition/types.dependencies.cli
 *
 * @example
 * ```typescript
 * const bashDep: CliDependency = {
 *   name: 'bash',
 *   versionCommand: 'bash --version',
 *   minVersion: '5.0.0',
 *   platforms: ['linux', 'darwin'],
 *   installDocs: 'https://www.gnu.org/software/bash/'
 * };
 * ```
 */
export interface CliDependency {
  /**
   * Command name as it appears in PATH
   *
   * @example 'bash', 'gh', 'pwsh'
   */
  name: string;

  /**
   * Optional command to check version/existence
   *
   * Command should exit with code 0 if tool is available and print version to stdout.
   * If not provided, falls back to platform-specific existence check (which/where).
   *
   * @example 'bash --version', 'gh --version'
   */
  versionCommand?: string;

  /**
   * Optional minimum required version (semver)
   *
   * If specified, dependency checker will parse version from command output
   * and verify it meets minimum requirement.
   *
   * @example '5.0.0', '2.1.0'
   */
  minVersion?: string;

  /**
   * Optional platform filter
   *
   * If specified, dependency is only required on listed platforms.
   * Use Node.js platform identifiers: 'linux', 'darwin', 'win32', etc.
   *
   * @example ['linux', 'darwin'] // Not required on Windows
   */
  platforms?: NodeJS.Platform[];

  /**
   * Optional installation documentation URL
   *
   * URL to installation guide for this tool. Included in error messages
   * when dependency is missing.
   *
   * @example 'https://www.gnu.org/software/bash/'
   */
  installDocs?: string;
}

/**
 * Environment variable dependency metadata
 *
 * Describes an environment variable required by an action.
 *
 * @req FR:playbook-definition/types.dependencies.env
 *
 * @example
 * ```typescript
 * const tokenDep: EnvDependency = {
 *   name: 'GITHUB_TOKEN',
 *   required: true,
 *   description: 'GitHub API authentication token'
 * };
 * ```
 */
export interface EnvDependency {
  /**
   * Environment variable name
   *
   * @example 'GITHUB_TOKEN', 'API_KEY'
   */
  name: string;

  /**
   * Whether variable must be present
   *
   * If true, validation fails if variable is not set.
   * If false, variable is optional and validation passes even if missing.
   */
  required: boolean;

  /**
   * Optional description of what variable is used for
   *
   * Included in error messages to help users understand why variable is needed.
   *
   * @example 'GitHub API authentication token'
   */
  description?: string;
}

/**
 * Result of dependency validation check
 *
 * Returned by DependencyChecker when validating a single dependency.
 *
 * @req FR:playbook-definition/types.dependencies.check-result
 *
 * @example
 * ```typescript
 * const result: CheckResult = {
 *   available: true,
 *   version: '5.2.15',
 *   meetsMinVersion: true
 * };
 * ```
 *
 * @example
 * ```typescript
 * const result: CheckResult = {
 *   available: false,
 *   error: 'bash not found - install from https://www.gnu.org/software/bash/',
 *   installDocs: 'https://www.gnu.org/software/bash/'
 * };
 * ```
 */
export interface CheckResult {
  /**
   * Whether dependency is available
   *
   * True if CLI tool is in PATH or environment variable is set.
   * False if dependency is missing or validation failed.
   */
  available: boolean;

  /**
   * Detected version string (if applicable)
   *
   * Extracted from CLI tool version command output.
   * Undefined if version command not provided or parsing failed.
   *
   * @example '5.2.15', '2.1.0'
   */
  version?: string;

  /**
   * Whether detected version meets minimum requirement
   *
   * True if version >= minVersion.
   * False if version < minVersion.
   * Undefined if no minVersion specified or version not detected.
   */
  meetsMinVersion?: boolean;

  /**
   * Error message if dependency unavailable or invalid
   *
   * Human-readable explanation of what's wrong and how to fix it.
   * Includes installation docs URL if available.
   *
   * @example 'bash not found - install from https://www.gnu.org/software/bash/'
   * @example 'Required environment variable GITHUB_TOKEN not set: GitHub API authentication token'
   */
  error?: string;

  /**
   * Installation guidance URL (from dependency metadata)
   *
   * Copied from CliDependency.installDocs for convenience.
   * Helps users find installation instructions.
   */
  installDocs?: string;
}
