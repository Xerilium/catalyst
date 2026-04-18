# Feedback for feature-context

## Spec generation

- When speccing lightweight artifacts (trackers, logs, simple conventions), calibrate spec detail to the artifact's complexity. Don't pattern-match to high-ceremony templates like design-decisions.md. If the user signals "don't over-define this," drop format-level FRs and let the template carry the convention.
  - Caused 2 correction rounds during feedback.md formalization — initial spec prescribed heading format + H2/bullet structure as separate FRs when a single template would have sufficed.
- Explore: Does having the data model file be sometimes missing force extra tokens checking for something that may not exist and explaining why it's not there? Would it be more efficient to always have it, even if it just says "None"?

## Validation

- Add a file validation/health check to run against context files (spec.md, data-model.md) to measure quality and use as a gate in feature-workflow before moving between phases
  - Check for common issues: leftover `> [INSTRUCTIONS]` blocks, unfilled `{placeholder}` tokens, missing required sections, frontmatter mismatches
  - Missing `@req` annotations (warn/fail based on config)
  - Warn: Previous state references (look for existing bad examples to use)
  - Determine whether checks should be AI-evaluated (checklist in playbook actions) or automated (TypeScript like traceability) - or both?
