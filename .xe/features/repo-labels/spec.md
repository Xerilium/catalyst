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
  > - @req FR:$label
- **FR:sync.discover** (P1): Playbook MUST default the style to the one the repository's labels already use, weighing how many issues and pull requests carry each label
  - **FR:sync.discover.defaults** (P1): Playbook MUST NOT count unused simple labels as evidence, since GitHub creates them in every repository
  - **FR:sync.discover.none** (P2): Playbook MUST default to `key-value` when no label gives evidence
- **FR:sync.style** (P1): Playbook MUST ask which style to use, offering the other style too, unless the input or saved config sets it
- **FR:sync.confirm** (P1): Playbook MUST ask the user to confirm the planned changes before changing any label
- **FR:sync.create** (P1): Playbook MUST create each missing standard label with its color and description
- **FR:sync.rename** (P1): Playbook MUST rename an existing label that matches a standard label but differs in name, so issues and pull requests keep it
  - **FR:sync.rename.defaults** (P1): Playbook MUST rename GitHub's default labels to their `Key: Value` names when the style is `key-value`
  - **FR:sync.rename.emoji** (P2): Playbook MUST rename a `Key: Value` label whose emoji is out of place: before the value for `Status` labels, after it for all others
  - **FR:sync.rename.keep** (P1): Playbook MUST ask whether to rename `Key: Value` labels that use different names, or keep them as custom names
- **FR:sync.no-delete** (P1): Playbook MUST NOT delete labels
- **FR:sync.config** (P1): Playbook MUST save the chosen style and any custom names to `.xe/config/catalyst.json` under `labels`
  - **FR:sync.config.override** (P1): A custom name in `labels.names` MUST override that label's name in every style
  - **FR:sync.config.declined** (P1): Playbook MUST save the repository's existing label names as custom names when the user declines the changes
- **FR:sync.unavailable** (P1): Playbook MUST skip with a notice, without failing, when GitHub is unreachable
- **FR:sync.fallback** (P2): Playbook MUST report each label it could not create and continue with the rest

## Data Model

- **FR:$label** (P1): **Standard label** — one row per label. `Key: Value` is the standard name; the simple name is the fallback for repositories that use GitHub's simple style.

  | Id                 | Standard name            | Simple name        | Color    | Description                                                     |
  | ------------------ | ------------------------ | ------------------ | -------- | --------------------------------------------------------------- |
  | `needs-review`     | `Needs: Review 👀`       | `needs review`     | `FBCA04` | Waiting on a reviewer                                           |
  | `needs-triage`     | `Needs: Triage 🔍`       | `needs triage`     | `FBCA04` | Needs to be reviewed and prioritized                            |
  | `needs-attention`  | `Needs: Attention 👋`    | `needs attention`  | `B60205` | Author or reporter action required                              |
  | `breaking-change`  | `Breaking change 🚨`     | `breaking change`  | `B60205` | Breaks existing behavior; requires a major version              |
  | `hotfix`           | `Hotfix 🔥`              | `hotfix`           | `B60205` | Urgent fix that ships as soon as it merges                      |
  | `release-blocker`  | `Release: Blocker ⛔`    | `release blocker`  | `B60205` | Must land before the next release                               |
  | `release-priority` | `Release: Priority ⭐`   | `release priority` | `0E8A16` | Wanted in the next release more than the rest; can still be cut |
  | `release-stretch`  | `Release: Stretch 🍒`    | `release stretch`  | `C2E0C6` | Nice to have in the next release; pushed if it misses           |
  | `ready`            | `Status: Ready ▶️`       | `ready`            | `006B75` | Approved and ready to merge                                     |
  | `blocked`          | `Status: Blocked ⛔`     | `blocked`          | `006B75` | Blocked on another change or an outside factor                  |
  | `autopilot`        | `Status: Autopilot 🤖`   | `autopilot`        | `000000` | AI drives this PR to merge, escalating only decisions           |
  | `wip`              | `Status: WIP 🚧`         | `wip`              | `000000` | Someone is working on this now; automation skips it             |
  | `paused`           | `Status: Paused ⏸️`      | `paused`           | `000000` | On hold; automation skips it                                    |
  | `duplicate`        | `Resolution: Duplicate`  | `duplicate`        | `000000` | Duplicate of another issue or PR                                |
  | `wont-fix`         | `Resolution: Won't fix`  | `wontfix`          | `000000` | Will not be worked on                                           |
  | `invalid`          | `Resolution: Invalid`    | `invalid`          | `000000` | Not a valid issue or request                                    |
  | `good-first-issue` | `Good first issue 🏆`    | `good first issue` | `5319E7` | Approachable for newcomers                                      |
  | `help-wanted`      | `Help wanted ✨`         | `help wanted`      | `5319E7` | Outside contributions welcome                                   |
  | `bug`              | `Type: Bug 🐛`           | `bug`              | `FFFFFF` | Something isn't working                                         |
  | `feature`          | `Type: Feature 💎`       | `enhancement`      | `FFFFFF` | New feature or improvement                                      |
  | `documentation`    | `Type: Documentation 📃` | `documentation`    | `FFFFFF` | Documentation changes                                           |
  | `question`         | `Type: Question ❓`      | `question`         | `FFFFFF` | Further information is requested                                |

  GitHub's `dependencies` label is not in the catalog, so Dependabot keeps applying it unchanged. Type labels (`bug`, `enhancement`, `documentation`, `question`) are left alone in favor of GitHub's built-in issue type field.

