---
features: [pull-request-workflow]
status: in-progress
created: 2026-10-01
last_updated: 2026-10-01
---

<!-- markdownlint-disable no-duplicate-heading -->

# Rollout: pr-pending-review-handling

## Active State

**Model**: A pending (unsubmitted) review owned by the `gh` token's account blocks every threaded reply on a PR. Detect it in Research from data already fetched; fall back to one consolidated general comment in Execute.

**Decisions**:

- Detect via `viewer { login }` + `reviews.nodes[].state` added to the existing GraphQL query — no extra API call
- Warn and continue rather than stop; the work still completes, just unthreaded
- Branched from `origin/main`, not the session branch — that branch carries 2 unrelated req-traceability commits that must not land in this PR

**Open**: none

**Next**: Phase 4 — commit, push, open PR

**Pins**:

- `src/resources/playbooks/update-pull-request.md:94` — pending-review check in Phase 2
- `src/resources/playbooks/update-pull-request.md:214-215` — the two Error Handling cases

**Assumptions**:

- `viewer.login` from GraphQL is the same account `gh api` posts replies as

## Overview

The `update-pull-request` playbook does not mention a GitHub failure that makes every threaded reply impossible: `POST .../comments/{id}/replies` returns `422 Validation Failed` with `user_id can only have one pending review per pull request` when the `gh` token's account has an unsubmitted draft review open. The replies endpoint needs a new pending review to hold the reply, and GitHub permits one per user per PR. Retrying never succeeds.

Observed during `/catalyst:pr-update 126`. A companion symptom: comments belonging to a pending review are visible to the GraphQL `reviewThreads` query but return `404` from REST `pulls/comments/{id}`, so a thread can surface in research and then be unreachable for reply.

This rollout documents both symptoms, adds cheap up-front detection, and specifies the consolidated-general-comment fallback.

## Run 1: Document pending-review failure and fallback

> **Execute**: `/catalyst:change pull-request-workflow — add 422 pending-review handling, detection, and consolidated-comment fallback to update-pull-request.md`

### Features

#### pull-request-workflow

- [x] Spec: add `FR:update.research.pending-review` (P2) for detection
- [x] Spec: add `FR:update.execute.reply.fallback` (P2) for the consolidated comment
- [x] Tests: cover both FRs in `tests/playbooks/features/pull-request-workflow.test.ts`
- [x] Playbook: add `viewer { login }` and `reviews.nodes[].state` to the Phase 2 GraphQL query
- [x] Playbook: add Phase 2 step 3 pending-review check; renumber following steps
- [x] Playbook: add Error Handling cases for the 422 and the REST 404
- [x] Playbook: point the Phase 5 reply step at the fallback
- [x] Playbook: update CLI Reference and Success Criteria
- [x] Sibling check: `loop-pull-request.md` — added one line routing the draft review to the end-of-loop AUQ instead of stopping mid-loop
- [x] Sibling check: `playbooks/actions/` — no PR-reply action exists; nothing to update

### Post-implementation

- [x] `npx jest tests/playbooks` passes
- [x] `npx catalyst traceability pull-request-workflow` at 100%
- [ ] Present work for review
- [ ] Route external issues discovered during implementation

## Notes

**Downstream impact**: `npx catalyst deps pull-request-workflow --reverse` — no reverse dependencies. No downstream specs to update.

**Traceability at scope time**: feature was 100% across P1–P4 before this change. Two pre-existing parse warnings (`AC:markdown-playbooks`, `AC:auq-standard` — "unknown requirement type AC") are excluded from coverage and out of scope here.

**Spec/implementation divergence found, not fixed**: the spec says replies go via `npx catalyst-github pr reply` and threads via `pr threads`, but the playbook calls `gh api` directly and `src/resources/playbooks/github.ts` is a deprecated stub that throws on every function. `src/resources/playbooks/update-pull-request.yaml` also still references a `github-pr-reply` engine action though `AC:markdown-playbooks` makes the markdown playbook canonical. Needs separate triage — if the CLI lands, this 422 handling belongs inside it rather than in playbook prose.

**Process deviation**: the Phase 0 scope AUQ was skipped. The user supplied scope in the invocation and then directed execution mode (`run autonomous`) and closeout (`create the PR when done`) mid-run, leaving nothing for the AUQ to decide.

**Work was drafted before the playbook ran**: edits existed on the session branch before `/catalyst:change` was invoked, so Phase 3 verified them against the spec rather than writing them TDD-first. Tests were written after the playbook edits, not before.

## Final Review

- [ ] Confirm all runs complete — no unchecked tasks, no unresolved blockers in Notes
- [ ] Clean up temporary files and this rollout plan
- [ ] Close out — commit, PR, or defer
