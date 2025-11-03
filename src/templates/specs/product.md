# {project-name} Product Context

> [INSTRUCTIONS]
> This document establishes the high-level product context for {project-name}. Fill out each section based on the project's purpose, goals, and target users. Keep descriptions concise yet comprehensive—focus on what matters most for guiding AI-assisted development. Use enterprise-grade language, emphasizing scalability, reliability, and user value. Remove all instruction blocks after completion.

## System Overview

> [INSTRUCTIONS]
> Provide a 2-3 sentence overview of what {project-name} does, its core value proposition, and primary user benefits. Include the main workflow phases if applicable.

## Product Strategy

> [INSTRUCTIONS]
> Document the phased implementation priorities from the init issue. This guides feature development sequencing and trade-off decisions. Replace with the prioritized list from the init issue's Product Strategy section.

1. Prove the concept works (POC)
2. Perfect the user experience (Mainstream)
3. Deliver breakthrough capability (Innovation)
4. Build extensible foundation (Platform)
5. Enterprise readiness (Enterprise)
6. Scale to broader markets (Scale)

## Design principles

> [INSTRUCTIONS]
> List of high-level, non-negotiable values that should guide implementation decisions, prompt construction, and architectural choices that apply to the entire product. Do not add feature-specific design principles here. Each principle should have a short name and a detailed description to help convey the point and how to implement the principle. Design principles must follow the following guidelines:
>
> - Begin with a short, imperative phrase that reflects a clear design priority (e.g., “Lead with autonomy”, “Favor reversibility”, “Default to traceability”)
> - Principles should be memorable and directive
> - Use declarative statements, not suggestions or instructions (e.g., “Design for graceful degradation” instead of “Handle errors gracefully”)
> - Reflect a value or tradeoff that guides design decisions (e.g., “Favor clarity over brevity” implies a prioritization)
> - Ensure principles are enduring, not tied to specific tech or implementation (e.g., “Fail loud when assumptions are violated” applies across platforms)
> - Avoid generic or vague phrases like “Be user-friendly” or “Use best practices”. (These lack specificity and don’t guide actual decisions.)
> - Prefer imperative phrasing that starts with a verb or strong tone (e.g., “Design for trust over automation speed” or “Default to explicit behavior”)
> - Express a tradeoff or constraint that guides implementation decisions (e.g., autonomy vs. oversight, speed vs. safety)
> - Include a brief rationale (1–2 sentences) that clarifies scope, boundaries, and intended behavior
> - Prioritize principles that are actionable, opinionated, and enduring across use cases
> - Optionally include a short rationale (1–2 sentences) after each principle to clarify when the principle applies, what it enables, and what it constraints without diluting the principle itself
>
> All generated assets (e.g., code, documentation) should reflect these design principles in structure, tone, and behavior.
>
> Design principles are constraints that streamline decision-making. If a philosophical debate surfaces, review and update design principles to solidify foundational, goal-oriented, implementation-free agreements that decisions can be based on. Design principles must be maintained over time. They are optional, but encouraged for multi-person teams and highly recommended for large teams.

## Technical Requirements

> [INSTRUCTIONS]
> List key technical capabilities required, such as platforms, integrations, or performance targets. Prioritize enterprise standards like security, scalability, and compliance. Keep to 5-10 high-level bullet points.

## Success Metrics

> [INSTRUCTIONS]
> Define 3-5 measurable outcomes that indicate success, such as user adoption rates, performance benchmarks, or quality thresholds. Make them specific and quantifiable.

## Non-Goals

> [INSTRUCTIONS]
> Clearly state what {project-name} will NOT do, to prevent scope creep. Include 2-3 items, focusing on boundaries like legal disclaimers or out-of-scope features.

## Team

> [INSTRUCTIONS]
> List key roles and responsibilities. Include product, engineering, and AI reviewer roles with names/handles. Default to standard enterprise roles unless specified.

**Roles:**

- **Product Manager**: {product-manager}
- **Architect**: {architect}
- **Engineer**: {engineer}

**AI Reviewers:**

- {ai-reviewer}
