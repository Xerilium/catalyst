# Design Decisions: Repo Labels

## One catalog, `Key: Value` first

**Decision**: One catalog of 22 labels, modeled on `finops-hubs` and `finops-toolkit`. Each label's standard name is `Key: Value`. `Status` labels put the emoji before the value (`Status: ✅ Ready`); every other label puts it after (`Help wanted ✨`). The simple name (`ready`, `help wanted`) is only a fallback for repositories that already use GitHub's simple style. GitHub's defaults that overlap the catalog (`duplicate`, `help wanted`, …) map to a catalog label so they can be renamed in place. No `Type:` labels: GitHub's built-in issue type field covers them. Every catalog label is synced, not just the ones automation reads.

**Date**: 2026-10-24

**Why**: Teams need the whole set (triage, release, resolution) to be consistent, not only the work-state labels. Renaming in place keeps every assignment. A leading emoji makes the state scannable at a glance on `Status` labels; elsewhere the text leads. One rule per group fixes the mixed placement in `finops-hubs`. `dependencies` stays out of the catalog because Dependabot applies it by that exact name.

**Rejected**: Kebab-case ids as label names (nobody reads `needs-attention` as a label). A required/optional split (repos end up half set up). One emoji position for every label (loses the at-a-glance state on `Status`). `Type:` labels (duplicates GitHub's issue types).

## A YAML playbook, no CLI command

**Decision**: Sync is one YAML playbook, `sync-repo-labels.yaml`, run by `catalyst init` and on demand with `catalyst run sync-repo-labels`. `gh` does the reads and writes from `bash` steps, `script` steps hold the matching and planning, and `checkpoint` steps ask. There is no `catalyst labels` command.

**Date**: 2026-10-24

**Why**: The playbook engine already has every piece the job needs, so no TypeScript or AI step is needed. Nothing outside sync needs to look up a label name through a command: automation reads names from the catalog and `.xe/config/catalyst.json`.

**Rejected**: A `catalyst labels` command with `plan` and `resolve` subcommands (public surface for internal steps). An AI action that asks through AUQ (token cost for a deterministic job). Native `github-label-*` actions (worth adding only once a second playbook needs them).

## Detect the style in use, always ask, save the answer

**Decision**: The style defaults to the one the repository's labels use, weighted by how many issues and pull requests carry them. Unused simple labels don't count, since GitHub creates them everywhere; unused `Key: Value` labels count, since someone made them on purpose. The user always picks the style (detected one first) and confirms the changes. Repositories that already use `Key: Value` with other names choose between renaming to the standard and keeping their names. Declining the changes saves the repository's existing label names as custom names, so automation uses what's already there. The answer goes to `.xe/config/catalyst.json` `labels`: `style` (`key-value`, `simple`, or `custom`) and `names`, which overrides any single label in every style. `custom` uses `key-value` for every label not in `names`.

**Date**: 2026-10-24

**Why**: Usage shows what the team actually does; presence alone misreads every new repository as simple. Labels are shared team state, so changes need a yes. Saving the answer means the next sync and the PR sweep use the same names without asking again.

**Rejected**: Asking only when detection is unsure (renames other people rely on without a yes). A separate label-names file (a second config location).

## Never delete, never fail init

**Decision**: Sync creates and renames but never deletes. It skips with a notice when `gh` is missing, signed out, or not in a GitHub repository, and reports each label it couldn't create while continuing with the rest.

**Date**: 2026-10-24

**Why**: Deleting strips the label from every issue and pull request. `catalyst init` runs in brand-new projects that may not have a remote yet; labels must not block setup. Automation that needs a missing label creates it on first use.

**Rejected**: Failing init when GitHub is unreachable (blocks the main job on a side job).
