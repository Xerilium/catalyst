---
id: playbook-actions-ai
title: "Research: Playbook Actions - AI"
description: "Research notes on AI SDK integration patterns and platform-specific implementation guidance"
date: 2025-12-08
---

<!-- markdownlint-disable single-title -->

# Research: Playbook Actions - AI

## Summary

This research documents the AI SDK landscape for integrating AI platforms into the Catalyst playbook engine. The primary focus is on the Claude Agent SDK (subscription-based model), with secondary research on Gemini and OpenAI Codex for future extensibility. The provider architecture defined in `spec.md` accommodates all researched platforms through a common interface using a factory pattern.

## Scope

**In scope:**

- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) - primary integration target
- Google Gemini SDK (`@google/genai`) - secondary integration
- OpenAI Codex SDK (`@openai/codex`) - secondary integration
- GitHub Copilot programmatic access - feasibility assessment
- Cursor AI programmatic access - feasibility assessment
- Provider interface design for multi-platform support

**Out of scope:**

- API-based Claude access (`@anthropic-ai/sdk`) - user specified subscription model only
- Implementation details for platform-specific providers (separate features)
- Pricing and cost optimization strategies

## Methods

- Official SDK documentation review
- NPM package analysis
- GitHub repository exploration
- Web search for current (2025) SDK status and capabilities

## Sources

### Claude Agent SDK

