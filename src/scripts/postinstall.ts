#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Create the init issue
try {
  const createInitIssue =
    require("../playbooks/scripts/new-init-issue").createInitIssue;
  createInitIssue();
} catch (error) {
  console.error("Failed to run init issue script:", (error as Error).message);
}

console.log("Postinstall running...");

interface IntegrationInfo {
  name: string;
  commands: {
    path: string;
    useNamespaces: boolean;
    useFrontMatter: boolean;
    extension: string;
  };
}

// Determine the package root directory (where this script is located)
const packageRoot = path.join(__dirname, "..");

// Read integration config
const configPath = path.join(packageRoot, "integrations/integrations.json");
let integrations: IntegrationInfo[] = [];
try {
  const config = fs.readFileSync(configPath, "utf8");
  integrations = JSON.parse(config).integrations;
} catch (error) {
  console.error("Failed to read integration config:", (error as Error).message);
}

// Read all command templates
const commandsDir = path.join(packageRoot, "integrations/commands");
let commandFiles: string[] = [];
try {
  commandFiles = fs
    .readdirSync(commandsDir)
    .filter((file) => file.endsWith(".md"));
} catch (error) {
  console.error("Failed to read commands directory:", (error as Error).message);
}

// Generate and copy commands
for (const integration of integrations) {
  const { commands } = integration;

  for (const commandFile of commandFiles) {
    // Extract command name from filename (remove .md extension)
    const commandName = path.basename(commandFile, ".md");

    // Read command template
    const templatePath = path.join(commandsDir, commandFile);
    let content = "";
    try {
      content = fs.readFileSync(templatePath, "utf8");
    } catch (error) {
      console.error(
        `Failed to read command template ${commandFile}:`,
        (error as Error).message
      );
      continue;
    }

    // Remove frontmatter if not used
    if (!commands.useFrontMatter) {
      const frontMatterEnd = content.indexOf("---", 4);
      if (frontMatterEnd !== -1) {
        content = content.substring(frontMatterEnd + 3).trim();
      }
    }

    // Apply namespace transformation if useNamespaces is false
    if (!commands.useNamespaces) {
      content = content.replace(
        new RegExp(`/catalyst:${commandName}`, "g"),
        `/catalyst-${commandName}`
      );
    }

    // Determine filename and path
    let fileName: string;
    if (!!commands.useNamespaces) {
      fileName = `catalyst/${commandName}.${commands.extension}`;
    } else {
      fileName = `catalyst-${commandName}.${commands.extension}`;
    }
    const targetPath = path.join(commands.path, fileName);

    try {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content);
      console.log(`Generated ${integration.name} command at ${targetPath}`);
    } catch (error) {
      console.error(
        `Failed to generate ${integration.name} command:`,
        (error as Error).message
      );
    }
  }
}

// Get git root directory using git command
function getGitRoot(): string | null {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    return gitRoot;
  } catch {
    return null;
  }
}

// Configure git to ignore Catalyst-generated files locally
// This uses .git/info/exclude instead of .gitignore so the files remain
// visible to tools like Claude Code while staying out of git status
try {
  const gitRoot = getGitRoot();
  if (!gitRoot) {
    throw new Error("Not in a git repository");
  }

  const excludePath = path.join(gitRoot, ".git/info/exclude");

  // Read existing exclude file
  let excludeContent = "";
  if (fs.existsSync(excludePath)) {
    excludeContent = fs.readFileSync(excludePath, "utf8");
  }

  // Generate exclusion patterns from integrations config
  // This ensures we automatically exclude all Catalyst-generated command files
  const patterns: string[] = [];
  for (const integration of integrations) {
    const { commands } = integration;

    if (commands.useNamespaces) {
      // For namespaced commands: .claude/commands/catalyst/
      patterns.push(`${commands.path}/catalyst/`);
    } else {
      // For non-namespaced commands: .github/prompts/catalyst-*.prompt.md
      patterns.push(`${commands.path}/catalyst-*.${commands.extension}`);
    }
  }

  let needsUpdate = false;
  const newPatterns: string[] = [];

  for (const pattern of patterns) {
    if (!excludeContent.includes(pattern)) {
      needsUpdate = true;
      newPatterns.push(pattern);
    }
  }

  if (needsUpdate) {
    const header = "\n# Catalyst-generated files (local exclusion)\n";
    const additions = newPatterns.join("\n") + "\n";

    fs.appendFileSync(excludePath, header + additions);
    console.log(
      "Configured .git/info/exclude to ignore Catalyst-generated files"
    );
  }
} catch (error) {
  // Silently fail if not in a git repo or if there are permission issues
  // This is optional convenience functionality
  console.log("Skipping git exclude configuration:", (error as Error).message);
}
