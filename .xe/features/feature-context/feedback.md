# Feedback for feature-context

## Data model template

- Explore: Does having the data model file be sometimes missing force extra tokens checking for something that may not exist and explaining why it's not there? Would it be more efficient to always have it, even if it just says "None"?

## Context File Validation / Health Check

- Add a file validation/health check to run against context files (spec.md, plan.md, data-model.md) to measure quality and use as a gate in feature-workflow before moving between phases
  - Check for common issues: leftover `> [INSTRUCTIONS]` blocks, unfilled `{placeholder}` tokens, missing required sections, frontmatter mismatches
  - Missing `@req` annotations (warn/fail based on config)
  - Warn: Previous state references (look for existing bad examples to use)
  - Determine whether checks should be AI-evaluated (checklist in playbook actions) or automated (TypeScript like traceability) - or both?

## Product Landscape Documentation

Explore approaches for maintaining an at-a-glance product landscape view:

### Option A: Blueprint Updates

- Update `.xe/features/blueprint/` after major feature implementations
- Manual or AI-assisted
- Only for features that impact system design
- Keeps strategic roadmap view current

### Option B: Auto-Generated README

- Generate `.xe/features/README.md` as lightweight summary
- Lists all features with 1-sentence descriptions
- Can be regenerated on-demand
- Lower maintenance burden than blueprint

### Option C: Programmatic Manifest

- Create `manifest.json` for each feature:

  ```json
  {
    "id": "feature-id",
    "name": "Feature Name",
    "status": "implemented|planned|deprecated",
    "dependencies": ["other-feature-id"],
    "scenarios": ["scenario-1", "scenario-2"],
    "testCoverage": 95
  }
  ```

- Auto-generated from spec.md + test results
- Can be "compiled" into minimal token-efficient format
- Enables programmatic queries: "What features depend on X?", "What's test coverage?", "What's implemented vs planned?"
- Could drive dashboard/visualization
- May be over-engineered for current scale - revisit when `.xe/features/` > 50 features

### Recommendation

Start with Option B (README), add Option C (manifest) when feature count justifies the complexity.

## Session Feedback: External Dependencies Migration

Three adherence gaps observed during the `## Dependencies` → `## External Dependencies` migration:

- **Skipped Plan phase**: Jumped from scope approval straight to implementation without entering plan mode or writing the task breakdown in the plan doc first. Violates Phase 2 gate: "Do NOT proceed to Phase 3 until plan is approved."
- **Skipped commit/PR offer at closure**: `feature-complete.md` step 2 requires offering "Commit to current branch" / "Create pull request" / "Keep working" for non-autonomous-branch modes. This AUQ was omitted entirely.
- **Retro didn't offer to fix now**: The retrospective playbook's "Execute chosen action" step for playbook changes says to use `/catalyst:change` — but the AUQ options only offered to save feedback or file an issue, not to fix the playbook immediately.
- **Follow-up question wasn't AUQ**: After identifying the three gaps, asked "Would you like me to fix any of these now?" as plain text instead of using AUQ with multi-select options. All actionable questions to the user should use AUQ per the standard.
