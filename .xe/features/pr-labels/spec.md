---
id: pr-labels
title: PR Labels
description: Standard pull request labels, resolved from the repo's own usage, so PR automation can mark and track work state.
dependencies:
  - cli-engine
  - context-storage
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: PR Labels

## Purpose

Define the standard pull request labels that Catalyst automation needs to mark and track work state (work in progress, paused, blocked, and so on), discover which naming convention a repository already uses, and resolve each label's semantic id to the repository's actual label name. Excludes applying labels to pull requests; callers decide when to label.

## Scenarios

### FR:catalog: Label catalog

Project Maintainer needs one standard set of labels so that PR automation behaves the same in every repository.

- **FR:catalog.@function** (P1): Interface: `LABEL_CATALOG` in `src/core/labels/catalog.ts`
- **FR:catalog.schema** (P1): Label definition (@req FR:$label-definition)
- **FR:catalog.required** (P1): Label catalog MUST mark these definitions required: `wip`, `paused`, `blocked`, `autopilot`, `ready`, `needs-attention`, `needs-review`, `help-wanted`
  - `wip` — work in progress; automation skips the PR
  - `paused` — deliberately on hold; automation skips the PR
  - `blocked` — cannot proceed until an external dependency clears
  - `autopilot` — an AI agent is driving the PR toward merge
  - `ready` — ready for review or merge
  - `needs-attention` — the owner must act
  - `needs-review` — waiting on a reviewer
  - `help-wanted` — open for contribution
- **FR:catalog.known** (P3): Label catalog SHOULD define these optional known definitions: `finalized`, `needs-triage`, `release-blocker`, `release-priority`, `release-stretch`
- **FR:catalog.ids** (P2): Label catalog MUST give each definition a unique kebab-case semantic id

### FR:naming: Label naming styles

Project Maintainer needs labels in either the simple or the key/value naming style so that Catalyst follows the convention the repository already uses.

- **FR:naming.@function** (P1): Interface: `labelName`, `classifyLabel`, and `matchLabel` in `src/core/labels/naming.ts`
- **FR:naming.input** (P1):
  - Label definition (@req FR:$label-definition)
  - Style (`simple`|`key-value`) — the naming convention
  - Label name (string) — an existing repository label, for classification and matching
- **FR:naming.key-value** (P1): Label namer MUST format a key/value name as `{Group}: {Value} {emoji}`, omitting `{Group}: ` for a definition without a group
- **FR:naming.simple** (P1): Label namer MUST format a simple name as the lower-case simple name without group or emoji
- **FR:naming.emoji-trailing** (P1): Label namer MUST place the emoji after the text in every key/value name
- **FR:naming.classify** (P1): Label classifier MUST report a label name's style and emoji placement
  - **FR:naming.classify.style** (P1): Label classifier MUST report `key-value` for a name with a group prefix or an emoji, and `simple` otherwise
  - **FR:naming.classify.emoji** (P1): Label classifier MUST report emoji placement as `leading`, `trailing`, or `none`
- **FR:naming.match** (P1): Label matcher MUST match a repository label to a definition while ignoring case, emoji, punctuation, and spacing
  - **FR:naming.match.forms** (P1): Label matcher MUST match both the simple and the key/value form of a definition

### FR:discovery: Pattern discovery

Developer needs the repository's labeling pattern resolved from how its labels are actually used so that GitHub's default labels never override the repository's own convention.

- **FR:discovery.@function** (P1): Interface: `discoverPattern` in `src/core/labels/pattern.ts`
- **FR:discovery.input** (P1): Repository labels (@req FR:$repo-label) with their usage counts
- **FR:discovery.usage** (P1): Pattern discoverer MUST weigh each style by the issues and pull requests carrying labels that match a catalog definition
- **FR:discovery.winner** (P1): Pattern discoverer MUST report the style with the higher usage, preferring `key-value` on a tie
- **FR:discovery.key-value-present** (P1): Pattern discoverer MUST report `key-value` when matched key/value labels exist and no matched label has been used
- **FR:discovery.low-use** (P1): Pattern discoverer MUST report `simple` with basis `low-use` and `needsChoice` set when simple labels win with fewer than 5 uses in total
- **FR:discovery.none** (P2): Pattern discoverer MUST report `key-value` with basis `none` when no label matches the catalog
- **FR:discovery.output** (P1): Label pattern (@req FR:$label-pattern)

