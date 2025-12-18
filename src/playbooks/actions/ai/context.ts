/**
 * Context assembly utilities for AI prompts
 *
 * Handles writing context values to temporary files and generating
 * prompt instructions that reference those files.
 *
 * Context values can be either:
 * - File paths: If the value looks like a path and the file exists, use it directly
 * - Literal content: Written to a temporary file to avoid formatting conflicts
 *
 * @req FR:playbook-actions-ai/ai-prompt.context
 * @req FR:playbook-actions-ai/ai-prompt.context.detection
 * @req FR:playbook-actions-ai/ai-prompt.context.files
 * @req FR:playbook-actions-ai/ai-prompt.context.instruction
 * @req FR:playbook-actions-ai/ai-prompt.context.position
 * @req FR:playbook-actions-ai/ai-prompt.return
 * @req FR:playbook-actions-ai/ai-prompt.return.file
 * @req FR:playbook-actions-ai/ai-prompt.return.empty
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

/**
 * Check if a string could be a file path
 *
 * Multi-line strings are never file paths.
 * Single-line strings are potential file paths (including single-word like "LICENSE").
 *
 * @param value - String to check
 * @returns True if the string could be a file path (single line)
 *
 * @req FR:playbook-actions-ai/ai-prompt.context.detection
 */
function couldBeFilePath(value: string): boolean {
  // Multi-line strings are never file paths
  return !value.includes('\n');
}

/**
 * Check if a file exists at the given path
 *
 * @param filePath - Path to check
 * @returns True if file exists and is accessible
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Result of context assembly
 */
export interface ContextAssemblyResult {
  /** Instruction block to prepend to prompt */
  instruction: string;

  /** List of temp file paths to clean up after execution */
  cleanupFiles: string[];
}

/**
 * Result of return instruction assembly
 */
export interface ReturnInstructionResult {
  /** Instruction block to append to prompt */
  instruction: string;

  /** Output file path where AI should write (null if no return specified) */
  outputFile: string | null;
}

/**
 * Assemble context values into temporary files and generate instruction block
 *
 * All context values are written to temporary files to avoid formatting conflicts.
 * Context may contain Markdown, XML, JSON, or code that could conflict with prompt formatting.
 *
 * @param context - Dictionary of name-value pairs (may be undefined or empty)
 * @returns Promise resolving to instruction block and cleanup file list
 *
 * @example
 * ```typescript
 * const { instruction, cleanupFiles } = await assembleContext({
 *   'source-code': fileContent,
 *   'requirements': specText
 * });
 * // instruction = "## Context Files\n\nReview the following files..."
 * // cleanupFiles = ['/tmp/catalyst-context-source-code-xxx.txt', ...]
 * ```
 *
 * @req FR:playbook-actions-ai/ai-prompt.context
 */
export async function assembleContext(
  context: Record<string, unknown> | undefined
): Promise<ContextAssemblyResult> {
  if (!context || Object.keys(context).length === 0) {
    return { instruction: '', cleanupFiles: [] };
  }

  const cleanupFiles: string[] = [];
  const fileEntries: string[] = [];

  for (const [name, value] of Object.entries(context)) {
    // @req FR:playbook-actions-ai/ai-prompt.context.detection
    if (typeof value === 'string' && couldBeFilePath(value) && await fileExists(value)) {
      // Use existing file directly - no cleanup needed
      fileEntries.push(`- ${name}: ${value}`);
    } else {
      // @req FR:playbook-actions-ai/ai-prompt.context.files
      const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
      const filePath = path.join(
        os.tmpdir(),
        `catalyst-context-${safeName}-${randomUUID()}.txt`
      );

      const content =
        typeof value === 'string' ? value : JSON.stringify(value, null, 2);

      await fs.writeFile(filePath, content, 'utf-8');
      cleanupFiles.push(filePath);
      fileEntries.push(`- ${name}: ${filePath}`);
    }
  }

  // @req FR:playbook-actions-ai/ai-prompt.context.instruction
  const instruction = `## Context Files

Review the following files for context before proceeding:
${fileEntries.join('\n')}

`;

  return { instruction, cleanupFiles };
}

/**
 * Assemble return value instruction and create output file path
 *
 * When a return value is specified, creates a temp file path and generates
 * an instruction block telling the AI to write output to that file.
 *
 * @param returnDesc - Description of expected return value (may be undefined or empty)
 * @returns Instruction block and output file path (null if no return specified)
 *
 * @example
 * ```typescript
 * // With return specified
 * const { instruction, outputFile } = assembleReturnInstruction(
 *   'A JSON array of security concerns.'
 * );
 * // instruction = "## Required Output\n\nA JSON array of security concerns.\n\nIMPORTANT: Write..."
 * // outputFile = '/tmp/catalyst-output-xxx.txt'
 *
 * // Without return
 * const { instruction, outputFile } = assembleReturnInstruction(undefined);
 * // instruction = ''
 * // outputFile = null
 * ```
 *
 * @req FR:playbook-actions-ai/ai-prompt.return
 */
export function assembleReturnInstruction(
  returnDesc: string | undefined
): ReturnInstructionResult {
  // @req FR:playbook-actions-ai/ai-prompt.return.empty
  if (!returnDesc?.trim()) {
    return { instruction: '', outputFile: null };
  }

  // @req FR:playbook-actions-ai/ai-prompt.return.file
  const outputFile = path.join(
    os.tmpdir(),
    `catalyst-output-${randomUUID()}.txt`
  );

  const instruction = `
## Required Output

${returnDesc}

IMPORTANT: Write your output to: ${outputFile}
`;

  return { instruction, outputFile };
}

/**
 * Clean up temporary files created during context/return assembly
 *
 * Silently ignores errors if files don't exist or can't be deleted.
 *
 * @param files - Array of file paths to delete
 */
export async function cleanupTempFiles(files: string[]): Promise<void> {
  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch {
      // Ignore errors - file may not exist or may have been cleaned up already
    }
  }
}

/**
 * Read output file contents for return value extraction
 *
 * @param outputFile - Path to output file
 * @returns File contents as string, or null if file doesn't exist
 */
export async function readOutputFile(
  outputFile: string
): Promise<string | null> {
  try {
    const content = await fs.readFile(outputFile, 'utf-8');
    return content;
  } catch {
    return null;
  }
}
