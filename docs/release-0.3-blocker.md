# Release 0.3 blocker

🤖 [AI] Catalyst 0.3 is validated but not published to npm.

## State

- Scripted e2e (`scripts/e2e/run.ts`) on main b381919: 12/12 skills PASS.
- Tag `v0.3` and GitHub release exist; main is at `0.3.1-dev`.
- Publish run https://github.com/Xerilium/catalyst/actions/runs/39756550988 built `@xerilium/catalyst@0.3.0`, then `npm publish` failed: `E404 PUT https://registry.npmjs.org/@xerilium%2fcatalyst - Not found`. npm returns this for an invalid, expired, or under-scoped token. The `NPM_TOKEN` repo secret dates from 2025-10-25. npm still has 0.1.3.

## Needed from a human

1. Create a new npm automation token with publish rights to `@xerilium/catalyst` and `@xerilium/catalyst-plugin`; update the `NPM_TOKEN` repo secret.
2. Run the "Publish to NPM" workflow (workflow_dispatch) with tag `v0.3`.
3. Verify `npm view @xerilium/catalyst version` = 0.3.0, then `npx catalyst init` in a scratch dir.
4. Run `gh auth refresh -s delete_repo`, then delete the `flanakin/catalyst-e2e-*` throwaway repos.
