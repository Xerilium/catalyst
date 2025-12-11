---
id: ai-provider
title: AI Provider - Implementation Plan
author: "@flanakin"
description: "Plan for extracting AI provider infrastructure from playbook-actions-ai"
---

# Implementation Plan: AI Provider

## Overview

This feature extracts the AI provider infrastructure from `playbook-actions-ai` into a standalone feature. This enables reuse across multiple Catalyst features (playbook actions, blueprint agents, etc.).

## Extraction Approach

### Phase 1: Move Code (No Changes)

Move files from `src/playbooks/scripts/playbooks/actions/ai/providers/` to `src/playbooks/scripts/ai/providers/`:

| Source | Destination | Notes |
|--------|-------------|-------|
| `types.ts` | `types.ts` | AIProvider, AIProviderRequest, AIProviderResponse, AIUsageStats |
| `factory.ts` | `factory.ts` | createAIProvider(), getAvailableAIProviders() |
| `mock-provider.ts` | `mock-provider.ts` | MockAIProvider |
| `provider-catalog.ts` | `provider-catalog.ts` | AUTO-GENERATED |
| `index.ts` | `index.ts` | Re-exports |

Also move `AIProviderErrors` from `errors.ts` to new `errors.ts` in provider directory.

### Phase 2: Move Tests

Move tests from `tests/actions/ai/providers/` to `tests/ai/providers/`:

| Source | Destination |
|--------|-------------|
| `mock-provider.test.ts` | `mock-provider.test.ts` |
| `factory.test.ts` | `factory.test.ts` |

### Phase 3: Update Import Paths

Files requiring import path updates:

1. **Build scripts:**
   - `scripts/generate-provider-registry.ts` - scan new location

2. **Action code:**
   - `src/playbooks/scripts/playbooks/actions/ai/ai-prompt-action.ts`
   - `src/playbooks/scripts/playbooks/actions/ai/index.ts`
   - `src/playbooks/scripts/playbooks/actions/ai/errors.ts` (remove AIProviderErrors)

3. **Tests:**
   - `tests/actions/ai/ai-prompt-action.test.ts`
   - `tests/actions/ai/integration.test.ts`

### Phase 4: Update Feature Documentation

Update `.xe/features/playbook-actions-ai/spec.md`:
- Add dependency on `ai-provider`
- Remove provider interface definitions (reference ai-provider instead)
- Keep ai-prompt action requirements

## Validation

1. Run `npm run build` - must succeed
2. Run `npm test` - all tests must pass
3. Verify provider catalog generates correctly

## Risk Mitigation

- **Low risk**: This is a pure extraction with no logic changes
- **Rollback**: Git revert if issues arise
- **Validation**: Full test suite must pass before proceeding
