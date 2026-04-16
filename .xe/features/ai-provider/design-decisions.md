# Design Decisions: AI Provider

## Primary integration target

**Decision**: Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) via subscription model (Claude Code), not API key

**Date**: <!-- TODO: determine from git history -->

**Why**: Subscription model avoids API key management overhead and leverages the user's existing Claude Code subscription rather than requiring separate billing; aligns with Catalyst's existing Claude Code integration

**Rejected**: `@anthropic-ai/sdk` (API key model) — requires separate API key provisioning and billing, adding operational complexity for teams already using Claude Code

<!-- TODO: Validate this rationale — extracted from research.md where original reasoning was "per user specification" without explaining the underlying constraint -->

## GitHub Copilot and Cursor provider type

**Decision**: Implement as CLI-based providers (interactive-only, no headless capability)

**Date**: <!-- TODO: determine from git history -->

**Why**: Neither platform offers a public programmatic API; CLI access is the only available integration path

**Rejected**: Full headless implementation — no public SDK exists for either platform; Copilot Extensions are deprecated as of November 2025

## Provider instantiation pattern

**Decision**: Factory pattern (`createAIProvider(name)`) with a provider catalog

**Date**: <!-- TODO: determine from git history -->

**Why**: Configuration-driven; providers created on-demand; avoids global mutable state

## Timeout handling

**Decision**: AbortController at the action level, not within providers

**Date**: <!-- TODO: determine from git history -->

**Why**: Claude Agent SDK has no native timeout support; action-level handling provides consistency across all providers

## ai-config merge into ai-provider

**Decision**: Merge ai-config (slash command configuration) into ai-provider as an optional `commandConfig` property on each provider

**Date**: <!-- TODO: determine from git history -->

**Why**: Reduces onboarding friction — adding a new provider (e.g., Windsurf) currently requires changes in two separate locations; a single provider file is a single source of truth

**Rejected**: Keeping separate — the different lifecycles (install-time vs. runtime) argument was outweighed by the coupling already implicit in the shared `name` field

## IDE command integration scope

**Decision**: Support only markdown-based platforms in the initial rollout: Claude Code, GitHub Copilot, Cursor

**Date**: <!-- TODO: determine from git history -->

**Why**: All three share a common template format with simple per-platform transformations (separator, front matter, extension)

**Rejected**: Gemini CLI (TOML format) and Windsurf (workflow structure) — both require fundamentally different template formats, adding complexity better deferred to a future phase
