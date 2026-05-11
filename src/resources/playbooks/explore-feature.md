---
owner: "Product Manager"
reviewers:
  required: ["Architect"]
  optional: ["Engineer"]
---

# Playbook: Explore Feature

**Goal**: Researches feature ideas, architectural changes, or bug fixes with a grounded, spec-driven workflow without modifying specs or code

**Phases**: Discovery → Scope → Investigation → Review → Document

## Inputs

Parse user's input to identify optional parameters:

- **issue**: GitHub issue number
- **feature-id**: Kebab-cased ID of the feature(s) to update or refactor; must exist; maps to `.xe/features/{feature-id}/spec.md`
- **context-files**: Referenced files (proposals, notes, transcripts, etc) read for additional context

## Artifacts

- Research findings and recommendations
- Conditional: Saved findings (GitHub issue, rollout file, or feature feedback)

## Phases

**Note on Active State**: Exploration runs may not have a rollout plan to maintain. If a rollout file exists for this work (e.g., saved to `.xe/rollouts/explore-{topic}.md` in Phase 2), execute `workflow-state.md` at each STOP gate below as directed. Skip otherwise.

### Phase 0: Scope

Gather context and define investigation scope.

#### Step 1: Gather Context

1. Read any inline description
2. For existing features, read `.xe/features/{feature-id}/spec.md`
3. If GitHub issue referenced, read with `gh issue view {issue-number}`
4. Read any referenced content/files (proposals, notes, transcripts)
5. If exploring or comparing to current roadmap, read `.xe/features/blueprint.md` if it exists
6. IF and ONLY if needed:
   - Read product vision: `.xe/product.md`
   - Scan related features: `.xe/features/`
   - If critical context is missing, Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to gather 1-4 targeted clarifying questions

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

Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to confirm investigation scope (what to analyze, what questions to answer)

⏸️ **STOP HERE**: Do NOT proceed to Phase 1 until investigation scope is clearly defined

- If rollout file exists: Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-state.md — DO NOT SKIP

### Phase 1: Investigation

Research the problem space thoroughly before presenting options. Analyze code and patterns, compare alternatives, assess trade-offs. Challenge assumptions — don't accept the first viable approach. Form and defend a recommendation grounded in evidence, not deference.

Helpful context:

- `.xe/engineering.md` – principles, standards, process
- `.xe/architecture.md` – tech stack, repo structure, patterns

**Course correction**: When findings challenge initial assumptions or reveal the investigation heading in a potentially wrong direction, surface it before continuing. For decisions ("should I evaluate A or B?"), execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to course-correct. For context checks ("I'm seeing X — does that match your understanding?"), use console output. Skip when findings confirm expectations or the answer is determinable from available context.

⏸️ **STOP HERE**: Do NOT proceed to Phase 2 until findings are documented

- If rollout file exists: Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-state.md — DO NOT SKIP

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

#### Step 2: Conversational review

User may ask follow-up questions, challenge findings, or request deeper analysis. Answer them fully.

End every response with: `"Anything else, or **done** to wrap up?"`

#### Step 3: Route findings

When user confirms done, execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to route findings (fix now / save to file / save to GitHub issue / skip)

**When routing to a durable artifact**: reuse step 2.1 output verbatim. Add "Next step" if relevant. Drop chat-only ceremony (abbreviated recap, "done to wrap up").

- **Fix now** — Implement the findings via `/catalyst:create` for new features or `/catalyst:change` for existing features; RECOMMEND for quick fixes
- **Save to file** — For future feature work, choose on complexity:
  - 1-3 simple items → RECOMMEND feature feedback: Execute `node_modules/@xerilium/catalyst/playbooks/actions/feedback-write.md`
  - 4+ separate or complex/detailed items → RECOMMEND explore file: Document in `.xe/rollouts/explore-{topic}.md`
- **Save to GitHub issue** — Complex, wide-reaching impact; RECOMMEND for large complexity
- **Skip** — Don't save findings

Execute the chosen action before exiting Phase 2.

#### Step 4: Celebrate

Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-celebrate.md

## Success criteria

- [ ] Investigation scope clearly defined in Phase 1
- [ ] Findings presented with clear analysis and recommendations
- [ ] No specs or code modified during exploration
- [ ] User has option to save findings for future action
- [ ] Celebration message output
