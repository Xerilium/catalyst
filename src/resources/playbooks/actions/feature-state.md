# Write Active State

Update the `## Active State` section at the top of the rollout plan so a successor agent (post-compaction, new subagent, or human reviewer) can resume without re-deriving context.

‼️ DO NOT SKIP. This is a context-continuity ritual — if the rollout's Active State is stale, compaction-recovery fails silently.

## Inputs

- `rollout-id`: In-progress rollout ID; rollout file at `.xe/rollouts/rollout-{rollout-id}.md`

## Instructions

1. Open `.xe/rollouts/rollout-{rollout-id}.md` and locate the `## Active State` section (top of file, immediately after H1)
2. OVERWRITE the section in full — never append. Stale fields must be removed, not preserved for history. If a field has nothing to report, write `- None` under the heading rather than deleting the heading
3. Populate each of the 6 fields with current state. Keep each entry terse; one line is usually enough:

   - **Model**: the current mental model landed this session but not yet in any spec. Expensive to re-derive from scratch. Example: "Phase 0 owns resume routing; phases walk forward, no skip-forward table."
   - **Decisions**: load-bearing decisions made this session not yet recorded in `design-decisions.md`. Format: `{decision} — {rejected alternative}`. Example: "Chose overwrite semantics for Active State — rejected unified Notes because it conflates current-state with history."
   - **Open**: questions actively awaiting a user answer, or items flagged as unresolved. Example: "Waiting on user confirmation that 3-field briefing is sufficient."
   - **Next**: literal imperative for the next step. Tool call or user-facing action. Example: "Run `npm test -- orchestration.test.ts`; if green, present Phase 4 review."
   - **Pins**: file:line-range references for load-bearing code, with short anchor text. Example: `` `src/resources/playbooks/actions/feature-scope.md:33-57` — Step 1 item 9 resume-assessment ``
   - **Assumptions**: things treated as true this session without verifying. Example: "Tests in `tests/playbooks/features/orchestration.test.ts` cover all three orchestrators; no other test file needs updating."

4. Update the rollout's `last_updated` frontmatter field to today's date

## When to invoke

- At every orchestration playbook STOP gate (scope → spec → plan → implement → review boundaries)
- After any AUQ decision that changes scope, plan, or next action
- Before any long-running operation that could push context near compaction

## Exit Criteria

- [ ] `## Active State` section present at top of rollout (after H1, before Overview)
- [ ] All 6 fields populated with current state (Model, Decisions, Open, Next, Pins, Assumptions)
- [ ] No stale content from prior state left behind (overwrite, not append)
- [ ] `last_updated` frontmatter field reflects today's date
