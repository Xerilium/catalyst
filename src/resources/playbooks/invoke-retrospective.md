# Invoke Retrospective

Lightweight self-improvement step after a workflow completes.

‼️ MUST follow **AskUserQuestion** patterns: @node_modules/@xerilium/catalyst/standards/auq.md

## Process

1. Reflect on the run. Identify friction points or inefficiencies across these dimensions:
   - **User friction**: Repeated instructions, corrections, frustration, push-back
   - **Instruction adherence**: Steps skipped, reordered, or misinterpreted
   - **Phase effectiveness**: Unnecessary phases, disproportionate effort, low-value output
   - **Token efficiency**: Redundant reads, over-verbose output, unnecessary ceremony
   - **AUQ quality**: Prompts not concise, actionable, or well-formed per standard
   - **Artifact quality**: Missing, incomplete, or incorrect outputs
2. Pick the problem-fix pair with the clearest payoff – skip problems without concrete fixes; vague guidance ("add a reminder", "be more careful") is not a fix
3. Present proposed improvement via **AskUserQuestion**: name the file to change, what to change, and what friction it prevents. Options:
   - **Fix now**: Fix the playbook/standard file immediately via `/catalyst:change`
   - **Save to feedback file**: Append to `.xe/features/{feature-id}/feedback.md`
   - **File an issue**: Create a GitHub issue to track the improvement
   - **Skip**: No action needed
4. Execute chosen action
   - Fix now: Use `/catalyst:change` skill with the feature ID, file name, and detailed change request (do not edit files directly)
   - Feedback files: If file doesn't exist, create from template `src/resources/templates/specs/feedback.md`. Add single bullet feedback with nested bullets as needed
   - GitHub issues: Create via `gh`

## Exit Criteria

- [ ] Most impactful improvement identified (or noted as none)
- [ ] Recommendation presented and routed per user choice (or skipped)