## Architecture Constraints

None

## External Dependencies

- GitHub CLI (`gh`) — signed in for the target repository | Id | Standard name | Simple name | Color | Description |
  | --- | --- | --- | --- | --- |
  | `breaking-change` | `Breaking change 🚨` | `breaking change` | `B60205` | Breaks existing behavior; requires a major version |
  | `good-first-issue` | `Good first issue 🏆` | `good first issue` | `5319E7` | Approachable for newcomers |
  | `help-wanted` | `Help wanted ✨` | `help wanted` | `5319E7` | Outside contributions welcome |
  | `hotfix` | `Hotfix 🔥` | `hotfix` | `B60205` | Urgent fix that ships as soon as it merges |
  | `needs-attention` | `Needs: Attention 👋` | `needs attention` | `B60205` | Author or reporter action required |
  | `needs-review` | `Needs: Review 👀` | `needs review` | `FBCA04` | Waiting on a reviewer |
  | `needs-triage` | `Needs: Triage 🔍` | `needs triage` | `FBCA04` | Needs to be reviewed and prioritized |
  | `release-blocker` | `Release: Blocker ⛔` | `release blocker` | `B60205` | Must land before the next release |
  | `release-priority` | `Release: Priority ⭐` | `release priority` | `0E8A16` | Wanted in the next release more than the rest; can still be cut |
  | `release-stretch` | `Release: Stretch 🍒` | `release stretch` | `C2E0C6` | Nice to have in the next release; pushed if it misses |
  | `cant-repro` | `Resolution: Can't repro` | `cant repro` | `000000` | Unable to reproduce; add details to reopen |
  | `duplicate` | `Resolution: Duplicate` | `duplicate` | `000000` | Duplicate of another issue or PR |
  | `external` | `Resolution: External` | `external` | `000000` | Caused outside this repository |
  | `invalid` | `Resolution: Invalid` | `invalid` | `000000` | Not a valid issue or request |
  | `no-activity` | `Resolution: No activity` | `no activity` | `000000` | Closed due to inactivity |
  | `wont-fix` | `Resolution: Won't fix` | `wontfix` | `000000` | Will not be worked on |
  | `autopilot` | `Status: 🤖 Autopilot` | `autopilot` | `000000` | AI drives this PR to merge, escalating only decisions |
  | `blocked` | `Status: ⛔ Blocked` | `blocked` | `006B75` | Blocked on another change or an outside factor |
  | `finalized` | `Status: ☑️ Finalized` | `finalized` | `000000` | Checks pass and every thread is resolved |
  | `paused` | `Status: ⏸️ Paused` | `paused` | `000000` | On hold; automation skips it |
  | `ready` | `Status: ✅ Ready` | `ready` | `006B75` | Approved and ready to merge |
  | `wip` | `Status: 🚧 WIP` | `wip` | `000000` | Someone is working on this now; automation skips it |

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
  > - @req FR:$label
- **FR:sync.discover** (P1): Playbook MUST default the style to the one the repository's labels already use, weighing how many issues and pull requests carry each label
  - **FR:sync.discover.defaults** (P1): Playbook MUST NOT count unused simple labels as evidence, since GitHub creates them in every repository
  - **FR:sync.discover.none** (P2): Playbook MUST default to `key-value` when no label gives evidence
