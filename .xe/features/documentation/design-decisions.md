# Design Decisions: Documentation

## Documentation architecture

**Decision**: Hybrid approach — feature specs remain internal (`.xe/features/`), public docs are curated and aggregated in `docs/`

**Date**: <!-- TODO: determine from git history -->

**Why**: Provides clear audience separation (internal context vs. user-facing content), enables automation to generate reference docs from code, and avoids duplication while preserving authorial control over public narrative

**Rejected**: Feature-centric only (Option A) — risks exposing internal implementation details to users and makes unified narrative harder; centralized only (Option B) — high risk of docs diverging from code and greater manual maintenance burden

## Reference documentation generation

**Decision**: Auto-generate action reference and API reference from code (ACTION_REGISTRY + JSDoc/TSDoc); manually curate guides, tutorials, and conceptual overviews

**Date**: <!-- TODO: determine from git history -->

**Why**: DRY principle — generating from code eliminates duplication and ensures reference docs stay in sync; narrative content requires human judgment that automation cannot provide

## Action documentation location

**Decision**: Action implementations own optional supplemental docs (`.doc.md` files alongside the action source); the public reference is generated from ACTION_REGISTRY and JSDoc

**Date**: <!-- TODO: determine from git history -->

**Why**: Established precedent in architecture.md — aggregated public docs in a dedicated documentation feature avoid circular dependencies and provide a unified learning path

## Coverage enforcement

**Decision**: CI fails if required docs are missing; use `public: false` frontmatter as an explicit opt-out (not the default)

**Date**: <!-- TODO: determine from git history -->

**Why**: Opt-out must be deliberate and auditable; passive omission should not silently exclude features from public docs
