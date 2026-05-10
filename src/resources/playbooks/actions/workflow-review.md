# Present Workflow Review

Present completed work as a formatted console summary, then loop on user input until "done". Spec-change recovery is the calling playbook's responsibility.

‼️ Write for **Distilled Excellence**: Highest signal per character

## Inputs

- `rollout-id`: In-progress rollout ID; rollout file at `.xe/rollouts/rollout-{rollout-id}.md`
- `execution-mode`: `interactive`, `checkpoint-review`, `final-review`, or `autonomous`

## Instructions

### 1. Skip when autonomous

If `execution-mode` is `autonomous`, skip presentation entirely; closure proceeds directly to PR creation.

### 2. Present work

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

### 3. Recap

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

### 4. Loop until done

⛔️ **STOP HERE**: Do NOT proceed until user responds with "done". Handle non-"done" responses by complexity, then re-prompt and STOP again until "done":

- **Simple tweaks** (rename, fix typo, small adjustment): Execute immediately
- **New tasks** (add a test, update a file, non-trivial work): Add to the rollout plan, execute, mark complete
- **Spec changes** (new requirements, changed behavior): Spec-change recovery is the calling playbook's responsibility — return to the playbook with the spec-change request; the playbook re-invokes this action after recovery

After handling any non-"done" response, end with an HR and `Anything else, or **done** to wrap up?` on its own line, then STOP.

## Exit Criteria

- [ ] Presentation skipped under `autonomous` mode, OR formatted summary + recap written to console
- [ ] User confirmed "done" (or skipped under `autonomous`)
- [ ] Rollout ready for closure (no presentation deltas pending)