- **FR:sync.style** (P1): Playbook MUST ask which style to use, offering the other style too, unless the input or saved config sets it
- **FR:sync.confirm** (P1): Playbook MUST ask the user to confirm the planned changes before changing any label
- **FR:sync.create** (P1): Playbook MUST create each missing standard label with its color and description
- **FR:sync.rename** (P1): Playbook MUST rename an existing label that matches a standard label but differs in name, so issues and pull requests keep it
  - **FR:sync.rename.defaults** (P1): Playbook MUST rename GitHub's default labels to their `Key: Value` names when the style is `key-value`
  - **FR:sync.rename.emoji** (P2): Playbook MUST rename a `Key: Value` label whose emoji is out of place: before the value for `Status` labels, after it for all others
  - **FR:sync.rename.keep** (P1): Playbook MUST ask whether to rename `Key: Value` labels that use different names, or keep them as custom names
- **FR:sync.no-delete** (P1): Playbook MUST NOT delete labels
- **FR:sync.config** (P1): Playbook MUST save the chosen style and any custom names to `.xe/config/catalyst.json` under `labels`
  - **FR:sync.config.override** (P1): A custom name in `labels.names` MUST override that label's name in every style
  - **FR:sync.config.declined** (P1): Playbook MUST save the repository's existing label names as custom names when the user declines the changes
- **FR:sync.unavailable** (P1): Playbook MUST skip with a notice, without failing, when GitHub is unreachable
- **FR:sync.fallback** (P2): Playbook MUST report each label it could not create and continue with the rest

## Data Model

- **FR:$label** (P1): **Standard label** — one row per label. `Key: Value` is the standard name; the simple name is the fallback for repositories that use GitHub's simple style.

  | Id                 | Standard name            | Simple name        | Color    | Description                                                     |
  | ------------------ | ------------------------ | ------------------ | -------- | --------------------------------------------------------------- |
  | `needs-review`     | `Needs: Review 👀`       | `needs review`     | `FBCA04` | Waiting on a reviewer                                           |
  | `needs-triage`     | `Needs: Triage 🔍`       | `needs triage`     | `FBCA04` | Needs to be reviewed and prioritized                            |
  | `needs-attention`  | `Needs: Attention 👋`    | `needs attention`  | `B60205` | Author or reporter action required                              |
  | `breaking-change`  | `Breaking change 🚨`     | `breaking change`  | `B60205` | Breaks existing behavior; requires a major version              |
  | `hotfix`           | `Hotfix 🔥`              | `hotfix`           | `B60205` | Urgent fix that ships as soon as it merges                      |
  | `release-blocker`  | `Release: Blocker ⛔`    | `release blocker`  | `B60205` | Must land before the next release                               |
  | `release-priority` | `Release: Priority ⭐`   | `release priority` | `0E8A16` | Wanted in the next release more than the rest; can still be cut |
  | `release-stretch`  | `Release: Stretch 🍒`    | `release stretch`  | `C2E0C6` | Nice to have in the next release; pushed if it misses           |
  | `ready`            | `Status: Ready ▶️`       | `ready`            | `006B75` | Approved and ready to merge                                     |
  | `blocked`          | `Status: Blocked ⛔`     | `blocked`          | `006B75` | Blocked on another change or an outside factor                  |
  | `autopilot`        | `Status: Autopilot 🤖`   | `autopilot`        | `000000` | AI drives this PR to merge, escalating only decisions           |
  | `wip`              | `Status: WIP 🚧`         | `wip`              | `000000` | Someone is working on this now; automation skips it             |
  | `paused`           | `Status: Paused ⏸️`      | `paused`           | `000000` | On hold; automation skips it                                    |
  | `duplicate`        | `Resolution: Duplicate`  | `duplicate`        | `000000` | Duplicate of another issue or PR                                |
  | `wont-fix`         | `Resolution: Won't fix`  | `wontfix`          | `000000` | Will not be worked on                                           |
  | `invalid`          | `Resolution: Invalid`    | `invalid`          | `000000` | Not a valid issue or request                                    |
  | `good-first-issue` | `Good first issue 🏆`    | `good first issue` | `5319E7` | Approachable for newcomers                                      |
  | `help-wanted`      | `Help wanted ✨`         | `help wanted`      | `5319E7` | Outside contributions welcome                                   |
  | `bug`              | `Type: Bug 🐛`           | `bug`              | `FFFFFF` | Something isn't working                                         |
  | `feature`          | `Type: Feature 💎`       | `enhancement`      | `FFFFFF` | New feature or improvement                                      |
  | `documentation`    | `Type: Documentation 📃` | `documentation`    | `FFFFFF` | Documentation changes                                           |
  | `question`         | `Type: Question ❓`      | `question`         | `FFFFFF` | Further information is requested                                |

  GitHub's `dependencies` label is not in the catalog, so Dependabot keeps applying it unchanged.

## Architecture Constraints

None

## External Dependencies

- GitHub CLI (`gh`) — signed in for the target repository
