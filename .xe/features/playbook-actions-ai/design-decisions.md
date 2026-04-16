# Design Decisions: Playbook Actions - AI

## Retry logic location

**Decision**: Retry handling at the action level, not within individual providers

**Date**: <!-- TODO: determine from git history -->

**Why**: Ensures consistent retry behavior regardless of provider; keeps providers focused on single-execution responsibility

## Structured output handling

**Decision**: Pass JSON schema to providers that support native structured output (Claude, Gemini, OpenAI); fall back to prompt-based formatting for others; always validate the response against the schema before returning

**Date**: <!-- TODO: determine from git history -->

**Why**: Native structured output is more reliable and performant than prompt instructions; validation catches malformed responses before they propagate

## Timeout mechanism

**Decision**: AbortController at the action level with a default 120-second timeout

**Date**: <!-- TODO: determine from git history -->

**Why**: Standard mechanism that works uniformly across SDK-based and CLI-based providers; Claude Agent SDK has no native timeout support
