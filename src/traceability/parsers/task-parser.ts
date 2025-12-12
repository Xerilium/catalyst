/**
 * Task file parser for extracting task references.
 * @req FR:req-traceability/scan.tasks
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { TaskReference, RequirementId } from '../types/index.js';
import {
  parseShortFormId,
  parseQualifiedId,
  buildQualifiedId,
} from './id-parser.js';

/**
 * Regex pattern for task lines in tasks.md files.
 * Matches:
 * - [ ] T001: Description
 * - [x] T001: Description
 * - [ ] T001: [P] Description (parallel marker)
 *
 * @req FR:req-traceability/scan.tasks
 */
const TASK_PATTERN = /^-\s*\[[ x]\]\s*(T\d+):\s*(?:\[P\]\s*)?(.+)$/;

/**
 * Regex pattern for @req references in indented lines.
 * Matches:
 * - @req FR:path (short-form)
 * - @req FR:scope/path (qualified)
 */
const TASK_REQ_PATTERN = /@req\s+([A-Z]+:[a-z0-9./-]+)/;

/**
 * Parser for tasks.md files that extracts task references.
 * @req FR:req-traceability/scan.tasks
 */
export class TaskParser {
  /**
   * Parse a single tasks.md file and extract task references.
   * @req FR:req-traceability/scan.tasks
   */
  async parseFile(filePath: string): Promise<TaskReference[]> {
    const tasks: TaskReference[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // Extract scope from directory name
      const scope = this.extractScope(filePath);

      let currentTask: TaskReference | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Check for new task
        const taskMatch = trimmedLine.match(TASK_PATTERN);
        if (taskMatch) {
          // Save previous task if exists
          if (currentTask) {
            tasks.push(currentTask);
          }

          // Start new task
          currentTask = {
            taskId: taskMatch[1],
            file: filePath,
            line: i + 1, // 1-indexed
            description: taskMatch[2].trim(),
            requirements: [],
          };
          continue;
        }

        // Check for @req reference in indented line (part of current task)
        if (currentTask && this.isIndented(line)) {
          const reqMatch = trimmedLine.match(TASK_REQ_PATTERN);
          if (reqMatch) {
            const idString = reqMatch[1];
            const reqId = this.parseRequirementId(idString, scope);
            if (reqId) {
              currentTask.requirements.push(reqId);
            }
          }
        } else if (currentTask && !this.isIndented(line) && trimmedLine.length > 0) {
          // Non-indented non-empty line means task ended
          // But don't end on empty lines (allow blank lines in task)
          // Actually, we should save and reset on next task, not on non-indented
          // Let the loop handle it naturally by saving on next taskMatch
        }
      }

      // Save last task
      if (currentTask) {
        tasks.push(currentTask);
      }
    } catch (error) {
      // File doesn't exist or can't be read - return empty array
    }

    return tasks;
  }

  /**
   * Parse all tasks.md files in a directory (recursively).
   * @req FR:req-traceability/scan.tasks
   */
  async parseDirectory(dirPath: string): Promise<TaskReference[]> {
    const tasks: TaskReference[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      const parsePromises = entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const tasksPath = path.join(dirPath, entry.name, 'tasks.md');
          return this.parseFile(tasksPath);
        });

      const results = await Promise.all(parsePromises);
      for (const result of results) {
        tasks.push(...result);
      }
    } catch (error) {
      // Directory doesn't exist - return empty array
    }

    return tasks;
  }

  /**
   * Parse a requirement ID string, handling both short-form and qualified.
   * Short-form IDs get the current feature scope applied.
   */
  private parseRequirementId(
    idString: string,
    scope: string
  ): RequirementId | null {
    // Check if it's qualified (has slash)
    if (idString.includes('/')) {
      return parseQualifiedId(idString);
    }

    // It's short-form, add scope
    const shortId = parseShortFormId(idString);
    if (shortId) {
      return buildQualifiedId(shortId, scope);
    }

    return null;
  }

  /**
   * Check if a line is indented (part of a task's details).
   */
  private isIndented(line: string): boolean {
    return /^\s+/.test(line);
  }

  /**
   * Extract the scope (feature/initiative name) from the file path.
   */
  private extractScope(filePath: string): string {
    const dir = path.dirname(filePath);
    return path.basename(dir);
  }
}
