---
id: cli-clean
title: CLI Clean
description: Deterministic, dry-run-first cleanup of stale git clones, worktrees, branches, and sessions under a folder.
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

- **FR:inventory.@cli** (P1): Interface: `catalyst clean --root <dir> [--repos <filter>] [--out <csv>] [--apply]`
  > - @req FR:cli-engine/cli.entry
- **FR:inventory.@playbook** (P2): Interface: playbook `clean-workspace`
  > - @req FR:playbook-definition/types.playbook.interface
- **FR:inventory.input** (P2):
  - Root folder (string) — required; folder containing git clones and worktrees
  - Repo filter (string) — optional; only repos whose slug contains this text
  - Output path (string) — optional; default `.xe/runs/clean-inventory.csv`
  - Apply (boolean) — optional; default false
- **FR:inventory.read-only** (P1): CLI MUST NOT modify, remove, archive, or move any file, branch, worktree, or session other than the output CSV
- **FR:inventory.apply-refused** (P1): CLI MUST fail with a clear error when `apply` is true, until an apply-capable phase exists
- **FR:inventory.discover** (P1): CLI MUST list every primary clone and linked worktree under the root, one row each
- **FR:inventory.git-state** (P1): CLI MUST record per row its repo, branch, folder, uncommitted count, unpushed count, and last commit date
- **FR:inventory.pr-state** (P2): CLI SHOULD record PR number and state (OPEN, MERGED, CLOSED, none) per branch via `gh`
- **FR:inventory.degraded** (P2): CLI MUST continue with blank PR state and a warning when `gh` is missing or unauthenticated
- **FR:inventory.output** (P1): CSV with header `repo,primary,type,branch,folder,pr,pr_state,uncommitted,unpushed,last_commit,remove_candidate`

### FR:report: Phase-B Removal Report

Developer needs a dry-run table of worktrees safe to remove so that disk can be reclaimed after human review.

- **FR:report.input** (P2): Inventory rows (@req FR:$inventory-row)
- **FR:report.safe-candidate** (P1): CLI MUST mark a worktree a candidate only when its PR state is MERGED or CLOSED
  - **FR:report.safe-candidate.clean** (P1): CLI MUST mark a worktree a candidate only when it is not primary, has no uncommitted changes, and has no unpushed commits
- **FR:report.never** (P1): CLI MUST NOT mark dirty, unpushed, open-PR, primary-clone, or unknown-state rows as candidates
- **FR:report.flagged** (P2): CLI MUST list dirty or unpushed rows separately as flagged for human or AI triage
- **FR:report.size** (P3): CLI SHOULD sum folder size of candidates
- **FR:report.output** (P1): Terse table of candidates, plus counts of candidates, flagged, and total GB

## Data Model

- **FR:$inventory-row** (P2): **`InventoryRow`** — One clone or worktree found under the root.
  - `repo` (string) — Repo slug
  - `primary` (boolean) — True for the primary clone
  - `type` (string) — Row kind
    - Allowed: clone, worktree
  - `branch` (string) — Checked-out branch
  - `folder` (string) — Absolute folder path
  - `pr` (string) — PR number, blank when none
  - `prState` (string) — PR state, blank when unknown
    - Allowed: OPEN, MERGED, CLOSED, none
  - `uncommitted` (number) — Count of uncommitted changes
  - `unpushed` (number) — Count of unpushed commits; blank when no upstream
  - `lastCommit` (string) — Last commit date

## Architecture Constraints

None.

## External Dependencies

None.
