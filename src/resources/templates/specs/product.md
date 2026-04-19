# Product Vision

> [INSTRUCTIONS]
> Define the product vision and strategic direction. Keep concise — focus on what AI needs to guide implementation decisions.

## Purpose

> [INSTRUCTIONS]
> 2-3 sentences describing what the product does, its core value proposition, and primary user benefits. Include any product-level scope boundaries as prose when they clarify intent (e.g., "not a replacement for X"). This section replaces the former System Overview and Non-Goals sections.

## Product Strategy

> [INSTRUCTIONS]
> List strategic priorities that guide feature sequencing and trade-off decisions.

1. Prove the concept works (POC)
2. Perfect the user experience (Mainstream)
3. Deliver breakthrough capability (Innovation)
4. Build extensible foundation (Platform)
5. Enterprise readiness (Enterprise)
6. Scale to broader markets (Scale)

## Design Principles

> [INSTRUCTIONS]
> 3-5 non-negotiable values guiding implementation decisions. Each principle must:
> - Be memorable and directive (declarative statements)
> - Reflect clear value/tradeoff that guides decisions
> - Be actionable and opinionated across use cases
> - Avoid generic phrases that don't guide decisions
>
> Format: **Directive statement**
> Rationale: 1-3 sentences clarifying when it applies, what it enables/constrains.
>
> Examples:
> - **Transparent: Work in the open** - Think and act in the open. All work is traceable by default, reversible by design. Every decision must be auditable.
> - **Accountable: Enforce strategic coherence** - Proactively seek oversight at checkpoints. Never hide logic or bypass control.

## Personas

> [INSTRUCTIONS]
> Define the recognized actors for this product — both user personas and
> system components. Feature specs MUST use only these personas in
> scenarios. If a new persona is needed, add it here first.
>
> Format: **{persona-name}**: 1 sentence describing who they are and
> what they need from the product.

## Scenarios

> [INSTRUCTIONS]
> List product-level capabilities as actor-needs scenarios that feature specs elaborate into testable requirements. Each scenario is lightweight: an FR ID, an actor-needs statement, and an optional 1-sentence value clarification. Do NOT nest MUST/SHOULD sub-requirements and do NOT assign priorities at this level. Detailed requirements belong in `.xe/features/{feature-id}/spec.md`.
>
> Actors MUST be recognized personas from the Personas section above.
>
> Format:
> `### FR:{scenario-id}: {scenario-name}`
> `{actor} needs to {action} so that {value}.`
> Optional: 1 sentence of additional clarification.

### FR:{scenario-id}: {scenario-name}

{actor} needs to {action} so that {value}.

## Customer Journey

> [INSTRUCTIONS]
> Link to `.xe/customer-journey.md` for product-level workflows showing actor interactions and checkpoints.

See [customer-journey.md](customer-journey.md) for the product-level workflows showing actor interactions and checkpoints.

## Team

**Roles:**

- **Product Manager**: {product-manager}
- **Architect**: {architect}
- **Engineer**: {engineer}

**AI Reviewers** (remove platforms not used):

- Claude Code
- GitHub Copilot
