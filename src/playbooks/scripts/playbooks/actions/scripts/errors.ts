/**
 * Error codes and utilities for script execution actions
 *
 * This module defines error codes for the script, bash, and powershell actions,
 * along with helper functions for creating CatalystError instances with proper
 * guidance messages.
 */

import { CatalystError } from '../../../errors';

/**
 * Error codes for script action (JavaScript execution)
 */
export const ScriptErrorCodes = {
  /**
   * Script configuration is invalid (missing code, invalid timeout, etc.)
   */
  ConfigInvalid: 'ScriptConfigInvalid',

  /**
   * Working directory does not exist
   */
  InvalidCwd: 'ScriptInvalidCwd',

  /**
   * JavaScript syntax error in provided code
   */
  SyntaxError: 'ScriptSyntaxError',

  /**
   * Runtime error occurred during script execution
   */
  RuntimeError: 'ScriptRuntimeError',

  /**
   * Script execution exceeded timeout limit
   */
  Timeout: 'ScriptTimeout'
} as const;

/**
 * Error codes for bash action (Bash script execution)
 */
export const BashErrorCodes = {
  /**
   * Bash configuration is invalid (missing code, invalid timeout, etc.)
   */
  ConfigInvalid: 'BashConfigInvalid',

  /**
   * Working directory does not exist
   */
  InvalidCwd: 'BashInvalidCwd',

  /**
   * Bash command not found (ENOENT error)
   */
  CommandNotFound: 'BashCommandNotFound',

  /**
   * Permission denied when executing bash command (EACCES error)
   */
  PermissionDenied: 'BashPermissionDenied',

  /**
   * Bash command failed with non-zero exit code
   */
  CommandFailed: 'BashCommandFailed',

  /**
   * Bash script execution exceeded timeout limit
   */
  Timeout: 'BashTimeout'
} as const;

/**
 * Error codes for powershell action (PowerShell script execution)
 */
export const PowerShellErrorCodes = {
  /**
   * PowerShell configuration is invalid (missing code, invalid timeout, etc.)
   */
  ConfigInvalid: 'PowerShellConfigInvalid',

  /**
   * Working directory does not exist
   */
  InvalidCwd: 'PowerShellInvalidCwd',

  /**
   * PowerShell command not found (ENOENT error)
   */
  CommandNotFound: 'PowerShellCommandNotFound',

  /**
   * Permission denied when executing PowerShell command (EACCES error)
   */
  PermissionDenied: 'PowerShellPermissionDenied',

  /**
   * PowerShell command failed with non-zero exit code
   */
  CommandFailed: 'PowerShellCommandFailed',

  /**
   * PowerShell script execution exceeded timeout limit
   */
  Timeout: 'PowerShellTimeout'
} as const;

/**
 * Helper functions for creating script action errors
 */
export const ScriptErrors = {
  /**
   * Create error for invalid script configuration
   */
  configInvalid: (reason: string): CatalystError =>
    new CatalystError(
      `Invalid script configuration: ${reason}`,
      ScriptErrorCodes.ConfigInvalid,
      `Ensure script config has valid 'code' property and timeout >= 0. ${reason}`
    ),

  /**
   * Create error for invalid working directory
   */
  invalidCwd: (cwd: string): CatalystError =>
    new CatalystError(
      `Working directory does not exist: ${cwd}`,
      ScriptErrorCodes.InvalidCwd,
      `Ensure the working directory exists before executing the script. Path: ${cwd}`
    ),

  /**
   * Create error for JavaScript syntax errors
   */
  syntaxError: (originalError: Error): CatalystError =>
    new CatalystError(
      `JavaScript syntax error in script code`,
      ScriptErrorCodes.SyntaxError,
      `Fix the JavaScript syntax error in your script code. ${originalError.message}`,
      originalError
    ),

  /**
   * Create error for JavaScript runtime errors
   */
  runtimeError: (originalError: Error): CatalystError =>
    new CatalystError(
      `Runtime error during script execution`,
      ScriptErrorCodes.RuntimeError,
      `Review the error details and fix the runtime issue in your script. ${originalError.message}`,
      originalError
    ),

  /**
   * Create error for script timeout
   */
  timeout: (timeoutMs: number): CatalystError =>
    new CatalystError(
      `Script execution exceeded timeout of ${timeoutMs}ms`,
      ScriptErrorCodes.Timeout,
      `Optimize your script or increase the timeout value. Current timeout: ${timeoutMs}ms`
    )
};

