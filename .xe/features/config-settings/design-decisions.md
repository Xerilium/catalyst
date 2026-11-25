# Design Decisions: Config Settings

## One typed config object, no lookup function

**Decision**: Features read settings as `Config.{path}` on one typed object. `Config` loads the working-tree file once, on first use. `createConfig(text)` builds the same object from other text, and `loadConfig(projectRoot)` from another project root.

**Date**: 2026-11-25

**Why**: The object definition is the only place a setting's path, type, and default live. TypeScript checks every path at compile time, so a typo fails the build, not a test. No string keys repeat between a catalog and its callers.

**Rejected**:

- **`getSetting(key, config?, env?)` lookup over a catalog**: repeats each key, and a wrong key fails only at run time.
- **Catalog plus object**: two definitions of the same settings.

**Evidence**:

- https://github.com/Xerilium/catalyst/pull/312 — review asks for a config object, no lookup

## Callers pick the config text; the object never calls Git

**Decision**: Pull request code fetches `.xe/config/catalyst.json` from the base branch itself, then calls `createConfig(text)`.

**Date**: 2026-11-20

**Why**: Pull request settings must come from the PR's base branch, never its head, and a deleted base branch is read at its last commit. That choice belongs to the pull request code. A config module that never calls Git or GitHub stays pure and testable, and serves both sources.

**Rejected**:

- **Config that fetches by ref through `gh`**: couples the core module to GitHub and to one way of reading a deleted branch.
- **Config that always reads the working tree**: would let a PR change the settings that judge it.

## The config object checks only a property's top-level type

**Decision**: A set value with the wrong top-level type takes the default. Inner rules, such as allowed severities or day counts, stay with the feature that owns the property.

**Date**: 2026-11-20

**Why**: Owners already validate inner values, with their own error codes and messages. Moving that into the config object would duplicate rules and change error codes callers rely on.

**Rejected**:

- **Full JSON Schema per property**: more code than today's settings need, and it would move error handling away from the owners.

**Evidence**:

- https://github.com/Xerilium/catalyst/issues/195 — config feature owns the schema

## An invalid config file fails every command

**Decision**: Traceability no longer falls back to defaults when `.xe/config/catalyst.json` is not a JSON object. It fails with `ConfigInvalid`, like `catalyst check` and the Autopilot gates.

**Date**: 2026-11-25

**Why**: A silent fallback drops settings such as `traceability.default` with no message. One bad file now reads the same way in every command.

**Rejected**:

- **Warn and fall back**: the run still ignores the user's settings.
