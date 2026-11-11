# Design Decisions: Pull Request Workflow

> [INSTRUCTIONS]
> Record design rationale — what was decided, why, and what was rejected. Created when significant decisions are made during any phase (spec, planning, implementation). Each H2 is one decision.
>
> - Feature decisions → `.xe/features/{feature-id}/design-decisions.md`
> - Product/architecture decisions → `.xe/features/design-decisions.md`

## Ask the user when a pending review blocks replies

**Decision**: When the executing account has an unsubmitted review on the PR, ask the user to submit or discard it, continue with one unthreaded comment, or cancel. Review and loop offer only submit/discard or cancel.

**Date**: 2026-10-20

**Why**: GitHub allows one pending review per user per PR, so every threaded reply and every new review fails with `422` until the draft is cleared. The draft belongs to the user, and clearing it restores threading, so the user should decide rather than the agent assuming a degraded path. Review and loop post reviews, which an unthreaded comment can't replace.

**Rejected**:

- **Always degrade to an unthreaded comment**: Assumes the user's intent and loses thread placement when a one-click fix exists.
- **Retry with backoff**: The `422` is a state conflict, not a transient fault.
- **Submit or discard the draft automatically**: Publishes or destroys the user's unsent comments.

**Evidence**: Observed during `/catalyst:pr-update 126` — every reply returned `422` `user_id can only have one pending review per pull request`.

## Detect with a PENDING-filtered reviews count

**Decision**: Add `reviews(states: [PENDING], first: 1) { totalCount }` to the existing thread query.

**Date**: 2026-10-20

**Why**: GitHub shows pending reviews only to their author, so any count above zero is the executing account's draft. No login comparison, no pagination, no extra round trip.

**Rejected**:

- **Fetch all reviews and compare `author.login` to `viewer.login`**: More tokens and needs pagination past 100 reviews.

## Let the PR author turn on Autopilot with a `#autopilot` comment

**Decision**: Reconcile applies the Autopilot label when the PR author writes a line of only hashtags that includes `#autopilot` in a top-level PR comment or a submitted review. `github-pr-get` finds the request; the YAML playbook applies the label. No config switch.

**Date**: 2026-11-10

**Why**: Humans apply Autopilot, and this lets the author do it from the comment box. Agents post under the author's login, so login alone proves nothing; the AI-prefix and quote rules stop an agent reply that mentions the tag. A hashtag-only line keeps an accidental trigger unlikely. Reconcile reads every comment on each run, so a request older than the label's last removal is ignored, or a person who removed the label would see it come back.

**Rejected**:

- **Match `#autopilot` anywhere in the text**: A sentence about Autopilot would turn it on.
- **Read inline comments and thread replies**: Easy to trigger by accident while answering a reviewer.
- **Allow anyone with write access**: Autopilot lets automation merge; only the author opts a PR in.
- **A config switch to turn it off**: Only the author can trigger it, with a deliberate line; a repository without the Autopilot label already skips it.
- **A `dry-run` input**: The engine's `--what-if` mode already previews a playbook.
