# AskUserQuestion (AUQ) Tool Usage Standard

## Format

- Header: max 1-3 words
- Question text: max 100 words
- Option labels: max 20 words
- Option descriptions: max 100 words
- Plain text ONLY, NO markdown formatting
- Minimum 2 options per question (tool constraint); for single-action confirmations, add a review/reconsider alternative

## Guidelines

- Do NOT use AUQ when:
  - Analysis confirms the user's suggestion — just act
  - The decision is low-risk and easily reversible — just pick and move on
  - The question requires back-and-forth discussion — use review pattern instead (write context, end with "Anything else or **done** to continue")
- Each question MUST address exactly one decision
- ALWAYS mark the most appropriate option: "(Recommended)" when confident, "(Suggested)" when under-informed
- Research, gather evidence, present an informed recommendation — don't ask humans uninformed, context-less questions
- Ground recommendations in product vision (`.xe/product.md`) and engineering principles (`.xe/engineering.md`)
- When under-informed, present best-effort suggestion and offer an option to research further for a higher-confidence recommendation
- ALL context needed to answer MUST live in the AUQ (question + options). The user sees ONLY the AUQ dialog when it is open — console output, prior messages, and labels defined outside are invisible. Test: a teammate dropped into the AUQ with no prior session context can name the decision and pick informedly from the dialog alone.
- Each option description MUST name what makes it different from the others (cost, risk, scope, effort) — enough to compare without external lookup
- Group batches on two composing axes — applies to ANY batch decision (spec FRs, feedback triage, rollout tasks, PR findings, etc.), not just PRs:
  - **Semantic first**: group related items by their natural grouping (type, concern, subsystem, root issue) so each option is one coherent decision.
  - **Comprehension budget second**: within each semantic group, obvious items (typos, lint, dead code, whitespace) need no per-item explanation — collapse them into one terse group; items needing explanation get enough context to compare, sized so each group fits the 100-word option cap. If a group can't be described adequately under the cap, split it along a natural seam until each part fits — keep the pieces coherent.
  - NEVER cram every item's full context into one option to keep a batch whole (a wall of text fails the cold-reader test as badly as cryptic shorthand), and NEVER scatter a coherent group into isolated single-item questions just to be safe (a flood of prompts fails the reader too).
- Group independent questions into a single AUQ call to minimize prompts
- ALL actionable questions to the user MUST use AUQ — never ask decisions as plain text
- Skip "Adjust"/"Edit"/"Modify"/"Change scope"-style options that need free-form input to be meaningful — the built-in "Other" provides a textbox for any selected option. For single-action confirmations, use "Other" as the second option rather than inventing a labeled escape hatch.

## Examples

Bad — context lives in console only: writes the analysis to console, then asks *"Approve direction?"* in the AUQ. The user opening the dialog sees only the question; the analysis is invisible.

Bad — references console: *"Approve groups A+B+C as described above?"* (user can't see "above" — AUQ dialog is all they see)

Bad — too vague: *"5 findings identified. Route to feedback file, implement, or skip?"* (what findings?)

Bad — too verbose: *"Add to step 3: 'Question must state the issue and proposed fix each in one sentence. Do not list multiple findings or use vague summaries.' This prevents the AUQ failures that happened this session where..."* (over 100 words)

Bad — cryptic batch shorthand: option labelled *"Apply all 5 (Recommended)"* with description *"S1: Refuse `-SkipBuild` for prod. S2: Refuse dirty tree + Read-Host commit confirmation for prod. S3: Add og:image:alt + twitter:image:alt to index.html. S4: Add Vitest case. S5: Pin `@azure/static-web-apps-cli@2.0.9`."* — reader cannot tell which reviewer flagged each item, what the actual problem is, what the change does in plain language, what the reviewer specifically asked for, or why "Apply all" is recommended.

Bad — one option carries every item's full context: an "Apply all 5" description that spells out reviewer + problem + ask + change + rationale for all five findings runs 150+ words and busts the 100-word option cap. A wall of text is as unusable as cryptic shorthand — the reader can't scan it inside the dialog.

Good — group by comprehension cost, not just tier. Obvious items (typos, lint, dead code, whitespace) need no per-item explanation and collapse into one terse group. Items that need explanation get grouped so each group's context fits under 100 words; if it doesn't, split the group logically. Example, one question with two grouped options: *"Apply all 3 mechanical fixes (Recommended) — @alice: typo in README, unused import in api.ts, dead branch in auth.ts. Obvious, low-risk, no behavior change."* and a separate option *"Apply the prod-guard fix — @bob on deploy.ps1:42: prod path accepts `-SkipBuild` and can ship stale assets; reject the flag for prod targets. Matches the existing prod-guard convention."* — mechanical items ride together with no explanation; the judgment item stands alone with problem + change + rationale, each option well under the cap.

Good — push-back as last resort (complex tier): when the AI disagrees with a reviewer, prefer options that resolve the underlying concern via other means before posting a true push-back. Example option set for *"@carol asked us to revert FR:X to the old grouped layout — she finds the new flat layout harder to scan in the file tree"*: (1) *"Capture this as a design-decision and keep the new layout (Recommended) — flat layout was approved in spec for downstream tooling; recording the rationale closes the loop without churn. Gain: spec stability. Give up: revisiting if more reviewers raise the same concern."* (2) *"Add an index file that groups by category at the top — addresses scannability without reverting the layout. Gain: both audiences served. Give up: maintaining the index."* (3) *"Push back firmly — revert is incompatible with FR:Y. Gain: spec integrity. Give up: a green PR until @carol responds; risk of an open thread blocking merge."* Only option 3 is true push-back; options 1 and 2 address @carol's concern through alternative means.

Good: *"Spec has 2 scenarios (FR:playbook, FR:inject) with 12 FRs total. Approve and move to planning?"*

## Patterns

### Progressive Approval

- **What**: Approve a large body of content in logical groups, with an option to review items individually
- **When**: Reviewing proposed changes, feedback responses, or any batch of related decisions
- **How**: Present each group's context as a message, then ask a focused AUQ to approve or drill in
