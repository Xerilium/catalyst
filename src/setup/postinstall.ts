#!/usr/bin/env node

import * as path from "path";
import { execSync } from "child_process";
import { generateProviderCommands } from "../ai/commands";
import {
  PROVIDER_COMMAND_CONFIGS,
} from "../ai/providers/command-configs";

/**
 * Find the git project root directory
 *
 * Uses `git rev-parse --show-toplevel` to find the root.
 * Falls back to process.cwd() if not in a git repository.
 *
 * @returns The git root directory path, or process.cwd() as fallback
 */
export function findGitRoot(): string {
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

/**
 * Main postinstall routine
 *
 * 1. Creates the init issue (if applicable)
 * 2. Finds the git root
 * 3. Generates provider commands
 *
 * @param packageRoot - Root directory of the installed package
 * @req FR:ai-provider/commands.generate
 */
export function runPostinstall(packageRoot: string): void {
  // Create the init issue
  try {
    const createInitIssue =
      require("../playbooks/new-init-issue").createInitIssue;
    createInitIssue();
  } catch (error) {
    console.error("Failed to run init issue script:", (error as Error).message);
  }

  console.log("Postinstall running...");

  const projectRoot = findGitRoot();

  // Generate commands for all providers with command configuration
  // Uses provider-based configuration instead of JSON config file
  const templatesDir = path.join(packageRoot, "ai-config/commands");
  generateProviderCommands(projectRoot, templatesDir);

  // Migrate previously committed command files out of git tracking
  // @req FR:ai-provider/commands.migrate
  migrateTrackedCommands(projectRoot);
}

/**
 * Migrate previously committed generated command files out of git tracking
 *
 * Detects tracked command files via `git ls-files` and runs `git rm --cached`
 * to untrack them. Files remain on disk but are removed from the git index.
 * This is idempotent — skips when no tracked files are detected.
 *
 * @param projectRoot - Root directory of the target project
 * @req FR:ai-provider/commands.migrate
 */
export function migrateTrackedCommands(projectRoot: string): void {
  try {
    const providers = Object.values(PROVIDER_COMMAND_CONFIGS);

    for (const provider of providers) {
      const { commands } = provider;
      let checkPath: string;

      if (commands.useNamespaces) {
        // Folder-based: check catalyst/ subdirectory
        checkPath = `${commands.path}/catalyst/`;
      } else {
        // Flat: check for catalyst-prefixed files
        checkPath = `${commands.path}/catalyst.*.${commands.extension}`;
      }

      const trackedFiles = execSync(
        `git ls-files "${checkPath}"`,
        { encoding: "utf8", cwd: projectRoot, stdio: ["pipe", "pipe", "ignore"] }
      ).trim();

      if (trackedFiles) {
        console.log(`Migrating tracked commands for ${provider.displayName}...`);
        execSync(
          `git rm --cached ${trackedFiles.split("\n").map(f => `"${f}"`).join(" ")}`,
          { cwd: projectRoot, stdio: ["pipe", "pipe", "ignore"] }
        );
      }
    }
  } catch (error) {
    // Migration failure should not block postinstall
    console.warn(
      "Command migration skipped:",
      (error as Error).message
    );
  }
}

// Execute when run directly (not when imported for testing)
if (require.main === module) {
  const packageRoot = path.join(__dirname, "..");
  runPostinstall(packageRoot);
}
