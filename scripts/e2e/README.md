# Catalyst e2e gate

Drives all 12 skills (`init, blueprint, explore, create, change, fix, rollout, run, sitrep, pr-review, pr-update, pr-loop`) headlessly with `claude -p` against a private throwaway GitHub repo (`flanakin/catalyst-e2e-*`) holding a toy TypeScript app managed with pnpm. Installs the **local** build (`dist/catalyst-latest.tgz` + `dist/` as the plugin dir), never the npm release. PR skills run against PRs with deliberate flaws (hardcoded key, off-by-one paging, no tests).

```bash
npm run build                      # produces dist/ (build touches .claude/settings.json, .vscode/settings.json: git checkout them)
npx tsx scripts/e2e/run.ts         # all skills
npx tsx scripts/e2e/run.ts --skills fix,sitrep --keep
```

Options: `--skills a,b`, `--keep` (skip repo delete), `--budget <usd per skill>` (default 5), `--model <alias>`, `--owner`, `--out <dir>`.

Needs `gh` auth with `repo` and `delete_repo` (`gh auth refresh -s delete_repo`), `claude`, `pnpm`, `git`. Uses `--permission-mode bypassPermissions`; runs only inside a temp dir and the throwaway repo. Costs real tokens.

Output: `e2e-results/matrix.md` (skill | result | evidence | defect) plus one transcript JSON per skill. Exit 0 = all PASS, 1 = any non-PASS, 2 = harness error, 3 = repo cleanup failed.

Checks are heuristic (file/PR state, keyword presence); a FAIL needs a look at the transcript before filing a defect.
