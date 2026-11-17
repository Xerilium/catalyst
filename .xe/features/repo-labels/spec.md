---
id: repo-labels
title: Repo Labels
description: Standard issue, pull request, and discussion labels, synced to the naming style the repository already uses.
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Feature: Repo Labels

## Purpose

Give every repository one standard set of labels that people and Catalyst automation use to track the state of issues, pull requests, and discussions.

## Scenarios

### FR:sync: Sync labels

Project Maintainer needs the standard labels in their repository, named the way the repository already names labels, so that automation can read and set work state without breaking existing conventions.

- **FR:sync.@playbook** (P1): Interface: `src/resources/playbooks/sync-repo-labels.yaml`
- **FR:sync.input** (P2):
  - `style` (`key-value`|`simple`|`custom`?) – naming style; skips the style question
- **FR:sync.catalog** (P1): Playbook MUST sync the standard labels
  > - @req FR:catalog
- **FR:sync.discover** (P1): Playbook MUST default the style to the one the repository's labels already use, weighing how many issues and pull requests carry each label
  - **FR:sync.discover.defaults** (P1): Playbook MUST NOT count unused simple labels as evidence, since GitHub creates them in every repository
  - **FR:sync.discover.none** (P2): Playbook MUST default to `key-value` when no label gives evidence
- **FR:sync.style** (P1): Playbook MUST ask one question, unless the input or saved config sets the style, and treat the answer as the user's confirmation of the changes it shows
  - **FR:sync.style.current** (P1): Question MUST say which style the repository uses now
  - **FR:sync.style.default** (P1): Question MUST default to the style the repository uses now
  - **FR:sync.style.options** (P1): Question MUST offer these choices, each with the number of labels it would add, rename, and remove
    - **FR:sync.style.options.key-value** (P1): `Key: Value` MUST be the first choice and marked as recommended
    - **FR:sync.style.options.keep** (P1): `Keep my names` MUST appear only when some `Key: Value` labels use names other than the standard
      - **FR:sync.style.options.keep.custom** (P1): Choice MUST save those names as custom names instead of renaming them
    - **FR:sync.style.options.simple** (P1): `Simple` MUST use GitHub-style names
    - **FR:sync.style.options.skip** (P1): `Skip` MUST change no label
    - **FR:sync.style.details** (P2): Question MUST offer a details view that lists every change each choice would make
      - **FR:sync.style.details.layout** (P2): Details MUST name each added, renamed, and removed label in the summary layout
        > - @req FR:sync.summary
- **FR:sync.confirm** (P1): Playbook MUST ask the user to confirm the planned changes before changing any label, unless the style question just showed them
- **FR:sync.create** (P1): Playbook MUST create each missing standard label with its color and description
- **FR:sync.rename** (P1): Playbook MUST rename an existing label that matches a standard label but differs in name, so issues and pull requests keep it
  - **FR:sync.rename.defaults** (P1): Playbook MUST rename GitHub's default labels to their `Key: Value` names when the style is `key-value`
  - **FR:sync.rename.emoji** (P2): Playbook MUST rename a `Key: Value` label whose emoji is out of place: before the value for `Status` labels, after it for all others
- **FR:sync.delete** (P1): Playbook MUST delete GitHub's default type labels (`bug`, `enhancement`, `documentation`, `question`) that no issue or pull request carries, after the user confirms the plan
  - **FR:sync.delete.used** (P1): Playbook MUST keep any label, including a type label, that an issue or pull request carries
- **FR:sync.outside** (P2): Playbook MUST report labels outside the standard catalog and ask whether to review them one by one or leave them as-is
  - **FR:sync.outside.exceptions** (P2): Playbook MUST NOT report these labels as outside the standard:
    - `dependencies`, which Dependabot creates
    - GitHub's default type labels that no issue or pull request carries, which `FR:sync.delete` removes
    - a custom name saved in `labels.names`
  - **FR:sync.outside.options** (P2): Playbook MUST offer these options for each label under review
    - **FR:sync.outside.options.keep** (P2): `Keep {name}`: Playbook MUST NOT change the label
    - **FR:sync.outside.options.change** (P2): `Change to {name}` renames the label in place
      - **FR:sync.outside.options.change.suggest** (P3): Playbook MUST offer the suggested name when it can derive one: the value of a `Key: Value` label, lowercase and without emoji, in the `simple` style
      - **FR:sync.outside.options.change.typed** (P2): Playbook MUST let the user type another name
    - **FR:sync.outside.options.delete** (P2): `Delete` removes the label from every issue and pull request that carries it
  - **FR:sync.outside.report** (P2): Playbook MUST apply every choice without retrying a failure, then report the labels it changed apart from the labels it couldn't