- [GitHub: anthropics/claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript) - Official TypeScript SDK repository
- [NPM: @anthropic-ai/claude-agent-sdk](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) - NPM package
- [Claude Agent SDK Documentation](https://platform.claude.com/docs/en/agent-sdk/overview) - Official documentation
- [TypeScript SDK Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) - Complete API reference

### Google Gemini SDK

- [GitHub: googleapis/js-genai](https://github.com/googleapis/js-genai) - Official TypeScript/JavaScript SDK
- [NPM: @google/genai](https://www.npmjs.com/package/@google/genai) - NPM package (v1.31.0)
- [Gemini API Quickstart](https://ai.google.dev/gemini-api/docs/quickstart) - Official documentation

### OpenAI Codex SDK

- [OpenAI Codex SDK Documentation](https://developers.openai.com/codex/sdk/) - Official SDK docs
- [GitHub: openai/codex](https://github.com/openai/codex) - Codex CLI and SDK
- [Codex General Availability Announcement](https://openai.com/index/codex-now-generally-available/) - October 2025

### GitHub Copilot

- [GitHub Copilot Extensions Documentation](https://docs.github.com/en/copilot/concepts/extensions/build-extensions) - Extension building guide
- [Copilot Extensions Preview SDK](https://github.com/copilot-extensions/preview-sdk.js/) - Preview SDK for extensions

## Technical Context

### Claude Agent SDK (Primary Target)

The Claude Agent SDK is the recommended integration for Catalyst, using the subscription-based model (Claude Code). It provides:

**Package:** `@anthropic-ai/claude-agent-sdk`
**Node.js Requirement:** >= 18
**Status:** Generally available, actively maintained

#### Core API Structure

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// Primary function for AI interaction
const result = query({
  prompt: string | AsyncIterable<SDKUserMessage>,
  options?: Options
}): Query;

// Query is an AsyncGenerator<SDKMessage> with additional methods
interface Query extends AsyncGenerator<SDKMessage, void> {
  interrupt(): Promise<void>;
  setPermissionMode(mode: PermissionMode): Promise<void>;
  setModel(model?: string): Promise<void>;
  supportedModels(): Promise<ModelInfo[]>;
  accountInfo(): Promise<AccountInfo>;
}
```

#### Key Options for Integration

```typescript
interface Options {
  // Model selection
  model?: string;                    // Claude model to use
  fallbackModel?: string;            // Fallback if primary fails

  // Prompt configuration
  systemPrompt?: string | { type: 'preset'; preset: 'claude_code'; append?: string };

  // Output formatting
  outputFormat?: { type: 'json_schema'; schema: JSONSchema };

  // Execution control
  timeout?: number;                  // Not directly supported - use AbortController
  abortController?: AbortController; // For cancellation
  maxTurns?: number;                 // Maximum conversation turns
  maxBudgetUsd?: number;             // Budget limit

  // Permission modes
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';

  // Tool access
  allowedTools?: string[];           // Whitelist tools
  disallowedTools?: string[];        // Blacklist tools
  tools?: string[] | { type: 'preset'; preset: 'claude_code' };

  // Working directory
  cwd?: string;                      // Current working directory
  additionalDirectories?: string[];  // Additional accessible directories
}
```

#### Message Types

```typescript
type SDKMessage =
  | SDKAssistantMessage    // AI response
  | SDKUserMessage         // User input
  | SDKResultMessage       // Final result with usage stats
  | SDKSystemMessage       // System initialization
  | SDKPartialAssistantMessage; // Streaming partial (if enabled)

// Result message contains usage statistics
interface SDKResultMessage {
  type: 'result';
  subtype: 'success' | 'error_*';
  duration_ms: number;
  total_cost_usd: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  result: string;           // Final text result
  structured_output?: unknown; // If outputFormat specified
}
```

#### Claude Provider Implementation Pattern

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { AIProvider, AIProviderRequest, AIProviderResponse } from './types';
import { CatalystError } from '../../errors';

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';

  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    const abortController = new AbortController();

    // Set up timeout
    const timeoutId = setTimeout(() => abortController.abort(), request.timeout);

    try {
      const queryResult = query({
        prompt: this.buildPrompt(request),
        options: {
          model: request.model || 'sonnet',
          systemPrompt: request.systemPrompt,
          outputFormat: request.outputFormat?.type === 'json_schema'
            ? { type: 'json_schema', schema: request.outputFormat.schema }
            : undefined,
          abortController,
          permissionMode: 'bypassPermissions', // No interactive permissions in playbooks
          maxTurns: 1, // Single turn for prompt execution
        }
      });

      let result: SDKResultMessage | undefined;
      for await (const message of queryResult) {
        if (message.type === 'result') {
          result = message;
        }
      }

      if (!result || result.subtype !== 'success') {
        throw new CatalystError('AI execution failed', 'AIProviderError');
      }

      return {
        content: result.structured_output
          ? JSON.stringify(result.structured_output)
          : result.result,
        model: request.model || 'sonnet',
        usage: {
          inputTokens: result.usage.input_tokens,
          outputTokens: result.usage.output_tokens,
          totalTokens: result.usage.input_tokens + result.usage.output_tokens,
          costUsd: result.total_cost_usd
        }
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async isAvailable(): Promise<boolean> {
    // Check for ANTHROPIC_API_KEY or Claude subscription
    return !!process.env.ANTHROPIC_API_KEY || await this.checkSubscription();
  }

  private async checkSubscription(): Promise<boolean> {
    // Implementation would check Claude subscription status
    return false;
  }

  private buildPrompt(request: AIProviderRequest): string {
    let prompt = request.prompt;
    if (request.context) {
      prompt = `Context:\n${JSON.stringify(request.context, null, 2)}\n\n${prompt}`;
    }
    return prompt;
  }
}
```

### Google Gemini SDK

**Package:** `@google/genai`
**Node.js Requirement:** >= 18
**Status:** Generally available (GA as of May 2025)

#### Core API Structure

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'GEMINI_API_KEY' });

// Generate content
const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: [{ role: 'user', parts: [{ text: 'prompt' }] }],
  config: {
    maxOutputTokens: 2048,
    temperature: 0.7,
  }
});

// Response structure
interface GenerateContentResponse {
  text: string;
  candidates: Candidate[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
```

#### Gemini Provider Implementation Pattern

```typescript
import { GoogleGenAI } from '@google/genai';
import type { AIProvider, AIProviderRequest, AIProviderResponse } from './types';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    const model = request.model || 'gemini-2.0-flash';

    const contents = [];
    if (request.systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: `System: ${request.systemPrompt}` }] });
    }
    contents.push({ role: 'user', parts: [{ text: request.prompt }] });

    const response = await this.client.models.generateContent({
      model,
      contents,
      config: {
        maxOutputTokens: request.maxTokens,
      }
    });

    return {
      content: response.text,
      model,
      usage: {
        inputTokens: response.usageMetadata.promptTokenCount,
        outputTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount
      }
    };
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.GEMINI_API_KEY;
  }
}
```

### OpenAI Codex SDK

**Package:** `@openai/codex`
**Node.js Requirement:** >= 18
**Status:** Generally available (October 2025)

#### Core API Structure

```typescript
import Codex from '@openai/codex';

const codex = new Codex({
  apiKey: process.env.OPENAI_API_KEY
});

// Execute a task
const result = await codex.run({
  prompt: 'Implement a function to...',
  model: 'gpt-5-codex',
  maxTokens: 4096
});

// Response includes structured output capability
interface CodexResult {
  output: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  duration_ms: number;
}
```

### GitHub Copilot

**Status:** No public API for direct programmatic access

GitHub Copilot does NOT provide a public API for programmatic access outside of IDE integrations. Key findings:

1. **Extension Platform (Closing November 2025):** GitHub Apps-based Copilot Extensions are being deprecated
2. **VS Code Extensions:** Remain supported but require VS Code environment
3. **MCP Servers:** Recommended replacement for extension functionality
4. **Unofficial Solutions:** Community projects exist but violate GitHub ToS and risk account suspension

**Recommendation:** Do not implement a Copilot provider.

### Cursor AI

**Status:** No programmatic SDK available

Cursor AI is an IDE-based tool with no public SDK for programmatic integration. It supports:

- Custom API keys for backend providers (OpenAI, Anthropic, Google)
- MCP server integration for tool connectivity

**Recommendation:** Do not implement a Cursor provider.

## Migration / Compatibility Considerations

### Provider Factory Pattern

Providers are instantiated on-demand using the `createAIProvider(name)` factory function. The factory uses a build-time catalog (similar to the action catalog) to discover available provider classes:

```typescript
// src/playbooks/actions/ai/provider-factory.ts
import { CatalystError } from '../../errors';
import type { AIProvider } from './types';

// Generated at build time from provider classes
import { PROVIDER_CATALOG, PROVIDER_CLASSES } from './provider-catalog';

export function createAIProvider(name: string): AIProvider {
  const ProviderClass = PROVIDER_CLASSES[name];
  if (!ProviderClass) {
    throw new CatalystError(
      `AI provider "${name}" not found`,
      'AIProviderNotFound',
      `Available providers: ${Object.keys(PROVIDER_CATALOG).join(', ')}`
    );
  }
  return new ProviderClass();
}

export function getAvailableAIProviders(): string[] {
  return Object.keys(PROVIDER_CATALOG);
}
```

### Error Code Mapping

Each provider should map platform-specific errors to standard Catalyst error codes:

| Platform Error | Catalyst Error Code |
|---------------|---------------------|
| Rate limit exceeded | `AIRateLimited` |
| Invalid API key | `AIProviderUnavailable` |
| Model not found | `AIProviderError` |
| Network timeout | `AIPromptTimeout` |
| Invalid response | `AIOutputInvalid` |

## Open Questions

- Q001: Should providers support retry logic internally, or should retries be handled at the action level?
  - **Recommendation:** Handle at action level for consistency across providers
  - Owner: @flanakin
  - Status: Decided - action level

- Q002: Should the `outputFormat` JSON schema be passed to providers that support native structured output (Claude, Gemini)?
  - **Recommendation:** Yes, providers should use native capabilities when available
  - Owner: @flanakin
  - Status: Decided - pass to providers

## Decision Log

- **Decision:** Use Claude Agent SDK (subscription model) as primary integration
  - Rationale: User requirement; aligns with Catalyst's existing Claude Code integration
  - Date: 2025-12-08
  - Owner: @flanakin

- **Decision:** Do not implement GitHub Copilot or Cursor providers
  - Rationale: No public programmatic APIs available; would require unsupported workarounds
  - Date: 2025-12-08
  - Owner: @flanakin

- **Decision:** Use factory pattern for provider instantiation
  - Rationale: Configuration-driven; providers created on-demand from config; no global mutable state
  - Date: 2025-12-08
  - Owner: @flanakin

- **Decision:** Timeout handling via AbortController at action level
  - Rationale: Claude Agent SDK doesn't have native timeout; consistent approach across providers
  - Date: 2025-12-08
  - Owner: @flanakin

## References

- [spec.md](./spec.md) - Feature specification with interface definitions
