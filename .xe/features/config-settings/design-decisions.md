# Design Decisions: Config Settings

## Callers fetch config text; the lookup only parses and reads

**Decision**: `getSetting` reads from a parsed config object that the caller supplies. `readConfig` loads the working-tree file. Pull request code fetches the file from the base branch itself, then calls `parseConfig`.

**Date**: 2026-11-20

**Why**: Pull request settings must come from the PR's base branch, never its head, and a deleted base branch is read at its last commit. That choice belongs to the pull request code. A lookup that never calls Git or GitHub stays pure and testable, and serves both sources.

**Rejected**:

- **Lookup that fetches by ref through `gh`**: couples the core module to GitHub and to one way of reading a deleted branch.
- **Lookup that always reads the working tree**: would let a PR change the settings that judge it.

## The lookup checks only a setting's top-level type

**Decision**: `getSetting` returns the default when a set value has the wrong top-level type. Inner rules, such as allowed severities or day counts, stay with the feature that owns the setting.

**Date**: 2026-11-20

**Why**: Owners already validate inner values, with their own error codes and messages. Moving that into the catalog would duplicate rules and change error codes callers rely on.

**Rejected**:

- **Full JSON Schema per setting**: more code than today's settings need, and it would move error handling away from the owners.

**Evidence**:

- https://github.com/Xerilium/catalyst/issues/195 — config feature owns the schema