- **FR:sync.summary** (P2): Playbook MUST list label changes one per line with console-safe symbols: `+` add, `~` rename, `x` remove
  - **FR:sync.summary.heading** (P2): List MUST open with the change count (`12 label changes:`)
  - **FR:sync.summary.columns** (P2): Playbook MUST lay out each change as `{symbol} {old name} → {new name}`
    - **FR:sync.summary.columns.pad** (P2): Old-name column MUST be as wide as the longest old name, and empty for an added label
    - **FR:sync.summary.columns.removed** (P2): A removed label MUST show no arrow and no new name
  - **FR:sync.summary.color** (P2): Playbook MUST color the symbols green, yellow, and red when the terminal supports color
    - **FR:sync.summary.color.plain** (P2): Playbook MUST use plain text when the terminal does not support color
- **FR:sync.progress** (P1): Playbook MUST show one progress line while it applies changes, with the change's position out of the total (`[3/12]`)
  - **FR:sync.progress.done** (P2): Playbook MUST end with one `Applied N label changes` line
  - **FR:sync.progress.fast** (P2): Playbook MUST NOT look up the repository once per change
- **FR:sync.config** (P1): Playbook MUST save the chosen style and any custom names to `.xe/config/catalyst.json` under `labels`
  - **FR:sync.config.override** (P1): A custom name in `labels.names` MUST override that label's name in every style
  - **FR:sync.config.declined** (P1): Playbook MUST save the repository's existing label names as custom names when the user declines the changes
    - **FR:sync.config.declined.style** (P1): Playbook MUST pick each saved name in the style the repository uses most
- **FR:sync.portable** (P2): Playbook MUST run without a bash shell, so it works on Windows without Git Bash or WSL
- **FR:sync.unavailable** (P1): Playbook MUST skip with a notice, without failing, when GitHub is unreachable
- **FR:sync.fallback** (P2): Playbook MUST report each label it could not create and continue with the rest

### FR:catalog: Standard labels

Project Maintainer needs one fixed set of label names, colors, and descriptions so that automation and people read the same labels everywhere.

- **FR:catalog.name** (P1): Each label MUST have a `Key: Value` standard name and a lowercase simple name for repositories that use GitHub's simple style
- **FR:catalog.emoji** (P2): Emoji placement MUST follow the label group
  - **FR:catalog.emoji.status** (P2): `Status` labels MUST put the emoji before the value
  - **FR:catalog.emoji.other** (P2): `Needs`, `Release`, and unprefixed labels MUST put the emoji after the value
  - **FR:catalog.emoji.resolution** (P2): `Resolution` labels MUST NOT carry an emoji
- **FR:catalog.color** (P2): Color MUST signal the kind of label
  - **FR:catalog.color.urgent** (P2): `B60205` (red) for labels that need urgent action or mark a break
  - **FR:catalog.color.waiting** (P2): `FBCA04` (yellow) for labels that wait on a person
  - **FR:catalog.color.welcome** (P2): `5319E7` (purple) for labels that invite contributors
  - **FR:catalog.color.release** (P2): `0E8A16` (green) for wanted release work, `C2E0C6` (light green) for nice to have
  - **FR:catalog.color.state** (P2): `006B75` (teal) for labels that say whether work can move forward
  - **FR:catalog.color.neutral** (P2): `000000` (black) for labels that steer automation or close out an item
