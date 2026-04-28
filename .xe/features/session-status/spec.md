---
id: session-status
title: Session Status
description: Ad-hoc, read-only session re-orientation surface for developers juggling parallel AI sessions.
dependencies:
  - context-storage
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: Session Status

## Purpose

Provide a lightweight, on-demand session re-orientation surface so a developer juggling parallel AI sessions can quickly recover context without re-reading the full conversation. This feature defines the read-only check-in capability; it does not mutate state or persist anything.

## Scenarios

### FR:checkin: Session Check-in

Developer needs to invoke a quick status command ad hoc and receive a fixed-shape status snapshot so they can re-orient in a session in seconds.

- **FR:checkin.input** (P2): Session context — accumulated conversation, file edits, tool calls, and any Catalyst identifiers (initiative, rollout, feature) inferable from the session
- **FR:checkin.read-only** (P1): Command MUST NOT write files, run state-changing tools, or invoke AUQ — the entire response is the output
- **FR:checkin.output** (P2): Status report with these lines in order: header (initiative / rollout / feature / generic 1-5 word description), Goal, Working on, Progress, Blockers, Next, Files
- **FR:checkin.slash-command** (P2): Interface: `slash-command` — `/sitrep` published via the AI provider command pipeline
  > - @req FR:ai-provider/commands.generate

## Data Model

None

## Architecture Constraints

None

## External Dependencies

None
