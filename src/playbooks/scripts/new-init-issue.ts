#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Get project name from git repo
function getProjectName(): string {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const repoName = remoteUrl.split('/').pop()?.replace('.git', '') || 'New Project';
    return repoName;
  } catch {
    return 'New Project';
  }
}

// Check if GitHub CLI is available
function isGitHubCliAvailable(): boolean {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Main function to create init issue
export function createInitIssue(force: boolean = false): void {
  const projectName: string = getProjectName();

  // Check if already initialized
  if (fs.existsSync('.xe/product.md') && !force) {
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
  try {
    const issues = execSync('gh issue list --state open --json number,title', { encoding: 'utf8' });
    const issueList = JSON.parse(issues);
    const initIssueExists = issueList.some((issue: any) => 
      issue.title.includes('[Catalyst][Init]') && issue.title.includes(projectName)
    );
    
    if (initIssueExists && !force) {
      console.log('Active init issue already exists. To force creation of a new one, use --force flag.');
      return;
    }
  } catch (error) {
    console.log('Could not check for existing issues, proceeding with creation.');
  }

  // Read the init issue template
  // When running from postinstall, the template is relative to the postinstall script location
  const templatePath: string = path.join(
    __dirname,
    "../../../templates/issues/init.md"
  );
  let template: string = fs.readFileSync(templatePath, "utf8");

  // Strip front matter
  const frontMatterEnd = template.indexOf('---', 4);
  if (frontMatterEnd !== -1) {
    template = template.substring(frontMatterEnd + 3).trim();
  }

  // Replace placeholder
  template = template.replace(/{project-name}/g, projectName);

  // Create the issue using GitHub CLI
  const title = `[Catalyst][Init] ${projectName}`;
  const command = `gh issue create --title "${title}" --body "${template.replace(
    /"/g,
    '\\"'
  )}" --assignee ""`;

  try {
    const result = execSync(command, { encoding: "utf8" });
    console.log("Issue created:", result.trim());
  } catch (error: any) {
    if (error.status === 1 && error.stderr?.includes('not logged in')) {
      console.error("Failed to create issue: You are not logged in to GitHub CLI.");
      console.error("Please run: gh auth login");
    } else {
      console.error("Failed to create issue:", error.message);
    }
  }
}

// Run when executed directly
if (require.main === module) {
  const force = process.argv.includes('--force') || process.argv.includes('-f');
  createInitIssue(force);
}