- **FR:catalog.external** (P2): Catalog MUST leave GitHub's `dependencies` label and type labels (`bug`, `enhancement`, `documentation`, `question`) out, so Dependabot keeps its label and GitHub's issue type field covers types
- **FR:catalog.breaking-change** (P1): Catalog MUST include `Breaking change 🚨` (simple name `breaking change`), color `B60205`: Breaks existing behavior; requires a major version
- **FR:catalog.good-first-issue** (P1): Catalog MUST include `Good first issue 🏆` (simple name `good first issue`), color `5319E7`: Approachable for newcomers
- **FR:catalog.help-wanted** (P1): Catalog MUST include `Help wanted ✨` (simple name `help wanted`), color `5319E7`: Outside contributions welcome
- **FR:catalog.hotfix** (P1): Catalog MUST include `Hotfix 🔥` (simple name `hotfix`), color `B60205`: Urgent fix that ships as soon as it merges
- **FR:catalog.needs-attention** (P1): Catalog MUST include `Needs: Attention 👋` (simple name `needs attention`), color `B60205`: Author or reporter action required
- **FR:catalog.needs-live-test** (P1): Catalog MUST include `Needs: Live test 🔬` (simple name `needs live test`), color `000000`: Needs a manual test in a live environment before merge
- **FR:catalog.needs-review** (P1): Catalog MUST include `Needs: Review 👀` (simple name `needs review`), color `FBCA04`: Waiting on a reviewer
- **FR:catalog.needs-triage** (P1): Catalog MUST include `Needs: Triage 🔍` (simple name `needs triage`), color `FBCA04`: Needs to be reviewed and prioritized
- **FR:catalog.release-blocker** (P1): Catalog MUST include `Release: Blocker ⛔` (simple name `release blocker`), color `B60205`: Must land before the next release
- **FR:catalog.release-priority** (P1): Catalog MUST include `Release: Priority ⭐` (simple name `release priority`), color `0E8A16`: Wanted in the next release more than the rest; can still be cut
- **FR:catalog.release-stretch** (P1): Catalog MUST include `Release: Stretch 🍒` (simple name `release stretch`), color `C2E0C6`: Nice to have in the next release; pushed if it misses
- **FR:catalog.cant-repro** (P1): Catalog MUST include `Resolution: Can't repro` (simple name `cant repro`), color `000000`: Unable to reproduce; add details to reopen
- **FR:catalog.duplicate** (P1): Catalog MUST include `Resolution: Duplicate` (simple name `duplicate`), color `000000`: Duplicate of another issue or PR
- **FR:catalog.external** (P1): Catalog MUST include `Resolution: External` (simple name `external`), color `000000`: Caused outside this repository
- **FR:catalog.invalid** (P1): Catalog MUST include `Resolution: Invalid` (simple name `invalid`), color `000000`: Not a valid issue or request
- **FR:catalog.no-activity** (P1): Catalog MUST include `Resolution: No activity` (simple name `no activity`), color `000000`: Closed due to inactivity
- **FR:catalog.wont-fix** (P1): Catalog MUST include `Resolution: Won't fix` (simple name `wontfix`), color `000000`: Will not be worked on
- **FR:catalog.autopilot** (P1): Catalog MUST include `Status: 🤖 Autopilot` (simple name `autopilot`), color `000000`: AI drives this PR to merge, escalating only decisions
- **FR:catalog.blocked** (P1): Catalog MUST include `Status: ⛔ Blocked` (simple name `blocked`), color `006B75`: Blocked on another change or an outside factor
- **FR:catalog.finalized** (P1): Catalog MUST include `Status: ☑️ Finalized` (simple name `finalized`), color `000000`: Checks pass and every thread is resolved
- **FR:catalog.paused** (P1): Catalog MUST include `Status: ⏸️ Paused` (simple name `paused`), color `000000`: On hold; automation skips it
- **FR:catalog.ready** (P1): Catalog MUST include `Status: ✅ Ready` (simple name `ready`), color `006B75`: Approved and ready to merge
- **FR:catalog.wip** (P1): Catalog MUST include `Status: 🚧 WIP` (simple name `wip`), color `000000`: Someone is working on this now; automation skips it

## Data Model

None

## Architecture Constraints

None

## External Dependencies

- GitHub CLI (`gh`) — signed in for the target repository
