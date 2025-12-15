---
id: playbook-actions-ai
title: "Research: Playbook Actions - AI"
description: "Research notes on AI action behavior, retry logic, and output handling"
date: 2025-12-08
---

<!-- markdownlint-disable MD025 -->

# Research: Playbook Actions - AI

## Summary

This research documents the action-level concerns for the AI prompt action in Catalyst playbooks. For provider-specific SDK research, interface design, and factory patterns, see [ai-provider/research.md](../ai-provider/research.md).

## Scope

**In scope:**

- AI action execution flow
- Retry logic and error handling at action level
- Output format handling and validation
- Timeout management via AbortController
- Context assembly for prompts

**Out of scope (see ai-provider research):**

- SDK-specific API details
- Provider interface design
- Factory pattern implementation
- Provider availability and authentication

## Action Execution Flow

The AI prompt action follows this execution pattern:

1. **Context Assembly**: Gather role, context sources, and return instructions
2. **Provider Selection**: Use factory to get appropriate provider
3. **Request Construction**: Build AIProviderRequest from action config
4. **Execution**: Call provider.execute() with timeout handling
5. **Response Processing**: Validate and transform output
6. **State Update**: Store result in execution context

```typescript
// Simplified execution flow
async execute(config: AIPromptConfig, context: ExecutionContext): Promise<ActionResult> {
  // 1. Assemble prompt from role, context, and return instructions
  const systemPrompt = this.buildSystemPrompt(config.role, config.context);
  const prompt = this.buildUserPrompt(config.prompt, config.return);

  // 2. Get provider
  const provider = createAIProvider(config.provider || 'claude');

  // 3. Build request
  const request: AIProviderRequest = {
    systemPrompt,
    prompt,
    model: config.model,
    maxTokens: config.maxTokens,
    inactivityTimeout: config.timeout || 120000,
    abortSignal: context.abortSignal
  };

  // 4. Execute with timeout
  const response = await provider.execute(request);

  // 5. Process and validate output
  const result = this.processOutput(response, config.return);

  // 6. Return result
  return { output: result, usage: response.usage };
}
```

## Retry Logic

Retry handling is implemented at the action level for consistency across all providers.

### Retry Strategy

```typescript
interface RetryConfig {
  maxRetries: number;      // Default: 3
  initialDelay: number;    // Default: 1000ms
  maxDelay: number;        // Default: 30000ms
  backoffMultiplier: number; // Default: 2
  retryableErrors: string[]; // Error codes to retry
}

const DEFAULT_RETRYABLE_ERRORS = [
  'AIRateLimited',
  'AIPromptTimeout',
  'ECONNRESET',
  'ETIMEDOUT'
];
```

### Non-Retryable Errors

These errors should fail immediately without retry:

- `AIProviderUnavailable` - Provider not configured/authenticated
- `AIProviderNotFound` - Unknown provider name
- `AIOutputInvalid` - Response doesn't match expected format
- User cancellation via AbortSignal

## Output Format Handling

### JSON Schema Validation

When `return.format` specifies a JSON schema, the action:

1. Passes schema to providers that support native structured output (Claude, Gemini)
2. Falls back to prompt-based formatting for other providers
3. Validates response against schema before returning

```typescript
// Output processing with schema validation
processOutput(response: AIProviderResponse, returnConfig: ReturnConfig): unknown {
  if (!returnConfig?.format) {
    return response.content;
  }

  // Parse JSON if format is json_schema
  if (returnConfig.format.type === 'json_schema') {
    const parsed = JSON.parse(response.content);
    this.validateAgainstSchema(parsed, returnConfig.format.schema);
    return parsed;
  }

  return response.content;
}
```

### Structured Output Support by Provider

| Provider | Native JSON Schema | Fallback Method |
|----------|-------------------|-----------------|
| Claude | Yes (outputFormat) | Prompt instruction |
| Gemini | Yes (responseSchema) | Prompt instruction |
| OpenAI | Yes (response_format) | Prompt instruction |
| Ollama | No | Prompt instruction |
| Copilot | No | Prompt instruction |
| Cursor | No | Prompt instruction |

## Timeout Management

Timeout is handled at the action level using AbortController:

```typescript
async executeWithTimeout(
  provider: AIProvider,
  request: AIProviderRequest,
  timeoutMs: number
): Promise<AIProviderResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await provider.execute({
      ...request,
      abortSignal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Timeout Considerations

- Default timeout: 120 seconds (2 minutes)
- Providers should monitor `inactivityTimeout` for long-running requests
- CLI-based providers (Copilot, Cursor) need process-level timeout handling

## Open Questions

- Q001: Should retry configuration be exposed in playbook YAML?
  - **Recommendation:** Yes, allow per-action retry config with sensible defaults
  - Owner: @flanakin
  - Status: Open

## Decision Log

- **Decision:** Handle retry logic at action level, not provider level
  - Rationale: Consistent retry behavior across all providers; providers focus on single execution
  - Date: 2025-12-08
  - Owner: @flanakin

- **Decision:** Pass JSON schema to providers that support native structured output
  - Rationale: Better reliability and performance than prompt-based formatting
  - Date: 2025-12-08
  - Owner: @flanakin

- **Decision:** Use AbortController for timeout handling
  - Rationale: Standard mechanism; works with both SDK and CLI providers
  - Date: 2025-12-08
  - Owner: @flanakin

## References

- [spec.md](./spec.md) - Feature specification
- [ai-provider/research.md](../ai-provider/research.md) - Provider SDK research, interface design, factory pattern
