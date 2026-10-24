# Catalyst e2e gate

Drives all 12 skills (`init, blueprint, explore, create, change, fix, rollout, run, sitrep, pr-review, pr-update, pr-loop`) headlessly with `claude -p` against a private throwaway GitHub repo (`flanakin/catalyst-e2e-*`) holding a toy TypeScript app managed with pnpm. Installs the **local** build (`dist/catalyst-latest.tgz` + `dist/` as the plugin), never the npm release. PR skills run against PRs with deliberate flaws (hardcoded key, off-by-one paging, no tests).

```bash
npm run build                      # produces dist/ (CLI and plugin) (build touches .claude/settings.json, .vscode/settings.json: git checkout them)
npx tsx scripts/e2e/run.ts         # all skills
npx tsx scripts/e2e/run.ts --skills fix,sitrep --keep
```

Options: `--skills a,b`, `--keep` (skip repo delete), `--budget <usd per skill>` (default 5), `--model <alias>`, `--owner`, `--out <dir>`.

Needs `gh` auth with `repo` and `delete_repo` (`gh auth refresh -s delete_repo`), `claude`, `pnpm`, `git`. Uses `--permission-mode bypassPermissions`; runs only inside a temp dir and the throwaway repo. Costs real tokens.

Output: `e2e-results/matrix.md` (skill | result | evidence | defect) plus one transcript JSON per skill. Exit 0 = all PASS, 1 = any non-PASS, 2 = harness error, 3 = repo cleanup failed.

Checks are heuristic (file/PR state, keyword presence); a FAIL needs a look at the transcript before filing a defect.

## Pack gate and release validation

The e2e installs the **packed tarball** (the exact publish artifact) into a clean dir; skills run from that install (`--plugin-dir node_modules/@xerilium/catalyst`), never from the repo. `--tarball <file>` validates any artifact (e.g. `npm pack @xerilium/catalyst@0.3.2`); `--pack-only` skips `claude`/GitHub and only installs the tarball, then runs `catalyst check` and `catalyst init` from it (exit 2 on a crash such as a missing module).

`.github/workflows/validate-release.yml` (`workflow_call` + `workflow_dispatch`) runs this. `release.yml` calls it as a required `validate` job (pack gate always; all 12 skills also run when both secrets `ANTHROPIC_API_KEY` and `E2E_GH_TOKEN` are set, otherwise they are skipped with a warning) before the tag and GitHub release are created, so a failing gate leaves nothing to clean up (order: validate → tag + release → publish → smoke). Run it with `dry_run: true` to exercise only the pack gate: no tag, release, publish, or bump. After publish, `smoke` mode installs the published version from npm and runs `catalyst check`.