### FR:resolve: Label resolution

AI Agent needs to turn a semantic label id into the repository's actual label name so that playbooks apply the right label in any repository.

- **FR:resolve.@function** (P1): Interface: `resolveLabel` in `src/core/labels/resolver.ts`
- **FR:resolve.@cli** (P1): Interface: `catalyst labels resolve <id>`
  > - @req FR:cli-engine/cli.entry
- **FR:resolve.input** (P1):
  - Semantic id (string) — a catalog id such as `wip`
  - Repository labels (@req FR:$repo-label)
  - Style (`simple`|`key-value`?) — overrides the discovered style
- **FR:resolve.existing** (P1): Label resolver MUST return the name of the existing repository label that matches the id
  - **FR:resolve.existing.most-used** (P2): Label resolver MUST return the most used label when several match, preferring the one already in the target name
- **FR:resolve.target** (P1): Label resolver MUST return the name formatted in the discovered style when no repository label matches the id
- **FR:resolve.unknown** (P1): Label resolver MUST fail with code `LabelUnknown` and guidance listing valid ids when the id is not in the catalog
  > - @req FR:error-handling/catalyst-error.constructor
- **FR:resolve.output** (P1): Resolved label (@req FR:$resolved-label)
  - **FR:resolve.output.cli** (P2): `catalyst labels resolve` prints the name alone, or the resolved label as JSON with `--json`

### FR:plan: Setup plan

Project Maintainer needs missing labels and inconsistent names identified so that setup changes only what is needed.

- **FR:plan.@function** (P1): Interface: `planLabels` in `src/core/labels/plan.ts`
- **FR:plan.@cli** (P2): Interface: `catalyst labels plan`
  > - @req FR:cli-engine/cli.entry
- **FR:plan.input** (P1):
  - Repository labels (@req FR:$repo-label)
  - Style (`simple`|`key-value`) — the target naming convention
- **FR:plan.create** (P1): Setup planner MUST plan creation of each required definition that has no matching repository label
  - **FR:plan.create.optional** (P2): Setup planner MUST NOT plan creation of optional definitions
- **FR:plan.rename** (P1): Setup planner MUST plan a rename for each matching label whose name differs from its target name
  - **FR:plan.rename.reason** (P2): Setup planner MUST tag each rename with reason `emoji-placement`, `style`, or `format`
  - **FR:plan.rename.optional** (P2): Setup planner MUST plan renames for matching optional labels
- **FR:plan.duplicates** (P2): Setup planner MUST report additional labels matching one definition as duplicates and MUST NOT rename them
  - **FR:plan.duplicates.primary** (P2): Setup planner MUST treat the label already named as the target, else the most used, as the primary
- **FR:plan.output** (P1): Label plan (@req FR:$label-plan)
  - **FR:plan.output.cli** (P2): `catalyst labels plan --json` prints the discovered pattern and the plan

### FR:adapter: GitHub label adapter

Developer needs label reads and writes to go through the GitHub CLI so that no token handling or HTTP code is needed.

- **FR:adapter.@function** (P1): Interface: `createGhLabelAdapter` in `src/core/labels/github.ts`
- **FR:adapter.usage** (P1): GitHub adapter MUST read every repository label with the count of issues and pull requests that carry it
- **FR:adapter.create** (P1): GitHub adapter MUST create a label with its name, color, and description
- **FR:adapter.rename** (P1): GitHub adapter MUST rename a label in place so that existing assignments are preserved
- **FR:adapter.unavailable** (P2): GitHub adapter MUST fail with code `LabelGitHubUnavailable` and remediation guidance when `gh` is missing, unauthenticated, or the directory is not a GitHub repository
  > - @req FR:error-handling/catalyst-error.constructor

### FR:setup: Label setup

Project Maintainer needs one command that sets up the standard labels so that PR automation works in a new repository.

- **FR:setup.@function** (P1): Interface: `setupLabels` in `src/core/labels/setup.ts`
- **FR:setup.@cli** (P1): Interface: `catalyst labels setup`
  > - @req FR:cli-engine/cli.entry
- **FR:setup.input** (P1):
  - Style (`simple`|`key-value`?) — overrides discovery
  - Non-interactive (boolean) — never prompt; Default: `false`
  - Rename (boolean) — apply planned renames without confirmation; Default: `false`
