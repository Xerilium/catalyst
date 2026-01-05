#!/usr/bin/env node

import * as path from "path";
import { execSync } from "child_process";
import { generateProviderCommands } from "../ai/commands";

// Create the init issue
try {
  const createInitIssue =
    require("../playbooks/new-init-issue").createInitIssue;
  createInitIssue();
} catch (error) {
  console.error("Failed to run init issue script:", (error as Error).message);
}

console.log("Postinstall running...");

// Determine the package root directory (where this script is located)
const packageRoot = path.join(__dirname, "..");

// Find the git project root
function findGitRoot(): string {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    return gitRoot;
  } catch (error) {
    // If not in a git repo, fall back to current working directory
    console.warn("Not in a git repository, using current directory");
    return process.cwd();
  }
}

const projectRoot = findGitRoot();

// Generate commands for all providers with command configuration
// Uses provider-based configuration instead of JSON config file
// @req FR:ai-provider/commands.generate
const templatesDir = path.join(packageRoot, "ai-config/commands");
generateProviderCommands(projectRoot, templatesDir);
