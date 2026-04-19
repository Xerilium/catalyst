# Feedback for feature-context

## Spec generation

- When speccing lightweight artifacts (trackers, logs, simple conventions), calibrate spec detail to the artifact's complexity. Don't pattern-match to high-ceremony templates like design-decisions.md. If the user signals "don't over-define this," drop format-level FRs and let the template carry the convention.
  - Caused 2 correction rounds during feedback.md formalization — initial spec prescribed heading format + H2/bullet structure as separate FRs when a single template would have sufficed.
- Explore: Does having the data model file be sometimes missing force extra tokens checking for something that may not exist and explaining why it's not there? Would it be more efficient to always have it, even if it just says "None"?

## Build hooks

- Need a hooks-based pattern for features to contribute build-time scripts without `scripts/build.ts` knowing about them. Today the build script hardcodes each generation step (registry, schema, etc.). Adding feature-context's README generation script would require modifying build.ts, creating a hard build dependency on feature-context.
  - **Why:** Allows features to drop scripts in a known location (e.g., `scripts/post-build/`) and have them auto-discovered. Avoids feature-to-build coupling. Scales as more features need build-time output.
  - **How to apply:** Build script globs a hooks directory (alphabetical order) and executes each. Each script declares its purpose in a header comment. Failure handling per script.
  - **Consider YAML playbooks instead of TypeScript scripts:** Since we have a playbook engine, build hooks could be playbooks rather than TypeScript files. This would dogfood the playbook system, validate that it can handle build-time automation, and provide consistent execution semantics. Decide based on playbook-engine evaluation (see playbook-engine/feedback.md § Automation as playbooks).
  - **Defer until needed:** Not blocking current work. Becomes relevant when feature-context adds README generation. May belong in a future build feature rather than feature-context.

## Validation

- Add a file validation/health check to run against context files (spec.md, data-model.md) to measure quality and use as a gate in feature-workflow before moving between phases
  - Check for common issues: leftover `> [INSTRUCTIONS]` blocks, unfilled `{placeholder}` tokens, missing required sections, frontmatter mismatches
  - Missing `@req` annotations (warn/fail based on config)
  - Warn: Previous state references (look for existing bad examples to use)
  - Determine whether checks should be AI-evaluated (checklist in playbook actions) or automated (TypeScript like traceability) - or both?
