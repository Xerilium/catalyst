---
triggers:
  - event: pull_request_review
    action: submitted
  - event: pull_request_review_comment
    action: created
  - event: pull_request_review_comment
    action: edited
  - event: issue_comment
    action: created
    args:
      issue_type: pull_request
  - event: issue_comment
    action: edited
    args:
      issue_type: pull_request
---

# Playbook: Update Pull Request

Analyzes PR feedback, implements agreed changes, and posts responses. Discussion and questions can be posted autonomously, but implementation changes require user approval.

**CRITICAL**: This playbook MUST run to completion. Success is 0 threads needing replies. If work remains after a phase, state progress and ask if you should continue. Never stop without completing ALL work or explicitly asking to continue with a concise status showing threads remaining.

## Inputs

- **pr-number** (optional) — GitHub PR number to update. If omitted, resolved via Phase 0.
- **ai-platform** (optional) — AI platform name for comment prefixes. Defaults to "AI".

## Process

### Phase 0: Resolve PR Number

If `pr-number` known, go to Phase 1

1. Check session context for PR
   - If multiple → execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to ask "Which PR to update?", list each (number, title)
2. If no context → query your 4 most recent open PRs:

   ```bash
   gh pr list --author @me --state open --limit 4 --json number,title,headRefName
   ```

   Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to ask "Which PR to update?", list each (number, title)
   If none, ask user for PR number

### Phase 1: Setup

1. **Verify PR:** `gh pr view {pr-number} --json number,title,body,state,baseRefName,headRefName,url`
2. **Check for uncommitted changes** before any branch operations — if present, stop, ask user how to handle, then ask them to re-run this command. DO NOT continue.
3. **Check out PR branch:** `gh pr checkout {pr-number}` — then verify with `git branch --show-current` that it matches the PR's `headRefName`. If not, stop and ask the user.
4. **Create tracking todo list**

### Phase 2: Research

1. **Fetch PR information:** `gh pr view {pr-number} --json number,title,body,author,reviews,comments`

2. **Fetch review threads.** Determine repo owner/name from local git context (`gh repo view --json owner,name`), then query:

   ```bash
   gh api graphql -F owner='{repo-owner}' -F repo='{repo-name}' -F pr={pr-number} -f query='
   query($owner: String!, $repo: String!, $pr: Int!) {
     repository(owner: $owner, name: $repo) {
       pullRequest(number: $pr) {
         reviewThreads(first: 100) {
           nodes {
             isResolved
             comments(first: 50) {
               nodes {
                 databaseId
                 author { login }
                 body
                 path
                 line
                 createdAt
               }
             }
           }
         }
       }
     }
   }'
   ```

   From thread data, identify threads where the latest reply is from a user (not `⚛️ [Catalyst]`). Track: thread preview, `#force-accept` tags, file/line context, comment `databaseId` values.

3. **Check for unresponded threads** — if none, summarize PR state and stop.

4. **Read project context** — `CLAUDE.md` and referenced guidelines, `.xe/features/` specs and `.xe/rollouts/` rollout plans if applicable, linked issues if referenced.

### Phase 3: Classification

For each thread requiring a response, read relevant source files and classify:

- **✅ Routine** — High confidence, low risk (typos, whitespace, dead code, lint). Batch into single approval.
- **🔧 Targeted** — Clear fix with nuance (logic bugs, missing guards, logging). Group by type.
- **💬 Complex** — Judgment calls (push-backs, architecture, scope). Group by root issue.

### Phase 4: User Consultation

Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to present classified PR feedback for approval — use tier emoji and `[Q{n}/{total}]` prefix; pack up to 4 questions per call.

- **✅ Routine:** Batch all into one question. Options: "Approve all (Recommended)", "Break down by type", "Review individually".
- **🔧 Targeted:** One question per item/group. Options: recommended fix "(Recommended)", alternative(s), "Need more context", "Defer to Q&A".
- **💬 Complex:** One question per item/group. Options: recommended response "(Recommended)", alternative(s), "Need more context", "Defer to Q&A".

**≤4 items:** Present all directly (skip summary). **>8 items:** Start with summary round per tier, then drill down as requested.

**Escalation:**

- "Need more context" → provide detail, re-present options. If explanation needs code blocks or structured content, write to console and ask user to type choice (AUQ hides console output).
- "Defer to Q&A" → pause AUQ, present inline, freeform conversation until resolved, then resume.

### Phase 5: Execute

