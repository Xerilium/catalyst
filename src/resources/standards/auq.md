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
- Group independent questions into a single AUQ call to minimize prompts
- ALL actionable questions to the user MUST use AUQ — never ask decisions as plain text
- Skip "Adjust"/"Edit"/"Modify"/"Change scope"-style options that need free-form input to be meaningful — the built-in "Other" provides a textbox for any selected option. For single-action confirmations, use "Other" as the second option rather than inventing a labeled escape hatch.

## Examples

Bad — context lives in console only: writes the analysis to console, then asks *"Approve direction?"* in the AUQ. The user opening the dialog sees only the question; the analysis is invisible.

Bad — references console: *"Approve groups A+B+C as described above?"* (user can't see "above" — AUQ dialog is all they see)

Bad — too vague: *"5 findings identified. Route to feedback file, implement, or skip?"* (what findings?)

Bad — too verbose: *"Add to step 3: 'Question must state the issue and proposed fix each in one sentence. Do not list multiple findings or use vague summaries.' This prevents the AUQ failures that happened this session where..."* (over 100 words)

Good: *"Spec has 2 scenarios (FR:playbook, FR:inject) with 12 FRs total. Approve and move to planning?"*

## Patterns

### Progressive Approval

- **What**: Approve a large body of content in logical groups, with an option to review items individually
- **When**: Reviewing proposed changes, feedback responses, or any batch of related decisions
- **How**: Present each group's context as a message, then ask a focused AUQ to approve or drill in
