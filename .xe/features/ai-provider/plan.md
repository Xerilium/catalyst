---
id: ai-provider
title: AI Provider - Implementation Plan
author: "@flanakin"
description: "Implementation plan for AI provider infrastructure"
---

## Implementation Plan: AI Provider

## Overview

This feature provides the AI provider infrastructure for Catalyst. The provider abstraction enables reuse across multiple Catalyst features (playbook actions, blueprint agents, etc.).

## Directory Structure

```text
src/ai/
├── types.ts           # AIProvider, AIProviderRequest, AIProviderResponse, AIUsageStats, AIProviderCommandConfig
├── errors.ts          # AIProviderErrors factory
├── commands.ts        # generateProviderCommands(), getProvidersWithCommands()
├── index.ts           # Public exports
└── providers/
    ├── factory.ts           # createAIProvider(), getAvailableAIProviders()
    ├── mock-provider.ts     # MockAIProvider
    ├── provider-catalog.ts  # AUTO-GENERATED at build time
    └── index.ts             # Re-exports

tests/ai/                    # Provider and command generation tests
```

## Build Integration

Provider catalog generation is integrated into the build process:

1. `scripts/generate-provider-registry.ts` scans `src/ai/providers/*-provider.ts` files
2. Extracts provider name from class instance
3. Generates `provider-catalog.ts` with imports and metadata
4. TypeScript compilation follows

Resource promotion: The build script promotes `src/resources/ai-config/` to `dist/ai-config/` (root level) for cleaner package structure. The `ai-config` folder is included in `package.json` files array.

## Command Config Registry

The `command-configs.ts` file provides a static registry of provider command configurations used by `commands.ts` during postinstall. This registry exists separately from the provider implementations because:

1. **Path alias resolution**: Provider files use TypeScript path aliases (e.g., `@core/errors`) that don't resolve in compiled JavaScript at postinstall time
2. **Dependency isolation**: Loading the full provider catalog would instantiate all providers, pulling in SDK dependencies that may not be needed for command generation
3. **Performance**: Static data doesn't require provider instantiation

The registry must be kept in sync with provider implementations. Future enhancement: auto-generate this registry at build time like the provider catalog.

## Consumers

Files that import from `@ai/`:

1. **Action code:**
   - `src/playbooks/actions/ai/ai-prompt-action.ts`
   - `src/playbooks/actions/ai/index.ts`

2. **Tests:**
   - `tests/actions/ai/ai-prompt-action.test.ts`
   - `tests/actions/ai/integration.test.ts`

## Command Generation

The `generateProviderCommands()` function in `src/ai/commands.ts`:

1. Reads command templates from `src/resources/ai-config/commands/`
2. Iterates all providers with `commands` property defined
3. For each provider, applies transformations:
   - Replace separator (`:` → provider's separator)
   - Remove front matter if `useFrontMatter` is false
   - Flatten namespaces if `useNamespaces` is false
   - Replace `$$AI_PLATFORM$$` with `displayName`
4. Writes to provider's `commands.path` directory

## Provider Command Configurations

| Provider | displayName | path | namespaces | separator | frontMatter | extension |
|----------|-------------|------|------------|-----------|-------------|-----------|
| Claude | Claude | `.claude/commands` | true | `:` | true | `md` |
| Copilot | Copilot | `.github/prompts` | false | `.` | false | `prompt.md` |
| Cursor | Cursor | `.cursor/commands` | true | `/` | true | `md` |

## Validation

1. Run `npm run build` - must succeed
2. Run `npm test` - all tests must pass
3. Verify provider catalog generates correctly
4. Verify command generation produces identical output to current implementation
