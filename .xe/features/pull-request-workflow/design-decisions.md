# Design Decisions: Pull Request Workflow

> [INSTRUCTIONS]
> Record design rationale — what was decided, why, and what was rejected. Created when significant decisions are made during any phase (spec, planning, implementation). Each H2 is one decision.
>
> - Feature decisions → `.xe/features/{feature-id}/design-decisions.md`
> - Product/architecture decisions → `.xe/features/design-decisions.md`

## Degrade to an unthreaded comment when a pending review blocks replies

**Decision**: When the posting account has an unsubmitted review open, post every thread response in one general PR comment and continue, rather than stopping the workflow.

**Date**: 2026-10-01

**Why**: GitHub permits one pending review per user per PR. The review-comment replies endpoint creates a pending review to hold each reply, so an open draft review makes `POST .../comments/{id}/replies` fail with `422` for every thread, permanently — the condition is owned by a human who may be away, and no retry or backoff clears it. Stopping would strand finished analysis behind someone else's draft review, which is the opposite of the playbook's own rule that it must run to completion. An unthreaded comment loses file-anchored placement but preserves every response, so the degradation is in presentation only. The comment names the cause and asks the user to clear the draft, which restores threading on the next run.

**Rejected**:

- **Stop and ask the user to clear the draft review first**: Correct threading, but blocks all work on an external human action and violates the playbook's run-to-completion rule. Also fails outright under `/catalyst:pr-loop`, which runs unsupervised with nobody to answer.
- **Retry with backoff**: The existing "API errors" case already prescribes this, and it is wrong here. The 422 is a deterministic state conflict, not a transient fault; retrying burns quota and never succeeds. This is why the case says explicitly not to retry.
- **Submit or dismiss the draft review automatically to unblock replies**: Would publish or destroy a human's unsent review comments. Never acceptable without consent.

**Evidence**: Observed during `/catalyst:pr-update 126` — every reply returned `422 Validation Failed`, `{"resource":"PullRequestReview","code":"custom","field":"user_id","message":"user_id can only have one pending review per pull request"}`.

## Detect the pending review from the existing thread query

**Decision**: Add `viewer { login }` and `reviews(first: 100) { nodes { state author { login } } }` to the Phase 2 GraphQL query already being run, and compare them in-place.

**Date**: 2026-10-01

**Why**: Detection is only worth having if it costs nothing. The research phase already issues one GraphQL call for review threads; review state and the acting account's login are additional fields on that same call, so the check adds no round trip and no new failure mode. Knowing before the first reply attempt lets the workflow pick the fallback up front instead of discovering the block one 422 at a time across every thread.

**Rejected**:

- **A separate `gh api user` call plus a reviews query**: Two extra round trips for data the existing query can return as fields.
- **Detect reactively, on the first 422 only**: No extra fetch, but the playbook then has to recognize the failure mid-posting and unwind partial work. Up-front detection makes the fallback a decision rather than a recovery. The reactive path is kept as a backstop anyway, since a draft review can be opened after research runs.
