---
owner: "Product Manager"
reviewers:
  required: ["Architect"]
  optional: ["Engineer"]
---

# Playbook: Explore Feature

**Goal**: Researches feature ideas, architectural changes, or bug fixes with a grounded, spec-driven workflow without modifying specs or code

**Phases**: Discovery → Scope → Investigation → Review → Document

**AskUserQuestion (AUQ) tool usage rules**: See @node_modules/@xerilium/catalyst/standards/auq.md

## Inputs

Parse user's input to identify optional parameters:

- **issue**: GitHub issue number
- **feature-id**: Kebab-cased ID of the feature(s) to update or refactor; must exist; maps to `.xe/features/{feature-id}/spec.md`
- **context-files**: Referenced files (proposals, notes, transcripts, etc) read for additional context

## Artifacts

- Research findings and recommendations
- Conditional: Saved findings (GitHub issue, rollout file, or feature feedback)

## Phases

### Phase 0: Scope

Gather context and define investigation scope.

#### Step 1: Gather Context

1. Read any inline description
2. For existing features, read `.xe/features/{feature-id}/spec.md`
3. If GitHub issue referenced, read with `gh issue view {issue-number}`
4. Read any referenced content/files (proposals, notes, transcripts)
5. If exploring or comparing to current roadmap, read blueprint (if it exists):
   - `.xe/features/blueprint/spec.md` — Original requirements
   - `.xe/features/blueprint/plan.md` — Phased feature implementation approach
   - `.xe/features/blueprint/tasks.md` — Phased implementation steps
6. IF and ONLY if needed:
   - Read data structures: `.xe/features/{feature-id}/data-model.md` (may not exist)
   - Read product vision: `.xe/product.md`
   - Scan related features: `.xe/features/`
   - Use **AskUserQuestion** if critical context is missing (1-4 targeted questions only)

#### Step 2: Define Investigation Scope

**Clarify the problem before exploring solutions:**

1. What specific challenge or opportunity are we investigating?
2. What constraints or context matter most?
3. What success looks like for this exploration

**Establish investigation parameters:**

- What areas of the codebase/architecture to analyze?
- What alternatives to compare?
- What questions to answer?
- What depth of analysis is appropriate?

**Agent persona**: Highly technical, visionary product leader. Be inquisitive but not annoying. Ask leading questions that extract insights. Challenge conventional thinking. Demand hard data to validate assumptions.

**Bias for action**: Do NOT ask user to decide between options before research. Research the problem space thoroughly, analyze and weight pros/cons of viable options, then present the best set of balanced options with a clear recommendation that maximizes value while minimizing resource strain.

Use **AskUserQuestion** to confirm investigation scope (what to analyze, what questions to answer).

**STOP HERE**: Do NOT proceed to Phase 1 until investigation scope is clearly defined

### Phase 1: Investigation

Freeform investigation: Read code, analyze patterns, compare approaches, assess trade-offs. Document findings for presentation in Phase 2.

Helpful context:

- `.xe/engineering.md` – principles, standards, process
- `.xe/architecture.md` – tech stack, repo structure, patterns

Analyze code and patterns, compare alternative approaches, assess trade-offs and implications. Document key findings organized by theme.

**STOP HERE**: Do NOT proceed to Phase 2 until findings are documented

### Phase 2: Review

#### Step 1: Present findings

Output formatted summary. Start with an HR and markdown H2 header so the review stands out:

`---`
`## Investigation: {topic}`

{What prompted this exploration — 1-2 sentences, plain text}

Then present detailed sections — **omit any section that has nothing to report**:

- **Findings**: Key discoveries, organized by theme
- **Analysis**: Pros/cons of viable approaches, weighted by value vs cost
- **Recommendation**: Clear recommendation with rationale — which approach brings greatest benefit with least resource strain
- **References**: Links to relevant specs, code, or external resources

After the detailed sections, output an HR followed by an abbreviated recap (always include all items, even when N/A — detailed sections above do NOT include empty items):

`---`

- **Findings**: {terse one-line}
- **Recommendation**: {terse one-line}

End with an HR and the done prompt on its own line:

`---`
`Let me know if you have questions, or say **done** to wrap up.`

**Progressive approval**: When findings involve multiple independent recommendations or decisions (e.g., "what to do with items A, B, and C"), present each as a question using AUQ for progressive approval. Don't batch all decisions in one question.

#### Step 2: Conversational review

User may ask follow-up questions, challenge findings, or request deeper analysis. Answer them fully.

End every response with: `"Anything else, or **done** to wrap up?"`

#### Step 3: Route findings

When user confirms done, use **AskUserQuestion**: "What would you like to do with these findings?"

- **Fix now** — Implement the findings via `/catalyst:create` for new features or `/catalyst:change` for existing features; RECOMMEND for quick fixes
- **Save to file** — For future feature work, one of 2 options depending on complexity:
  - `.xe/features/{feature-id}/feedback.md` — ONLY for simple feedback items (condensed to 1 bullet with optional subbullets for details), 1-3 separate feedback items, NO MORE; RECOMMEND for 1-3 simple changes
  - `.xe/rollouts/explore-{topic}.md` — ONLY for later execution in a new run – ONLY if 4+ separate or more complex feedback items requiring a lot of notes; RECOMMEND for medium complexity changes
- **Save to GitHub issue** — Complex, wide-reaching impact; RECOMMEND for large complexity
- **Skip** — Don't save findings

Execute the chosen action before exiting Phase 2.

## Success criteria

- [ ] Investigation scope clearly defined in Phase 1
- [ ] Findings presented with clear analysis and recommendations
- [ ] No specs or code modified during exploration
- [ ] User has option to save findings for future action
