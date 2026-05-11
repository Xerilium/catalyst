#!/usr/bin/env tsx
/**
 * Generate AI provider command configurations catalog.
 *
 * Scans all *-provider.ts implementations, instantiates each, and collects
 * the `name`, `displayName`, and `commands` instance properties from any
 * provider that declares a `commands` configuration. Emits the result to
 * dist/resources/ai-providers/command-configs.json for consumption by the
 * install playbook (src/resources/playbooks/install-ai-providers.yaml).
 *
 * The install playbook reads this file via `catalyst://resources/ai-providers/command-configs.json`,
 * which resolves to node_modules/@xerilium/catalyst/resources/ai-providers/command-configs.json
 * at consumer install time.
 *
 * Run as part of the build pipeline (scripts/build.ts).
 *
 * @req FR:ai-provider/commands.discovery
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

interface CommandConfig {
  path: string;
  useNamespaces: boolean;
  separator: string;
  useFrontMatter: boolean;
  extension: string;
}

interface ProviderEntry {
  displayName: string;
  commands: CommandConfig;
}

async function generateCommandConfigs(): Promise<void> {
  const providerFiles = await glob('src/ai/providers/*-provider.ts', { absolute: true, nodir: true });
  const entries: Record<string, ProviderEntry> = {};

  for (const filePath of providerFiles) {
    const module = await import(filePath);

    for (const exportName of Object.keys(module)) {
      const ExportedClass = module[exportName];
      if (typeof ExportedClass !== 'function' || !ExportedClass.prototype) continue;
      if (typeof ExportedClass.prototype.execute !== 'function') continue;

      let instance: { name?: string; displayName?: string; commands?: CommandConfig };
      try {
        instance = new ExportedClass();
      } catch {
        // Constructor requires arguments — skip; only command-emitting providers must be no-arg.
        continue;
      }

      if (!instance.name || !instance.displayName || !instance.commands) continue;
      entries[instance.name] = {
        displayName: instance.displayName,
        commands: instance.commands
      };
    }
  }

  const outDir = path.join('dist', 'ai-providers');
  const outPath = path.join(outDir, 'command-configs.json');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(entries, null, 2) + '\n');
  console.log(`  Wrote ${outPath} (${Object.keys(entries).length} providers)`);
}

generateCommandConfigs().catch((err) => {
  console.error('Failed to generate command configs:', err);
  process.exit(1);
});
