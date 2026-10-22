# Release 0.3 blocker: npm publish fails (auth)

Status: e2e is green (12/12 at 46b1cf4, plus e2e-only follow-up #168). Release workflow run 39756550988 created tag/release `v0.3` and bumped main to `0.3.1-dev`, but the **publish job failed**: `npm error 404 Not Found - PUT https://registry.npmjs.org/@xerilium%2fcatalyst` (npm's masked auth failure).

Cause (likely): repo secret `NPM_TOKEN` (last set 2025-10-25) is expired/revoked. No npm login exists locally either (`npm whoami` → 401).

To finish:
1. Create a fresh npm automation token with publish rights to `@xerilium/catalyst` and `@xerilium/catalyst-plugin`; update the `NPM_TOKEN` secret.
2. Re-run the `publish / publish` job (or the `Publish to NPM` workflow at tag `v0.3`) — do NOT re-run Create Release (it would cut 0.3.1).
3. Verify `npm view @xerilium/catalyst version` = 0.3.0 and `npx catalyst init` in a scratch dir.

Cleanup owed: throwaway repos `flanakin/catalyst-e2e-*` (need `gh auth refresh -s delete_repo`).
