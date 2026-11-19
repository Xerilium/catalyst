---
id: cli-clean
title: CLI Clean
description: Deterministic, dry-run-first cleanup of stale git clones, worktrees, branches, and sessions across a developer's dev folder.
dependencies:
  - cli-engine
  - playbook-definition
---

<!-- markdownlint-disable single-title -->

# Feature: CLI Clean

## Purpose

Give developers running many parallel AI sessions a safe, repeatable way to find and reclaim stale clones, worktrees, branches, and sessions without spending AI tokens on deterministic work. Nothing is removed, archived, or moved without explicit opt-in.

## Scenarios

### FR:inventory: Workspace Inventory

Developer needs a read-only inventory of every clone and worktree under a root folder so that cleanup candidates can be reviewed before anything is removed.

- **FR:inventory.@cli** (P1): Interface: `catalyst clean [--root <dir>] [--repos <filter>] [--out <csv>] [--apply]`
  > - @req FR:cli-engine/cli.entry
- **FR:inventory.@playbook** (P2): Interface: playbook `clean-workspace` with inputs `apply` (boolean, default false), `root` (default `~/dev`), `repos` (optional), `inventory-path` (default `.stack/clones.csv`)
  > - @req FR:playbook-definition/types.playbook.interface
- **FR:inventory.input** (P2): Root folder containing git clones and worktrees; optional repo filter
- **FR:inventory.read-only** (P1): System MUST NOT modify, remove, archive, or move any file, branch, worktree, or session
- **FR:inventory.apply-refused** (P1): System MUST fail with a clear error when `apply` is true, until an apply-capable phase exists
- **FR:inventory.discover** (P1): System MUST list every primary clone and linked worktree under the root, one row each
- **FR:inventory.git-state** (P1): System MUST record per row: repo, branch, folder, uncommitted count, unpushed count, last commit date
- **FR:inventory.pr-state** (P2): System SHOULD record PR number and state (OPEN, MERGED, CLOSED, none) per branch via `gh`
- **FR:inventory.degraded** (P2): System MUST continue with blank PR state and a warning when `gh` is missing or unauthenticated
- **FR:inventory.output** (P1): CSV with header `repo,primary,type,branch,folder,pr,pr_state,uncommitted,unpushed,last_commit,remove_candidate`

### FR:report: Phase-B Removal Report

Developer needs a dry-run table of worktrees safe to remove so that disk can be reclaimed after human review.

- **FR:report.input** (P2): Inventory rows
- **FR:report.safe-candidate** (P1): System MUST mark a worktree a candidate only when clean, not primary, has no unpushed commits, has a known PR state, and that state is MERGED or CLOSED
- **FR:report.never** (P1): System MUST NOT mark dirty, unpushed, open-PR, primary-clone, or unknown-state rows as candidates
- **FR:report.flagged** (P2): System MUST list dirty or unpushed rows separately as flagged for human or AI triage
- **FR:report.size** (P3): System SHOULD sum folder size of candidates
- **FR:report.output** (P1): Terse table of candidates, plus counts of candidates, flagged, and total GB
