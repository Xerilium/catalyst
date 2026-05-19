# Playbook: Review Pull Request

Reviews a PR for quality, functional correctness, and alignment with project goals. Posts review comments with actionable suggestions. Does NOT make code changes or commit anything.

## Inputs

- **pr-number** (optional) — GitHub PR number to review. If omitted, resolved via Phase 0.
- **ai-platform** (optional) — AI platform name for comment prefixes. Defaults to "AI".

## Process

### Phase 0: Resolve PR Number

If `pr-number` known, go to Phase 1

1. Check session context for PR references
   - If multiple → execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to ask "Which PR to review?", list each (number, title)
2. If no context → query open PRs not authored by user:

   ```bash
   current_user=$(gh api user --jq .login)
   gh pr list --state open --limit 4 --json number,title,author,headRefName \
     | jq --arg u "$current_user" '[.[] | select(.author.login != $u)]'
   ```

   Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to ask "Which PR to review?", list each (number, title)
   If none, ask user for PR number

### Phase 1: Setup

1. **Verify PR:** `gh pr view {pr-number} --json number,title,body,state,baseRefName,headRefName,url,author`
2. **Check for uncommitted changes** before any branch operations — if present, stop and ask the user
3. **Assess local checkout:** For small PRs (<10 changed files), review diff inline. For larger PRs, check out locally: `gh pr checkout {pr-number}`
4. **Fetch diff:** `gh pr diff {pr-number}` and `gh pr diff {pr-number} --name-only`
5. **Create tracking todo list**

### Phase 2: Context

1. **Read project conventions** — `CLAUDE.md` and referenced coding guidelines
2. **Read linked issue context** (if applicable) — extract issue numbers from PR title, fetch: `gh issue view {issue-number} --json title,body,labels`
3. **Read feature context** (if applicable) — check `.xe/features/` for related specs
4. **Read prior work artifacts** (if they exist) — research docs, plans, work logs
5. **Read full source files** for changed files to evaluate in context. If checked out locally, use Read tool; otherwise `gh api`.
   - **Skip for trivial diffs:** If <20 changed lines and no structural changes (renames, new files, signature changes), diff context is sufficient.

### Phase 3: Analysis

Evaluate the PR against three dimensions. Read relevant source files, tests, docs, and neighboring code as needed.

#### Quality

Code style and conventions, lint compliance, naming consistency, inline comments on non-obvious logic, test coverage (new tests, edge cases), security (no secrets, no injection vulnerabilities).

#### Functional correctness

Logic matches PR description, no off-by-one/null/edge-case bugs, breaking change risk, parameter validation, graceful error handling, completeness (implementation + tests + docs).

#### Project alignment

Architecture fit, focused scope (no over-engineering), changelog for external changes, documentation accuracy.

### Phase 4: Classify Findings

- **🚫 Blocker** — Must fix before merge. Bugs, security issues, breaking changes, data loss.
- **⚠️ Should fix** — Strong recommendation. Style violations, missing tests, incomplete docs, maintainability.
- **💡 Suggestion** — Nice to have. Alternative approaches, minor improvements, optimizations.

### Phase 5: User Consultation

Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to present review findings as separate questions per severity group (blockers, should-fix, suggestions) — skip empty groups; list items as a short numbered summary (count + ~5 words each).

- **🚫 Blockers** — Options: "Post all (Recommended)", "Review individually", "Skip all"
- **⚠️ Should fix** — Options: "Post all (Recommended)", "Review individually", "Skip all"
- **💡 Suggestions** — Options: "Post all (Recommended)", "Review individually", "Skip all"

When a group has 5+ items, group by theme and offer "Post all", "Review by category", "Skip all".

If "Review individually"/"Review by category": execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to present each finding individually with options "Post as-is (Recommended)", "Edit wording", "Downgrade severity", "Skip".

### Phase 6: Post Review

1. **Determine line numbers from the diff.** The Reviews API `line`/`start_line` use new-file line numbers from `@@` hunk headers. Parse `gh pr diff {pr-number}`, count forward from hunk start. Use `side: "RIGHT"`. For multi-line: `start_line` = first, `line` = last.

2. **Submit a single review:**

   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr-number}/reviews \
     --input review.json
   ```

   ```json
   {
     "event": "COMMENT",
     "body": "⚛️ [Catalyst][{ai-platform}] **PR Review**\n\n...",
     "comments": [
       {
         "path": "src/example/file.ts",
         "line": 42,
         "side": "RIGHT",
         "body": "⚛️ [Catalyst][{ai-platform}] ⚠️ **Should fix**\n\n..."
       }
     ]
   }
   ```

   Delete `review.json` after posting. Every comment body MUST start with `⚛️ [Catalyst][{ai-platform}]`.

3. **Review event type:** Default `"COMMENT"`. MAY use `"REQUEST_CHANGES"` or `"APPROVE"` only with explicit user direction. Approvals MUST attribute to the user (e.g., "Approved by @username via Catalyst").

4. **Review body template:**

   ```markdown
   ⚛️ [Catalyst][{ai-platform}] **PR Review**

   **Summary:** {1-2 sentence assessment}

   ### 🚫 Blockers ({count})

   {Numbered list — omit section if none}

   ### ⚠️ Should fix ({count})

   {Numbered list — omit section if none}

   ### 💡 Suggestions ({count})

   {Numbered list — omit section if none}
   ```

5. **Line-level comment template:**

   ````markdown
   ⚛️ [Catalyst][{ai-platform}] {severity emoji} **{severity label}**

   {Description}

   **Suggestion:**

   ```suggestion
   {code — MUST span all relevant lines}
   ```
   ````

6. **Do NOT:** post without `⚛️ [Catalyst][{ai-platform}]` prefix, make code changes/commits/pushes, post multiple separate reviews.

## CLI Reference

| Command                                                              | Purpose                          |
| -------------------------------------------------------------------- | -------------------------------- |
| `gh pr list --state open --limit 4 --json ...`                       | List recent open PRs (discovery) |
| `gh api user --jq .login`                                            | Get current user login           |
| `gh pr view {pr} --json ...`                                         | PR details                       |
| `gh pr checkout {pr}`                                                | Check out PR branch              |
| `gh pr diff {pr}`                                                    | View diff                        |
| `gh pr diff {pr} --name-only`                                        | List changed files               |
| `gh issue view {issue} --json ...`                                   | Linked issue details             |
| `gh api repos/{owner}/{repo}/pulls/{pr}/reviews --input review.json` | Submit review                    |

## Error Handling

- **PR not found:** Verify PR number and `gh` CLI authentication
- **Permission denied:** Check repository access
- **API errors:** Retry with backoff for transient failures
- **Large PRs (>50 files):** Focus on most impactful files; note in review body that not all files were deeply reviewed

## Success Criteria

- [ ] PR metadata and diff fetched successfully
- [ ] Project conventions read and understood before analysis
- [ ] All changed files read in full (not just diffs)
- [ ] Changes evaluated against quality, functional correctness, and project alignment dimensions
- [ ] Findings classified by severity (blocker, should-fix, suggestion)
- [ ] User approved findings via AskUserQuestion before posting
- [ ] Single cohesive review posted via GitHub Reviews API
- [ ] Every comment (body and line-level) prefixed with `⚛️ [Catalyst][{ai-platform}]`
- [ ] Line-level suggestion comments include `suggestion` code blocks spanning all relevant lines
- [ ] No code changes, commits, or pushes made