- **FR:setup.style** (P1): Setup command MUST use the style input when given and otherwise the discovered pattern
- **FR:setup.create** (P1): Setup command MUST create each planned label with the catalog's color and description
- **FR:setup.rename** (P1): Setup command MUST apply planned renames only after the user confirms or `rename` is set
  - **FR:setup.rename.report** (P2): Setup command MUST list unapplied renames in its output
- **FR:setup.idempotent** (P1): Setup command MUST make no change when every required label exists and no rename is planned
- **FR:setup.no-delete** (P1): Setup command MUST NOT delete labels
- **FR:setup.skip** (P1): Setup command MUST exit successfully with a notice, changing nothing, when the GitHub adapter is unavailable
- **FR:setup.output** (P2): Setup result (@req FR:$setup-result)

### FR:ask: Pattern choice

Developer needs to be asked once when the labeling pattern cannot be inferred so that created labels fit the repository's convention without guessing.

- **FR:ask.trigger** (P1): Setup command MUST ask for a style only when the discovered pattern needs a choice, the style input is absent, and a required label is missing
- **FR:ask.cli** (P1): Setup command MUST ask with a simple terminal prompt offering `key-value` as the default
- **FR:ask.tty** (P3): Setup command MAY read the prompt answer from the controlling terminal when standard input is not interactive
- **FR:ask.non-interactive** (P1): Setup command MUST use `key-value` without asking when `non-interactive` is set or no terminal is available
- **FR:ask.ai** (P1): AI Agent MUST ask through the AUQ action, then run `catalyst labels setup --non-interactive --style {choice}`
  > - @req FR:context-storage/standards.auq
  - **FR:ask.ai.@action** (P1): Interface: `src/resources/playbooks/actions/labels-setup.md`
  - **FR:ask.ai.plan** (P1): AI Agent MUST read `catalyst labels plan --json` first and ask only when `needsChoice` is set
  - **FR:ask.ai.renames** (P2): AI Agent MUST ask one AUQ question to approve the planned renames, and pass `--rename` only when approved

## Data Model

- **FR:$label-definition** (P1): **`LabelDefinition`** — A catalog entry for one standard label.
  - `id` (string) — Semantic id, kebab-case
  - `group` (string?) — Key/value group such as `Status`; absent for group-less labels
  - `value` (string) — Display value such as `WIP`
  - `simple` (string) — Lower-case simple name such as `wip`
  - `emoji` (string)
  - `color` (string) — Hex color without `#`
  - `description` (string)
  - `required` (boolean)
- **FR:$repo-label** (P1): **`RepoLabel`** — A label that exists in the repository.
  - `name` (string)
  - `usage` (number) — Issues and pull requests carrying the label
- **FR:$label-pattern** (P1): **`LabelPattern`** — The discovered convention.
  - `style` (string) — Allowed: simple, key-value
  - `basis` (string) — Allowed: usage, present, low-use, none
  - `needsChoice` (boolean) — `true` only for basis `low-use`
  - `usage` (object) — `simple` (number) and `keyValue` (number)
- **FR:$resolved-label** (P1): **`ResolvedLabel`** — The outcome of resolving an id.
  - `id` (string)
  - `name` (string)
  - `exists` (boolean) — `true` when `name` is an existing repository label
- **FR:$label-plan** (P1): **`LabelPlan`** — Changes setup would make.
  - `style` (string) — Allowed: simple, key-value
  - `creates` (LabelDefinition[]) — Each with its target `name`
  - `renames` (object[]) — `id`, `from`, `to`, `reason` (emoji-placement, style, format)
  - `duplicates` (object[]) — `id` and `names`
- **FR:$setup-result** (P2): **`SetupResult`** — What setup did.
  - `style` (string)
  - `created` (string[])
  - `renamed` (object[]) — `from`, `to`
  - `pendingRenames` (object[]) — Planned renames not applied
  - `skipped` (string?) — Reason setup did nothing

## Architecture Constraints

- **AC:pure-core**: Classification, naming, discovery, resolution, and planning MUST be pure functions with no I/O; only the GitHub adapter and the prompt touch the outside world
- **AC:gh-only**: GitHub access MUST go through the `gh` CLI, as in `playbook-actions-git`
- **AC:emoji-trailing**: The standard places the emoji after the label text; leading emoji is a deviation that setup offers to rename

## External Dependencies

- GitHub CLI (`gh`) — authenticated for the target repository
