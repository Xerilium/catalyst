#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

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
    separator: string;
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

    // Apply namespace transformation based on integration settings
    if (commands.useNamespaces) {
      // Replace default separator (:) with integration-specific separator
      content = content.replace(
        new RegExp(`/catalyst:${commandName}`, "g"),
        `/catalyst${commands.separator}${commandName}`
      );
    } else {
      // For non-namespaced integrations, replace : with -
      content = content.replace(
        new RegExp(`/catalyst:${commandName}`, "g"),
        `/catalyst-${commandName}`
      );
    }

    // Replace AI platform placeholder with integration name
    content = content.replace(/\$\$AI_PLATFORM\$\$/g, integration.name);

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
