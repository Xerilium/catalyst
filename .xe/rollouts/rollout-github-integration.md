---
features: [github-integration]
status: planning
created: 2025-11-12
---

# Rollout: github-integration

> This rollout plan acts as the central orchestrator for implementing the GitHub CLI wrapper feature. It coordinates pre-implementation setup, links to feature implementation tasks, manages post-implementation actions, and tracks cleanup.

## Pre-implementation

None - no setup required before implementation.

## Implementation

- [ ] Execute all tasks in [.xe/features/github-integration/tasks.md](.xe/features/github-integration/tasks.md)

## Post-implementation

### Playbook Migration

Migrate existing playbooks from `node node_modules/@xerilium/catalyst/playbooks/scripts/github.js` to new `catalyst-github` CLI:

- [ ] Update start-rollout.md: Replace `--get-issue-with-comments` with `catalyst-github issue get {issue-id} --with-comments`
- [ ] Update start-blueprint.md:
  - Replace `--get-issue-with-comments` with `catalyst-github issue get {issue-id} --with-comments`
  - Replace `--find-open-prs` with `catalyst-github pr find`
- [ ] Update start-initialization.md: Replace `--get-issue-with-comments` with `catalyst-github issue get {issue-number} --with-comments`
- [ ] Update new-blueprint-issue.md: Replace `--get-issue-with-comments` with `catalyst-github issue get {issue-number} --with-comments`
- [ ] Update update-pull-request.md:
  - Replace `--get-pr` with `catalyst-github pr get`
  - Replace `--get-pr-feature` with `catalyst-github pr get-feature`
  - Replace `--find-pr-threads` with `catalyst-github pr threads`
  - Replace `--get-thread-comments` with `catalyst-github pr comments` (get specific thread comments from result)
  - Replace `--post-pr-comment-reply` with `catalyst-github pr reply`

## Cleanup

None - no cleanup actions required.

---

> When rollout is complete:
>
> 1. Mark all tasks as checked
> 2. Delete this rollout file
> 3. Remove entry from .xe/rollouts/README.md
