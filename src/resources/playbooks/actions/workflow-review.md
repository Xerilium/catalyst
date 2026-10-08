# Present Workflow Review

Present completed work as a formatted console summary, then loop on user input until "done". Spec-change recovery is the calling playbook's responsibility.

‼️ Write for **Plain Language**: like a human explaining it to a teammate

## Inputs

- `rollout-id`: In-progress rollout ID; rollout file at `.xe/rollouts/rollout-{rollout-id}.md`
- `execution-mode`: `interactive`, `checkpoint-review`, `spec-review`, `final-review`, or `autonomous`

## Instructions

### 1. Present work

Write the summary to console below. Use `path:line` format for file references. Omit any body section with nothing to report (the recap always includes every section).

```markdown
---

## Review: {rollout-id}

{original request or issue that prompted the work, 1-2 sentences}

- **Completed**: {features implemented, test results, traceability coverage}
- **Remaining**: {deferred tasks, known gaps}
- **Findings**: {issues discovered during implementation, recommendations, limitations}
- **Blockers**: {open questions or unresolved issues, or "none"}
- **Files**: {key changed files in path:line format, or "none"}
- **Next**: {immediate next step after closure, or "none"}
- **Cleanup**: {rollout plan, temp files to delete}
- **External issues**: {bugs in other features, missing capabilities, spec gaps}
```

### 2. Recap

After the body, write the abbreviated recap. Include every section, using "None" for empty:

```markdown
---

- **Completed**: {terse one-line}
- **Remaining**: {terse one-line}
- **Findings**: {terse one-line}
- **Blockers**: {terse one-line}
- **Next**: {terse one-line}
- **Cleanup**: {count} file(s) pending

---

Anything else, or **done** to wrap up?
```

### 3. Loop until done (non-`autonomous` only)

If `autonomous`, skip this step — proceed directly to closure.

⏸️ **STOP HERE**: Do NOT proceed until the user signals done. "done" AND finalize-intent ("commit", "ship it", "lgtm", "looks good") both mean done → proceed to closure, which owns the commit. Never run a bare `git commit` here and re-prompt.

Handle non-done responses by complexity, then re-prompt and STOP again:

- **Simple tweaks / new tasks**: Execute, mark the task `[x]` in the rollout
- **Spec changes**: Return to the calling playbook for recovery; it re-invokes this action after

After a change, re-emit ONLY the abbreviated recap (§2) + `Anything else, or **done** to wrap up?`, not the full body — the body already scrolled. Then STOP.

## Exit Criteria

- [ ] Formatted summary + recap written to console (every mode)
- [ ] User signaled done — literally or via finalize-intent — under `interactive`, `checkpoint-review`, `spec-review`, `final-review`; loop skipped under `autonomous`
- [ ] Rollout ready for closure (no presentation deltas pending)
