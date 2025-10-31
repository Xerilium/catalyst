#!/usr/bin/env node

import * as fs from "fs";
import {
  getProjectName,
  isGitHubCliAvailable,
  checkForExistingIssue,
  createGitHubIssue
} from "./github";

// Main function to create blueprint issue with AI-drafted content
export function createBlueprintIssue(contentFile?: string): void {
  const projectName = getProjectName();

  // Check if GitHub CLI is available
  if (!isGitHubCliAvailable()) {
    console.error('GitHub CLI (gh) is required but not installed.');
    console.error('Please install it from: https://cli.github.com/');
    console.error('Then authenticate with: gh auth login');
    return;
  }

  // Check if there's already an active blueprint issue
  if (checkForExistingIssue('[Catalyst][Blueprint]', projectName)) {
    console.log('Active blueprint issue already exists.');
    return;
  }

  // Read AI-drafted content from file
  if (!contentFile || !fs.existsSync(contentFile)) {
    console.error('Content file not provided or does not exist.');
    console.error('Usage: new-blueprint-issue.js --content <file>');
    return;
  }

  const issueBody = fs.readFileSync(contentFile, 'utf8');

  // Create the issue
  const title = `[Catalyst][Blueprint] ${projectName} Blueprint`;
  createGitHubIssue(title, issueBody);

  // Clean up temp file
  fs.unlinkSync(contentFile);
}

// Run when executed directly
if (require.main === module) {
  const contentFileArg = process.argv.find(arg => arg.startsWith('--content='));
  const contentFile = contentFileArg?.split('=')[1];

  createBlueprintIssue(contentFile);
}
