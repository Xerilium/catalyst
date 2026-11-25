---
id: session-status
title: Session Status
description: Ad-hoc, read-only session re-orientation surface for developers juggling parallel AI sessions.
dependencies:
  - ai-plugin
---

<!-- markdownlint-disable single-title -->

# Feature: Session Status

## Purpose

Provide a lightweight, on-demand session re-orientation surface so a developer juggling parallel AI sessions can quickly recover context without re-reading the full conversation. This feature defines the read-only check-in capability; it does not mutate state or persist anything.

## Scenarios

### FR:checkin: Session Check-in

Developer needs to invoke a quick status command ad hoc and receive a short, current status snapshot so they can re-orient in a session in seconds.

- **FR:checkin.@ai-skill** (P2): Interface: `/catalyst:sitrep [tldr]` published as a Catalyst plugin skill
  > - @req FR:ai-plugin/skills.generate
- **FR:checkin.input** (P2): Session context and live state — conversation, file edits, tool calls, Catalyst identifiers (initiative, rollout, feature), git state, PR and CI state, task state, and files; optional bare `tldr` mode argument
- **FR:checkin.fresh** (P1): Sitrep MUST read live state in every run before it reports
  - **FR:checkin.fresh.sources** (P1): Sitrep MUST read the git, PR, CI, task, and file state the report names
  - **FR:checkin.fresh.no-reuse** (P1): Sitrep MUST NOT use memory or an earlier report as a status source
  - **FR:checkin.fresh.unknown** (P1): Sitrep MUST report a value as unknown when its live read fails
- **FR:checkin.read-only** (P1): Sitrep MUST NOT write files, run state-changing tools, or invoke AUQ
- **FR:checkin.resume** (P2): Agent MUST continue in-flight session work after the report
- **FR:checkin.comms** (P1): Sitrep MUST write the report in Simplified Technical English with no recap
  - **FR:checkin.comms.paragraph** (P1): Sitrep MUST keep each paragraph under 20 words
  - **FR:checkin.comms.bullet** (P1): Sitrep MUST keep each bullet under 10 words
  - **FR:checkin.comms.total** (P1): Sitrep MUST keep the full report under 100 words
  - **FR:checkin.comms.pr-link** (P1): Sitrep MUST write each PR as `[{number}]({full-url})`
  - **FR:checkin.comms.blocked** (P2): Sitrep MUST start a blocker on the developer with `Need your {ack|response|...}...`
  - **FR:checkin.comms.waiting** (P2): Sitrep MUST write only `...` while the same ask still waits for a reply
  - **FR:checkin.comms.new-ask** (P2): Sitrep MUST put a new ask after `---` as a separate message under the same limits
- **FR:checkin.output** (P2): Full report: header (initiative / rollout / feature / generic 1-5 word description), Goal, Working on, Progress, Blockers, Next, Files
- **FR:checkin.tldr** (P2): Short report for `tldr` mode: header, Now, Next, and a blocker line only when blocked; under 50 words

## Data Model

None

## Architecture Constraints

None

## External Dependencies

None
