#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import {
  getProjectName,
  isGitHubCliAvailable,
  findIssue,
  prepareIssueTemplate,
  createGitHubIssue
} from "./github";

/**
 * Get the project root directory where npm install was invoked.
 * Uses INIT_CWD environment variable set by npm, or falls back to process.cwd()
 */
function getProjectRoot(): string {
  // npm sets INIT_CWD to the directory where npm was invoked
  return process.env.INIT_CWD || process.cwd();
}

// Main function to create init issue
export function createInitIssue(force: boolean = false): void {
  const projectName = getProjectName();
  const projectRoot = getProjectRoot();

  // Check if already initialized
  const productMdPath = path.join(projectRoot, '.xe/product.md');
  if (fs.existsSync(productMdPath) && !force) {
    console.log('Project already initialized. To force re-run, use --force flag.');
    return;
  }

  // Check if GitHub CLI is available
  if (!isGitHubCliAvailable()) {
    console.error('GitHub CLI (gh) is required but not installed.');
    console.error('Please install it from: https://cli.github.com/');
    console.error('Then authenticate with: gh auth login');
    return;
  }

  // Check if there's already an active init issue
  if (findIssue('[Catalyst][Init]', projectName) && !force) {
    console.log('Active init issue already exists. To force creation of a new one, use --force flag.');
    return;
  }

  // Prepare issue template
  const template = prepareIssueTemplate('init', projectName);
  if (!template) {
    return;
  }

  // Create the issue
  const title = `[Catalyst][Init] ${projectName}`;
  createGitHubIssue(title, template);
}

// Run when executed directly
if (require.main === module) {
  const force = process.argv.includes('--force') || process.argv.includes('-f');
  createInitIssue(force);
}
