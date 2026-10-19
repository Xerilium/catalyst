# Design Decisions: PR Labels

## Small required core, optional known labels

**Decision**: Eight labels are required: `wip`, `paused`, `blocked`, `autopilot`, `ready`, `needs-attention`, `needs-review`, `help-wanted`. Five more are known but optional: `finalized`, `needs-triage`, `release-blocker`, `release-priority`, `release-stretch`. Setup creates only required labels; it renames optional ones when they already exist.

**Date**: 2026-10-19

**Why**: `finops-toolkit` and `finops-hubs` use about a dozen labels, but only the work-state ones drive automation (sweeps skip `wip` and `paused`; autopilot and review loops read `autopilot`, `needs-review`, `needs-attention`). Release and triage labels are team process; creating them everywhere would add noise to repos that never use them.

**Rejected**: Requiring every observed label — clutters repos with unused labels. Requiring only `wip` — the sweep and loop playbooks already need paused, blocked, and autopilot.

**Evidence**:

- `finops-hubs` `.xe/features/devops-triage/spec.md` and `.xe/process/pull-requests.md`
- `finops-toolkit` `.github/policies`

## Semantic ids with two naming styles

**Decision**: Playbooks refer to labels by semantic id. Each definition carries a group, value, emoji, and simple name, and renders as key/value (`Status: WIP 🚧`, `Help wanted ✨`) or simple (`wip`, `help wanted`). Key/value is the default.

**Date**: 2026-10-19

**Why**: Repos differ (GitHub's own defaults are simple lower-case; the FinOps repos use grouped, emoji-bearing names). A semantic id decouples playbooks from spelling, so one playbook works in both.

**Rejected**: Hard-coded names in playbooks — breaks in any repo with a different convention. Per-repo config file for label names — a second source of truth that drifts from the labels that actually exist.

## Emoji trails the text

**Decision**: The standard places the emoji after the label text. Leading emoji (`Status: 🚧 WIP`) is classified as a deviation and setup offers to rename it.

**Date**: 2026-10-19

**Why**: `finops-hubs` mixes `Status: 🚧 WIP` and `Release: Stretch 🍒`. Trailing emoji keeps labels sortable and scannable by text, and matches the majority of observed labels. Renaming in place preserves every assignment, so normalizing is safe.

**Rejected**: Leading emoji — the minority form. Leaving mixed placement — makes name derivation for new labels ambiguous.

## Discovery from usage, not from defaults

**Decision**: A repository's style is the style with the most issue and PR uses across labels that match the catalog. Unused key/value labels are decisive evidence (nobody creates `Status: WIP 🚧` by accident). Simple labels that win with fewer than 5 uses in total are treated as undetermined and the user is asked.

**Date**: 2026-10-19

**Why**: Every GitHub repository starts with simple default labels such as `help wanted`, so their mere presence says nothing about convention. Usage counts say what the team actually does. Asymmetry is deliberate: simple names can be defaults, key/value names cannot. The threshold of 5 is a judgment call; it is a named constant, not a spec-level promise of precision.

**Rejected**: Presence-only detection — misreads every default repo as simple. Always defaulting to key/value — silently creates a second convention beside a team's real simple labels. Always asking — needless prompt when usage is clear.

## Resolver prefers what exists

**Decision**: `resolveLabel` returns the existing label that matches an id, whatever its style. The style only decides the name when no label exists.

**Date**: 2026-10-19

**Why**: After setup in a low-use simple repo, discovery may still say undetermined; the resolver must not then flip to key/value names. Returning the real label name is always correct for applying a label.

**Rejected**: Resolving purely from discovered style — wrong whenever a repo is mixed or undetermined.

## Setup never deletes, never duplicates

**Decision**: Setup creates a required label only when no matching label exists (matching ignores case, emoji, punctuation, and spacing), renames in place through `gh label edit --name`, and never deletes. Extra labels matching one definition are reported as duplicates and left alone.

**Date**: 2026-10-19

**Why**: A rename keeps assignments; delete-and-create would strip labels from every issue and PR. Creating next to a differently-styled match would produce two labels for one meaning.

**Rejected**: Delete and recreate — loses assignments. Merging duplicates automatically — requires relabeling issues, which is a write the owner has not asked for.

## Renames need consent; non-interactive skips them

**Decision**: Interactive runs confirm renames once; `--rename` applies them without asking; `--non-interactive` alone reports them without applying. A style question is asked only when the pattern needs a choice and a required label is missing.

**Date**: 2026-10-19

**Why**: Creating a missing label is additive and safe to automate inside `catalyst init`. A rename changes names others may search or script against, so it needs a yes.

**Rejected**: Auto-renaming in init — surprising change to a repo the user did not ask to restyle.

## Code in the CLI, wired into init through the playbook

**Decision**: Label logic is TypeScript under `src/core/labels/` behind a new `catalyst labels` command (`setup`, `plan`, `resolve`). `init.yaml` runs `catalyst labels setup` from a `bash` step. The AI path (`/catalyst:init`) runs `labels-setup.md`, which reads `catalyst labels plan --json`, asks through AUQ, then calls setup non-interactively.

**Date**: 2026-10-19

**Why**: The `cli-init` constraint forbids install-specific TypeScript inside init, so init composes a command rather than embedding logic. A new playbook action would require regenerating the action catalog and would still need terminal prompting that actions do not have. The `bash` action does not pass a TTY, so the prompt reads `/dev/tty` (`CON` on Windows) when standard input is not interactive and falls back to the default when that fails.

**Rejected**: A `github-labels` native action — heavier (catalog regeneration, spec for the git actions) for a single consumer. Prompting in the dynamic command wrapper — couples every YAML command to label setup.

## Skip, never fail, when GitHub is unreachable

**Decision**: Setup prints a notice and exits 0 when `gh` is missing, unauthenticated, or the directory is not a GitHub repository.

**Date**: 2026-10-19

**Why**: `catalyst init` runs on brand-new projects that may not have a remote yet. Labels are a convenience; they must not block installing commands.

**Rejected**: Failing init — blocks the primary job on a secondary one.
