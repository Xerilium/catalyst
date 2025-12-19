---
id: ai-provider
title: AI Provider Research
author: "@flanakin"
description: "Research notes for the AI provider feature, including SDK analysis, provider patterns, and ai-config integration."
---

# Research: AI Provider

## Summary

This research documents the AI SDK landscape for integrating AI platforms into Catalyst. The provider architecture accommodates multiple platforms through a common interface using a factory pattern. Research also covers the potential merge of ai-config (slash command configuration) into ai-provider.

## Scope

**In scope:**

- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) - primary integration target
- Google Gemini SDK (`@google/genai`) - secondary integration
- OpenAI SDK (`openai`) - secondary integration
- Ollama local models - local/offline support
- GitHub Copilot programmatic access - feasibility assessment
- Cursor AI programmatic access - feasibility assessment
- Provider interface design for multi-platform support
- ai-config merge analysis

**Out of scope:**

- API-based Claude access (`@anthropic-ai/sdk`) - user specified subscription model only
- Pricing and cost optimization strategies
- Action-level concerns (retry logic, output validation)

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

### OpenAI SDK

- [NPM: openai](https://www.npmjs.com/package/openai) - Official OpenAI SDK
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference) - API reference

### Ollama

- [Ollama Documentation](https://ollama.ai/docs) - Official documentation
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md) - REST API reference

### GitHub Copilot

- [GitHub Copilot Extensions Documentation](https://docs.github.com/en/copilot/concepts/extensions/build-extensions) - Extension building guide
- [Copilot Extensions Preview SDK](https://github.com/copilot-extensions/preview-sdk.js/) - Preview SDK for extensions

---

## Provider SDK Research

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

### OpenAI SDK

**Package:** `openai`
**Node.js Requirement:** >= 18
**Status:** Generally available

#### Core API Structure

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ],
  max_tokens: maxTokens
});

