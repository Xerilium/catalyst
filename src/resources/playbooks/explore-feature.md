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
- Conditional: Saved findings (GitHub issue, session file, or feature feedback)

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

Present findings using this format:

```markdown
## Investigation: {topic}

### Context

{What prompted this exploration}

### Findings

{Key discoveries, organized by theme}

### Analysis

{Pros/cons of viable approaches, weighted by value vs cost}

### Recommendation

{Clear recommendation with rationale - which approach brings greatest benefit with least resource strain}

### References

{Links to relevant specs, code, or external resources}
```

**AskUserQuestion**: "How would you like to save these findings?"

- **Save to GitHub issue** — Cross-team visibility (Recommended)
- **Save to `.xe/sessions/explore-{topic}.md`** — For later execution in a clean session
- **Save to `.xe/features/{feature-id}/feedback.md`** — For future feature work (condensed to 1 bullet with optional subbullets for details)
- **Don't save** — Conversation history only

## Success criteria

- [ ] Investigation scope clearly defined in Phase 1
- [ ] Findings presented with clear analysis and recommendations
- [ ] No specs or code modified during exploration
- [ ] User has option to save findings for future action
