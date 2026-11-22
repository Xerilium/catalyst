# Design Decisions: playbook-template-engine

## `catalyst://` resolves from the running package first

**Decision**: `catalyst://path` resolves against the running Catalyst package, found by walking up from the resolver module to the `@xerilium/catalyst` `package.json`. A source checkout maps to `src/resources`. When the path is not in the running package, it falls back to `node_modules/@xerilium/catalyst` in the current folder, then each parent folder (a repo root or hoisted workspace install).

**Date**: 2026-11-19

**Why**: Global and `npx` installs have no `node_modules/@xerilium/catalyst` in the current folder, so a current-folder lookup fails for them (#250, #251). The running package's resources match the running code, so a playbook never pairs with templates from a different version. Package discovery reuses the name-checked walk-up behind `env.catalystRoot`, so both find the same package.

**Accepted cost**: When a global CLI runs in a project that pins a different Catalyst version, the CLI uses its own resources, not the project's pinned copy. Run the project's pinned version (`npx catalyst` from the project) to use the pinned resources.

**Rejected**:

- **Current folder first**: Matches the project pin, but pairs one version's code with another version's resources.
- **Fixed relative depth from the module**: Breaks when the compiled layout changes, and a stray `package.json` at that depth gives a false match.
