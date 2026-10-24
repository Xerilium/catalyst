---
id: native-label-actions
status: in-progress
last_updated: 2026-10-24
---

# Rollout: Native label actions

## Active State

- **Model**: Label actions call `gh` with an argument list (no shell), so they run on Windows cmd without Git Bash; the existing actions' single-quote escaping does not.
- **Decisions**: Three actions (list/create/edit) — rejected one `github-label-sync` action because create vs. rename is playbook policy. Owner/name resolved through the base class's cached `gh repo view` — rejected a separate `github-repo` step since the action needs no more than that.
- **Open**: None
- **Next**: Phase 4 review; open draft PR against `claude/project-thread-cwv89d` (PR 133)
- **Pins**: `src/playbooks/actions/git/base.ts` — `executeGh`; `src/resources/playbooks/sync-repo-labels.yaml` — label read + apply steps
- **Assumptions**: PR 133 merges before this one; base is its branch.

## Overview

Add `github-label-list`, `github-label-create`, `github-label-edit` to `playbook-actions-git`; switch `sync-repo-labels` off `bash` so label sync works on Windows without Git Bash or WSL.

## Features

#### playbook-actions-git

- [x] Spec `FR:labels.*`
- [x] Tests, then code for the three actions

#### repo-labels

- [x] Switch `sync-repo-labels.yaml` to the native actions; write config with `file-write`
- [x] Remove "Native label actions" from `.xe/features/repo-labels/feedback.md`

## Notes

- Downstream impact: new FRs only; no existing FR changed.
