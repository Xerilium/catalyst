# Invoke Retrospective

Lightweight self-improvement step after a workflow completes.

## Process

1. Reflect on the run. Identify friction points or inefficiencies across these dimensions:
   - **User friction**: Repeated instructions, corrections, frustration, push-back
   - **Instruction adherence**: Steps skipped, reordered, or misinterpreted
   - **Phase effectiveness**: Unnecessary phases, disproportionate effort, low-value output
   - **Token efficiency**: Redundant reads, over-verbose output, unnecessary ceremony
   - **AUQ quality**: Prompts not concise, actionable, or well-formed per standard
   - **Artifact quality**: Missing, incomplete, or incorrect outputs
2. Pick the problem-fix pair with the clearest payoff – skip problems without concrete fixes; vague guidance ("add a reminder", "be more careful") is not a fix
3. Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to present proposed improvement (name the file to change, what to change, and what friction it prevents). Options:
   - **Fix now**: Fix the playbook/standard file immediately via `/catalyst:change`
   - **Save to feature feedback file**
   - **File an issue**: Create a GitHub issue to track the improvement
   - **Skip**: No action needed
4. Execute chosen action
   - Fix now: Use `/catalyst:change` skill with the feature ID, file name, and detailed change request (do not edit files directly)
   - Feedback files: Execute `node_modules/@xerilium/catalyst/playbooks/actions/feedback-write.md`
   - GitHub issues: Create via `gh`

## Exit Criteria

- [ ] Most impactful improvement identified (or noted as none)
- [ ] Recommendation presented and routed per user choice (or skipped)
