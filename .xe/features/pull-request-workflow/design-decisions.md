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

## Turn on Autopilot and ask for information with hash commands

**Decision**: People steer a PR with hashtags on a line of their own in a top-level comment or review: `#autopilot` from the author applies the Autopilot label; `#needs-info` from anyone else asks the author for information. `github-pr-get` finds the hashtags; the reconcile playbook decides what they do.

**Date**: 2026-11-14

**Why**: Agents post under the author's login, so login alone can't tell a person from an agent; the AI-prefix and quote rules stop an agent reply that mentions a tag. Reconcile reads every comment on each run, so a hash command older than the undo of its change is ignored; otherwise a label someone removed would come back. Playbook expressions can't parse text, so the action finds the hashtags.

**Rejected**:

- **Match a hashtag anywhere in the text**: A sentence about Autopilot would turn it on.
- **Read inline comments and thread replies**: Easy to trigger by accident while answering a reviewer.
- **Let anyone with write access turn on Autopilot**: Autopilot lets automation merge; only the author opts a PR in.
- **A config switch to turn hash commands off**: Each one needs a deliberate line, and a repository without the label already skips it.
- **Decide who may run a hash command in `github-pr-get`**: The action reports facts; reconcile owns the rules.
- **Keep Needs Attention from `#needs-info` until someone removes it**: The author would have to remove it by hand after answering.

## Check the Autopilot merge gates from one table

**Decision**: The Autopilot playbook lists its merge gates in one table, each with its code and message, and checks them in order. Both the Autopilot and merge playbooks return their result as `code` and `message` outputs.

**Date**: 2026-11-14

**Why**: Adding or changing a gate is one table row. A playbook or function caller gets only the outputs of the call, not the code and message its `return` sets, so the result has to go in the outputs (#245).

**Rejected**:

- **One expression for every gate**: Hard to read and change.
- **One `if` and `return` per gate**: Repeats the same three lines for each gate.
- **A function per gate type**: A `return` inside a function ends only that function, so the caller would still need an `if` per gate.
- **Set `code` and `message` on `return` only**: No caller can read them.
