#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Dynamic import for the createInitIssue function
let createInitIssue: (force?: boolean) => void;
try {
  // Try importing from dist structure (when running from installed package)
  createInitIssue = require('./src/playbooks/scripts/new-init-issue').createInitIssue;
} catch {
  try {
    // Try importing from source structure (when running in development)
    createInitIssue = require('../playbooks/scripts/new-init-issue').createInitIssue;
  } catch {
    console.error('Could not load createInitIssue function');
    createInitIssue = () => {};
  }
}

// Run the init issue script
try {
  createInitIssue();
} catch (error) {
  console.error('Failed to run init issue script:', (error as Error).message);
}

console.log('Postinstall running...');

interface IntegrationInfo {
    name: string;
    commands: {
        path: string;
        useNamespaces: boolean;
        useFrontMatter: boolean;
        extension: string;
    }
}

// Read integration config
const configPath = path.join('node_modules/@xerilium/catalyst/dist/integrations/integrations.json');
let integrations: IntegrationInfo[] = [];
try {
  const config = fs.readFileSync(configPath, 'utf8');
  integrations = JSON.parse(config).integrations;
} catch (error) {
  console.error('Failed to read integration config:', (error as Error).message);
}

// Read all command templates
const commandsDir = path.join('node_modules/@xerilium/catalyst/dist/integrations/commands');
let commandFiles: string[] = [];
try {
  commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.md'));
} catch (error) {
  console.error('Failed to read commands directory:', (error as Error).message);
}

// Generate and copy commands
for (const integration of integrations) {
  const { commands } = integration;

  for (const commandFile of commandFiles) {
    // Extract command name from filename (remove .md extension)
    const commandName = path.basename(commandFile, '.md');

    // Read command template
    const templatePath = path.join(commandsDir, commandFile);
    let content = '';
    try {
      content = fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      console.error(`Failed to read command template ${commandFile}:`, (error as Error).message);
      continue;
    }

    // Remove frontmatter if not used
    if (!commands.useFrontMatter) {
      const frontMatterEnd = content.indexOf('---', 4);
      if (frontMatterEnd !== -1) {
        content = content.substring(frontMatterEnd + 3).trim();
      }
    }

    // Apply namespace transformation if useNamespaces is false
    if (!commands.useNamespaces) {
      content = content.replace(new RegExp(`/catalyst:${commandName}`, 'g'), `/catalyst-${commandName}`);
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
      console.error(`Failed to generate ${integration.name} command:`, (error as Error).message);
    }
  }
}