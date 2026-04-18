# Feedback: playbook-actions-io

## Logging actions

- **Log-summary action**: Action that retrieves and displays a filtered summary of log messages emitted during execution. Requires engine-level log buffer (circular, ~1000 messages). Config: `minLevel`, `title`, `groupBy` (none/step/level), `maxMessages`. Useful for `errorPolicy: continue` playbooks where errors accumulate silently.
- **Directory operations**: Four actions mirroring file ops — `dir-exists`, `dir-create`, `dir-list`, `dir-delete`. Currently requires `bash`/`script` workaround, breaking cross-platform portability.
- **User input actions**: `input-text` and `input-select` actions for collecting user input during execution. Requires `PlaybookIOProvider` interface (engine has no user I/O concept). Would enable runtime prompts, secret collection, computed option selection.
