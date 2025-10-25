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

const projectName: string = getProjectName();

// Check for force flag
const force = process.argv.includes('--force') || process.argv.includes('-f');

// Check if already initialized
if (fs.existsSync('.xe/product.md') && !force) {
  console.log('Project already initialized. To force re-run, use --force flag.');
  process.exit(0);
}

// Read the init issue template
const templatePath: string = path.join(
  __dirname,
  "../../templates/issues/init.md"
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
} catch (error) {
  console.error("Failed to create issue:", (error as Error).message);
}
