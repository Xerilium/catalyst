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
├── types.ts           # AIProvider, AIProviderRequest, AIProviderResponse, AIUsageStats
├── errors.ts          # AIProviderErrors factory
├── index.ts           # Public exports
└── providers/
    ├── factory.ts           # createAIProvider(), getAvailableAIProviders()
    ├── mock-provider.ts     # MockAIProvider
    ├── provider-catalog.ts  # AUTO-GENERATED at build time
    └── index.ts             # Re-exports

tests/ai/providers/
├── mock-provider.test.ts
└── factory.test.ts
```

## Build Integration

Provider catalog generation is integrated into the build process:

1. `scripts/generate-provider-registry.ts` scans `src/ai/providers/*-provider.ts` files
2. Extracts provider name from class instance
3. Generates `provider-catalog.ts` with imports and metadata

## Consumers

Files that import from `@ai/`:

1. **Action code:**
   - `src/playbooks/actions/ai/ai-prompt-action.ts`
   - `src/playbooks/actions/ai/index.ts`

2. **Tests:**
   - `tests/actions/ai/ai-prompt-action.test.ts`
   - `tests/actions/ai/integration.test.ts`

## Validation

1. Run `npm run build` - must succeed
2. Run `npm test` - all tests must pass
3. Verify provider catalog generates correctly