// Response includes usage
interface ChatCompletion {
  choices: Array<{ message: { content: string } }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### Ollama (Local Models)

**Package:** None (REST API)
**Status:** Generally available for local deployment

#### Core API Structure

```typescript
// Direct HTTP calls to local Ollama server
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama2',
    prompt: prompt,
    system: systemPrompt,
    stream: false
  })
});

// Response structure
interface OllamaResponse {
  response: string;
  done: boolean;
  eval_count?: number;      // Output tokens
  prompt_eval_count?: number; // Input tokens
}
```

### GitHub Copilot

**Status:** No public API for direct programmatic access

GitHub Copilot does NOT provide a public API for programmatic access outside of IDE integrations. Key findings:

1. **Extension Platform (Closing November 2025):** GitHub Apps-based Copilot Extensions are being deprecated
2. **VS Code Extensions:** Remain supported but require VS Code environment
3. **MCP Servers:** Recommended replacement for extension functionality
4. **CLI Access:** `gh copilot` CLI extension provides interactive access

**Recommendation:** Implement as CLI-based provider (interactive-only, no headless capability).

### Cursor AI

**Status:** No programmatic SDK available

Cursor AI is an IDE-based tool with no public SDK for programmatic integration. It supports:

- Custom API keys for backend providers (OpenAI, Anthropic, Google)
- MCP server integration for tool connectivity
- CLI access via `cursor` command

**Recommendation:** Implement as CLI-based provider (interactive-only, no headless capability).

---

## Provider Interface Design

### Core Interface

```typescript
export type AIProviderCapability = 'headless';

export interface AIProvider {
  readonly name: string;
  readonly capabilities: AIProviderCapability[];

  execute(request: AIProviderRequest): Promise<AIProviderResponse>;
  isAvailable(): Promise<boolean>;
  signIn(): Promise<void>;
}
```

### Provider Categories

| Provider | Type | Headless | Auth Method |
|----------|------|----------|-------------|
| Claude | SDK | Yes | API key or subscription |
| Gemini | SDK | Yes | API key |
| OpenAI | SDK | Yes | API key |
| Ollama | REST | Yes | None (local) |
| Copilot | CLI | No | GitHub auth + subscription |
| Cursor | CLI | No | Cursor auth + subscription |

### Factory Pattern

Providers are instantiated on-demand using the `createAIProvider(name)` factory function:

```typescript
import { PROVIDER_CATALOG, PROVIDER_CLASSES } from './provider-catalog';

export function createAIProvider(name: string): AIProvider {
  const ProviderClass = PROVIDER_CLASSES[name];
  if (!ProviderClass) {
    throw AIProviderErrors.notFound(name, Object.keys(PROVIDER_CATALOG));
  }
  return new ProviderClass();
}

export function getAvailableAIProviders(): string[] {
  return Object.keys(PROVIDER_CATALOG);
}

export async function getHeadlessAIProviders(): Promise<string[]> {
  const providers = getAvailableAIProviders();
  const headless: string[] = [];
  for (const name of providers) {
    const provider = createAIProvider(name);
    if (provider.capabilities.includes('headless') && await provider.isAvailable()) {
      headless.push(name);
    }
  }
  return headless;
}
```

### Error Code Mapping

Each provider maps platform-specific errors to standard Catalyst error codes:

| Platform Error | Catalyst Error Code |
|---------------|---------------------|
| Rate limit exceeded | `AIRateLimited` |
| Invalid API key | `AIProviderUnavailable` |
| Model not found | `AIProviderError` |
| Network timeout | `AIPromptTimeout` |
| Invalid response | `AIOutputInvalid` |
| CLI not found | `AIProviderUnavailable` |
| Not authenticated | `AIProviderUnavailable` |

---

## Merging ai-config into ai-provider

### Background

The original design had two separate concepts:

- **ai-provider**: Allows Catalyst to use AI (Catalyst → AI direction)
- **ai-config**: Allows AI to use Catalyst (AI → Catalyst direction)

The question is whether these should remain separate features or be merged.

### Current State

**ai-config.json** contains command transformation rules per platform:

```json
{
  "integrations": [
    {
      "name": "Claude",
      "commands": {
        "path": ".claude/commands",
        "useNamespaces": true,
        "useFrontMatter": true,
        "extension": "md"
      }
    },
    {
      "name": "GitHub Copilot",
      "commands": {
        "path": ".github/prompts",
        "useNamespaces": false,
        "useFrontMatter": false,
        "extension": "prompt.md"
      }
    }
  ]
}
```

**AIProvider interface** contains runtime execution concerns:

```typescript
export interface AIProvider {
  readonly name: string;
  readonly capabilities: AIProviderCapability[];
  execute(request: AIProviderRequest): Promise<AIProviderResponse>;
  isAvailable(): Promise<boolean>;
  signIn(): Promise<void>;
}
```

### Analysis

| Aspect | ai-config.json | AIProvider |
|--------|---------------|------------|
| **Direction** | AI → Catalyst (how AI tools invoke Catalyst) | Catalyst → AI (how Catalyst uses AI) |
| **When used** | Postinstall (setup time) | Runtime (playbook execution) |
| **Purpose** | Command file transformation | AI prompt execution |
| **Data** | Static file paths/formats | Dynamic API credentials/execution |

### Arguments for Keeping Separate

1. **Different lifecycles**: ai-config is used at install time by postinstall.ts, while ai-provider is used at runtime by playbooks
2. **Different consumers**: ai-config is consumed by file generation logic, ai-provider by playbook execution
3. **Not 1:1 mapping**: Could have AI platforms without slash commands (e.g., Ollama has no IDE integration), or slash command platforms that aren't AI providers
4. **Separation of concerns**: Mixing "how to generate command files" with "how to execute AI prompts" would conflate two distinct responsibilities

### Arguments for Merging

1. **Onboarding friction**: When adding a new provider like "Windsurf", you'd have to:
   - Create `src/ai/providers/windsurf-provider.ts` (ai-provider)
   - Add entry to `src/resources/ai-config/ai-config.json` (ai-config)
   These are tightly coupled - both are about "Windsurf integration" but defined separately.

2. **Single source of truth**: Each provider should be defined in one place
3. **Optional capabilities**: If a provider doesn't support slash commands, just omit `commandConfig`. If it doesn't support runtime execution, it could be a "config-only" implementation.

### Proposed Merged Approach

Extend the AIProvider interface with optional command configuration:

```typescript
export interface AIProvider {
  readonly name: string;
  readonly capabilities: AIProviderCapability[];

  // Existing runtime methods
  execute(request: AIProviderRequest): Promise<AIProviderResponse>;
  isAvailable(): Promise<boolean>;
  signIn(): Promise<void>;

  // NEW: Optional command integration config
  readonly commandConfig?: {
    path: string;           // e.g., ".claude/commands"
    useNamespaces: boolean; // e.g., true for Claude
    useFrontMatter: boolean;
    extension: string;      // e.g., "md"
  };
}
```

Then postinstall.ts would:

1. Import provider catalog (already generated at build time)
2. Filter providers that have `commandConfig` defined
3. Generate commands for those providers

### Benefits of Merged Approach

- Single source of truth per provider
- Adding a new provider is one place, one file
- Providers without command support just omit `commandConfig`
- Providers without runtime execution could be "config-only" implementations

### Trade-offs

- postinstall.ts would need to import the provider catalog
- Slight coupling between setup and runtime code
- Provider files become slightly larger

### Recommendation

**Merge ai-config into ai-provider.** The onboarding friction argument is compelling - related configuration should live together. The `commandConfig` property is optional, so providers like Ollama that have no IDE integration simply don't define it, and providers that only have IDE integration but no programmatic execution can implement minimal/throwing execute() methods.

### Implementation Notes

- The `name` field already maps between ai-config and ai-provider (e.g., "Claude" in ai-config.json matches ClaudeProvider.name)
- postinstall.ts already reads from a generated file (ai-config.json), so reading from provider-catalog.ts instead is architecturally similar
- This change would eliminate the separate `slash-command-integration` feature in the blueprint

---

## Open Questions

- Q001: Should providers support retry logic internally, or should retries be handled at the action level?
  - **Recommendation:** Handle at action level for consistency across providers
  - Owner: @flanakin
  - Status: Decided - action level (moved to playbook-actions-ai)

- Q002: Should the `outputFormat` JSON schema be passed to providers that support native structured output (Claude, Gemini)?
  - **Recommendation:** Yes, providers should use native capabilities when available
  - Owner: @flanakin
  - Status: Decided - pass to providers (moved to playbook-actions-ai)

- Q003: Should ai-config be merged into ai-provider?
  - **Recommendation:** Yes, merge to reduce onboarding friction
  - Owner: @flanakin
  - Status: Pending implementation

## Decision Log

- **Decision:** Use Claude Agent SDK (subscription model) as primary integration
  - Rationale: User requirement; aligns with Catalyst's existing Claude Code integration
  - Date: 2025-12-08
  - Owner: @flanakin

- **Decision:** Implement GitHub Copilot and Cursor as CLI-based providers
  - Rationale: No public programmatic APIs available; CLI provides interactive access
  - Date: 2025-12-08
  - Owner: @flanakin
  - Note: Updated from original "do not implement" decision

- **Decision:** Use factory pattern for provider instantiation
  - Rationale: Configuration-driven; providers created on-demand from config; no global mutable state
  - Date: 2025-12-08
  - Owner: @flanakin

- **Decision:** Timeout handling via AbortController at action level
  - Rationale: Claude Agent SDK doesn't have native timeout; consistent approach across providers
  - Date: 2025-12-08
  - Owner: @flanakin

- **Decision:** Merge ai-config into ai-provider (pending)
  - Rationale: Reduces onboarding friction; single source of truth per provider
  - Date: 2025-12-14
  - Owner: @flanakin
  - Status: Pending implementation

---

## IDE Command Integration Research (2025-12-15)

### Platforms with Slash Command Support

| Platform | Path | Namespaces | Separator | Format | FrontMatter | Source |
|----------|------|------------|-----------|--------|-------------|--------|
| Claude Code | `.claude/commands/` | Yes | `:` | Markdown | Yes | Current implementation |
| GitHub Copilot | `.github/prompts/` | No | `.` | Markdown | No | Current implementation |
| Cursor | `.cursor/commands/` | Yes | `/` | Markdown | Yes | [PR #65](https://github.com/xerilium/catalyst/pull/65) |
| Gemini CLI | `.gemini/commands/` | Yes | `:` | **TOML** | N/A | [gemini-cli docs](https://github.com/google-gemini/gemini-cli) |
| Windsurf | `.windsurf/workflows/` | No | N/A | Markdown | Yes | [Windsurf docs](https://docs.windsurf.com/windsurf/cascade/workflows) |

### Key Findings

1. **Gemini uses TOML format** - Unlike other platforms, Gemini CLI uses TOML files with a `prompt` field and optional `description`. This is fundamentally different from the markdown-based command templates used by Claude, Copilot, and Cursor.

2. **Windsurf uses "workflows"** - Windsurf's markdown format includes a structured title/description/steps format that differs from the narrative playbook-style templates we use.

3. **Separators vary by platform** - Claude uses `:`, Cursor uses `/`, Copilot uses `.`

4. **Three platforms share template format** - Claude, Copilot, and Cursor all use markdown with minor transformations (separator, front matter, extension).

### Scope Decision

**In scope for this rollout:**

- Claude Code (markdown, `:` separator, namespaced)
- GitHub Copilot (markdown, `.` separator, flat)
- Cursor (markdown, `/` separator, namespaced)

**Explicitly out of scope:**

- **Gemini CLI** - Uses TOML format, not markdown. Would require either separate TOML templates or a markdown-to-TOML converter. Deferred to future work.
- **Windsurf** - Uses markdown but with a different structure (workflows with steps). Deferred to future work.

### Rationale

The three in-scope platforms (Claude, Copilot, Cursor) share a common markdown template format with simple transformations. Supporting Gemini or Windsurf would require significant additional complexity:

- Gemini: New template format (TOML) or conversion logic
- Windsurf: Restructuring templates to workflow format

These can be addressed in a future phase when the base integration pattern is established.

### IDE Integration Decision Log

- **Decision:** Scope to markdown-based platforms only (Claude, Copilot, Cursor)
  - Rationale: Shared template format enables simple transformations; non-markdown formats (Gemini TOML, Windsurf workflows) require additional complexity
  - Date: 2025-12-15
  - Owner: @flanakin
  - Status: Decided

## References

- [spec.md](./spec.md) - Feature specification with interface definitions
- [plan.md](./plan.md) - Implementation plan
- [tasks.md](./tasks.md) - Implementation tasks