1. **Post autonomous responses first** — questions and needs-discussion replies do not require user approval.
2. **Implement approved changes** following project conventions. Track explicitly changed files. Includes batch-approved routine fixes.
3. **Response templates** — every response MUST use `⚛️ [Catalyst][{ai-platform}]` prefix. NOTE: GitHub attributes comments to the executing user's `gh` token; the `⚛️ [Catalyst]` body marker is the only signal that the comment came from Catalyst (commit-style `Co-authored-by` trailers do not apply to comments).
   - **✅ Implemented** — brief summary if deviating from request
   - **🤔 Needs discussion** (post autonomously) — concerns and alternative. Include: `Reply with #force-accept if you'd like me to implement this anyway.`
   - **✅ Force-accepted** — implemented as requested, note original concern
   - **❓ Question** (post autonomously) — clarifying question(s)
4. **Post replies** using `databaseId` from thread query. Use the _original_ comment ID, not a reply's ID. Every response MUST result in action — never acknowledge without acting.
   - Review comments: `gh api repos/{owner}/{repo}/pulls/{pr-number}/comments/<comment-id>/replies -f body="<response-body>"`
   - General PR comments: `gh pr comment {pr-number} --body "<comment-body>"`

### Phase 6: Validate

Only if implementation changes were made:

1. **Run relevant tests** from `CLAUDE.md`. Focus on changed files — full suite only if changes are broad.
2. Tests MUST have no errors. Tests SHOULD have no warnings.
3. If tests fail, fix before proceeding. If the fix changes approach, update the corresponding PR reply.

### Phase 7: Review and Commit

Only if implementation changes were made:

1. **Summarize all file changes** and ask user to review before committing. DO NOT stage, commit, or push until approved.
2. **After approval:** ‼️▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-commit.md with:
   - `feature-id` = single feature ID when all changed files belong to one feature (or `init` / `blueprint` for those datasets); OMIT when PR feedback spans multiple features
   - `files` = the explicit list of files changed addressing this PR feedback
   - `description` = `Address PR #{pr-number} feedback` plus a short summary of what changed
   - `extra-trailers` = one `Co-authored-by: {reviewer} <{reviewer}@users.noreply.github.com>` line per reviewer whose feedback was addressed, plus `Co-authored-by: {ai-platform} <{ai-platform-email}>` for the executing AI platform
3. **Push:** `git push`
4. **Review PR body** — see Phase 8
5. **Post summary comment:**

   ```markdown
   ⚛️ [Catalyst][{ai-platform}] **PR Update Summary**

   **Addressed:** {count} thread(s)

   - ✅ Implemented: {count}
   - 🤔 Needs discussion: {count}
   - ❓ Questions: {count}

   {Brief summary of key changes}
   ```

### Phase 8: PR Body Review

Only if implementation changes were made:

1. **Fetch current PR body:** `gh pr view {pr-number} --json body --jq .body`
2. **Assess accuracy** — compare against branch state (changed files, commit message, scope of changes). Ask: does the body still correctly describe what this PR does?
3. **If accurate** → skip silently, no message to user
4. **If updates needed:**
   - Draft revised body: succinct and high-level; remove unnecessary detail; don't add details beyond what the change warrants
   - Update: `gh pr edit {pr-number} --body "{revised-body}"`
   - Report: "Updated PR body for accuracy"

## CLI Reference

| Command                                                        | Purpose                                             |
| -------------------------------------------------------------- | --------------------------------------------------- |
| `gh pr list --author @me --state open --limit 4 --json ...`    | List your recent open PRs (discovery)               |
| `gh pr view {pr} --json ...`                                   | PR details                                          |
| `gh pr view {pr} --json body --jq .body`                       | Fetch PR body for accuracy review                   |
| `gh pr edit {pr} --body "{body}"`                              | Update PR body                                      |
| `gh pr checkout {pr}`                                          | Check out PR branch                                 |
| `gh api graphql -f query='...'`                                | Fetch review threads with comment IDs               |
| `gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies` | Reply to review comment (use original `databaseId`) |
| `gh pr comment {pr} --body "..."`                              | Post general PR comment                             |

## Error Handling

- **PR not found:** Verify PR number and `gh` CLI authentication
- **Permission denied:** Check push access to PR branch
- **API errors:** Retry with backoff for transient failures
- **Merge conflicts:** Stop and notify user; do not force push

## Success Criteria

- [ ] All threads have responses with `⚛️ [Catalyst]` prefix
- [ ] User approved implementation plan before file changes
- [ ] Agreed changes are implemented
- [ ] Tests pass with no errors
- [ ] User approved changes before commit
- [ ] Only explicitly changed files staged and committed
- [ ] Changes pushed (only after user approval)
- [ ] Commit created via workflow-commit with reviewer + AI platform `Co-authored-by` trailers in `extra-trailers`
- [ ] PR body reviewed for accuracy; updated if needed (succinct, high-level)
- [ ] Summary comment posted to PR
- [ ] No instruction placeholders remain in responses