/**
 * Helper functions for creating bash action errors
 */
export const BashErrors = {
  /**
   * Create error for invalid bash configuration
   */
  configInvalid: (reason: string): CatalystError =>
    new CatalystError(
      `Invalid bash configuration: ${reason}`,
      BashErrorCodes.ConfigInvalid,
      `Ensure bash config has valid 'code' property and timeout >= 0. ${reason}`
    ),

  /**
   * Create error for invalid working directory
   */
  invalidCwd: (cwd: string): CatalystError =>
    new CatalystError(
      `Working directory does not exist: ${cwd}`,
      BashErrorCodes.InvalidCwd,
      `Ensure the working directory exists before executing the bash script. Path: ${cwd}`
    ),

  /**
   * Create error when bash command is not found
   */
  commandNotFound: (stdout: string, stderr: string): CatalystError =>
    new CatalystError(
      `Bash command not found`,
      BashErrorCodes.CommandNotFound,
      `Ensure bash is installed and available in PATH. stdout: ${stdout}, stderr: ${stderr}`
    ),

  /**
   * Create error when permission is denied
   */
  permissionDenied: (stdout: string, stderr: string): CatalystError =>
    new CatalystError(
      `Permission denied when executing bash command`,
      BashErrorCodes.PermissionDenied,
      `Check file permissions and execution rights. stdout: ${stdout}, stderr: ${stderr}`
    ),

  /**
   * Create error when bash command fails with non-zero exit code
   */
  commandFailed: (exitCode: number, stdout: string, stderr: string): CatalystError =>
    new CatalystError(
      `Bash command failed with exit code ${exitCode}`,
      BashErrorCodes.CommandFailed,
      `Review the command output for errors. Exit code: ${exitCode}, stdout: ${stdout}, stderr: ${stderr}`
    ),

  /**
   * Create error for bash timeout
   */
  timeout: (timeoutMs: number): CatalystError =>
    new CatalystError(
      `Bash execution exceeded timeout of ${timeoutMs}ms`,
      BashErrorCodes.Timeout,
      `Optimize your bash script or increase the timeout value. Current timeout: ${timeoutMs}ms`
    )
};

/**
 * Helper functions for creating PowerShell action errors
 */
export const PowerShellErrors = {
  /**
   * Create error for invalid PowerShell configuration
   */
  configInvalid: (reason: string): CatalystError =>
    new CatalystError(
      `Invalid PowerShell configuration: ${reason}`,
      PowerShellErrorCodes.ConfigInvalid,
      `Ensure PowerShell config has valid 'code' property and timeout >= 0. ${reason}`
    ),

  /**
   * Create error for invalid working directory
   */
  invalidCwd: (cwd: string): CatalystError =>
    new CatalystError(
      `Working directory does not exist: ${cwd}`,
      PowerShellErrorCodes.InvalidCwd,
      `Ensure the working directory exists before executing the PowerShell script. Path: ${cwd}`
    ),

  /**
   * Create error when PowerShell command is not found
   */
  commandNotFound: (stdout: string, stderr: string): CatalystError =>
    new CatalystError(
      `PowerShell command not found`,
      PowerShellErrorCodes.CommandNotFound,
      `Ensure PowerShell (pwsh) is installed and available in PATH. stdout: ${stdout}, stderr: ${stderr}`
    ),

  /**
   * Create error when permission is denied
   */
  permissionDenied: (stdout: string, stderr: string): CatalystError =>
    new CatalystError(
      `Permission denied when executing PowerShell command`,
      PowerShellErrorCodes.PermissionDenied,
      `Check file permissions and execution rights. stdout: ${stdout}, stderr: ${stderr}`
    ),

  /**
   * Create error when PowerShell command fails with non-zero exit code
   */
  commandFailed: (exitCode: number, stdout: string, stderr: string): CatalystError =>
    new CatalystError(
      `PowerShell command failed with exit code ${exitCode}`,
      PowerShellErrorCodes.CommandFailed,
      `Review the command output for errors. Exit code: ${exitCode}, stdout: ${stdout}, stderr: ${stderr}`
    ),

  /**
   * Create error for PowerShell timeout
   */
  timeout: (timeoutMs: number): CatalystError =>
    new CatalystError(
      `PowerShell execution exceeded timeout of ${timeoutMs}ms`,
      PowerShellErrorCodes.Timeout,
      `Optimize your PowerShell script or increase the timeout value. Current timeout: ${timeoutMs}ms`
    )
};
