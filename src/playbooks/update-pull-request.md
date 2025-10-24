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

# Playbook: Update pull request

## Description

Analyzes all PR feedback, implements valid suggestions while respectfully pushing back on questionable ones, replies to all comments with detailed explanations, and commits and pushes changes. Includes force-accept mechanism to override AI judgment and escalation handling after 3 push-backs per thread.

## Owner

Engineer

## Inputs

- **pr-number** - GitHub PR number to review and address feedback for.
- **ai-platform** (optional) - AI platform name to use in comment prefixes (e.g., "Claude", "Copilot"). Defaults to "AI" if not specified.

## Output

- Code changes implementing valid suggestions pushed to the PR branch.
- Threaded replies to all comments from other reviews on the PR using the `[Catalyst][{ai-platform}]` prefix (excludes the current AI platform).
- Git commit with descriptive message referencing PR feedback.
- Summary comment on the PR listing all addressed feedback.

## Input validation

- Verify the GitHub PR exists and is accessible via GitHub CLI.
- Ensure you have necessary permissions to push to the PR branch.
- Check that GitHub CLI is available and authenticated for API operations.
- Verify current working directory matches PR repository context.

## Initialization

1. **Extract PR information**:
   - Use `gh pr view <pr-number> --json title,body,comments,reviews` to get complete PR data.
   - Read the PR description to understand the purpose and scope.
   - Read any related documentation and linked issues.
   - Set up context for the current branch and working directory.

2. **Create tracking todo list**:
   - Create a todo list to track all feedback items that need addressing.
   - Include separate items for implementation, replies, and git operations.

3. **Verify branch status**:
   - Ensure you're on the correct PR branch or can switch to it.
   - Check that all current changes are committed before starting.
   - Verify branch is up to date with remote.

## Research and analysis

This playbook requires comprehensive analysis to evaluate PR feedback quality and validity:

- **Run the thread identification script** to find all threads needing responses:
  ```bash
  npx tsx .xe/playbooks/scripts/findPrThreadsNeedingReplies.ts <pr-number> <ai-platform>
  ```
  The script identifies threads where the latest reply is from a user (not the AI platform).
- **Check for `#force-accept` tags** in comment threads:
  - If found with specific instructions, note the exact requirement to implement.
  - If found alone, identify the latest suggestion in that thread to accept.
  - If unclear, flag for clarification request.
- **Track push-back history** for each comment thread to identify escalation scenarios.
- For each piece of feedback, think deeply about:
  - **Technical validity**: Is this a legitimate issue or improvement?
  - **Project alignment**: Does this align with Catalyst standards and patterns?
  - **Security implications**: Are there security concerns with the suggestion?
  - **Maintainability impact**: Will this improve or harm long-term maintainability?
  - **Scope appropriateness**: Is this within the scope of the current PR?

## Execution

1. **Categorize feedback and plan responses**:

   **Force-accept items (highest priority)**:
   - Any suggestion marked with `#force-accept` - implement regardless of technical concerns.
   - Document implementation concerns but proceed with the requested change.
   - After 3 push-backs, escalation items that receive final `#force-accept` clarification.

   **Valid improvements to implement**:
   - Bug fixes and error corrections.
   - Security improvements.
   - Performance optimizations.
   - Code quality enhancements that align with project standards.
   - Missing error handling or edge cases.
   - Documentation improvements.

   **Questionable suggestions to push back on (max 3 times per thread)**:
   - Scope creep beyond PR's intended purpose.
   - Subjective style preferences that conflict with established standards.
   - Overly complex solutions for simple problems.
   - Changes that would break existing functionality.
   - Requests for features that belong in separate PRs.

   **Always push back on (but accept if `#force-accept` provided)**:
   - Security vulnerabilities introduced by suggestions.
   - Breaking changes to public APIs without proper consideration.
   - Violations of established project architecture.
   - Suggestions that ignore documented project standards.

2. **Implement valid changes systematically**:
   - For each valid suggestion, use appropriate tools (Read, Edit, Write) to implement the change.
   - Follow established coding standards and patterns.
   - Ensure changes don't introduce regressions.
   - Update related documentation if necessary.
   - Add or update tests if the change affects functionality.

3. **Draft comprehensive comment responses**:

   **For implemented changes**:

   ```markdown
   [Catalyst][{ai-platform}] ✅ **Implemented**

   {Brief TLDR explanation of what was changed and why}

   **Changes made:**

   - {Specific change 1}
   - {Specific change 2}

   {Any additional context about implementation decisions}
   ```

   **For push-backs (track count per thread)**:

   ```markdown
   [Catalyst][{ai-platform}] 🤔 **Respectful push-back** (#{push-back-count}/3)

   I understand this suggestion, but I have concerns:

   **Reasoning:**

   - {Technical reason 1}
   - {Project alignment reason 2}
   - {Other considerations}

   **Alternative approach:**
   {If applicable, suggest alternative solutions}

   **Override option:**
   If you'd like me to implement this anyway, please reply with `#force-accept` and your final decision.
   ```

   **For escalation after 3 push-backs**:

   ```markdown
   [Catalyst][{ai-platform}] I've shared my technical concerns, but I respect that you may have additional context or requirements I may not be considering.

   To summarize my concerns:

   - {Concern 1 TLDR}
   - {Concern 2 TLDR}

   But if you feel this is the best way to go, I'm ready to implement your preferred approach. Please clarify the exact changes you want and include `#force-accept` in your response and I'll implement that in my next update.
   ```

   **For force-accepted items**:

   ```markdown
   [Catalyst][{ai-platform}] ✅ **Force-accepted and implemented**

   Implemented as requested with `#force-accept` override:

   **Changes made:**

   - {Specific change 1 TLDR}
   - {Specific change 2 TLDR}

   **Implementation notes:**
   {Details about how it was implemented, including any concerns that were overridden}
   ```

   **For unclear force-accept requests**:

   ```markdown
   [Catalyst][{ai-platform}] I see you used `#force-accept`, but I need clarification on exactly what to implement:

   **Please specify:**

   - {Specific question 1 TLDR}
   - {Specific question 2 TLDR}

   Then re-add `#force-accept` to your clarifying response so I can proceed with confidence.
   ```

   **For exploratory questions**:
   - If the previous comment was a question asking about alternative approaches, think deeply about the question.
   - Respond in an exploratory, open, brainstorming way that seeks the best solution.
   - Prioritize end user success but also balance engineering quality, engineering principles defined in `.xe/engineering.md`, and the tech stack defined in `.xe/architecture.md`.

4. **Post all comment responses**:
   - **DO NOT** reply to any comment threads where the last reply was from the current AI platform, identified by `[Catalyst][{ai-platform}]`.
   - Reply to each piece of feedback using the GitHub CLI.
   - Use the following API call: `gh api --method POST -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" /repos/{owner}/{repo_name}/pulls/{pr_number}/comments/{comment_id}/replies -f 'body={reply_comments}'`
   - Make sure the `{comment_id}` is the originating comment ID and not the ID of a reply to the comment. Replies to replies are not supported.
   - Use `[Catalyst][{ai-platform}]` prefix for all responses.
   - Ensure responses are helpful, professional, and educational.
   - Include specific details about what was changed or why changes were declined.
   - Use the appropriate response template based on the action taken.
   - All responses must be threaded replies to maintain proper tracking and resolution.
   - Never change a previous comment -- only post new replies to the comment thread.

5. **Context-aware responses**:
   - Reference specific design principles, project standards, and documentation.
   - If there are no design principles that help make the decision, think deeply about whether there is an underlying design principle that would have made the decision easier.
   - If there does not seem to be a design principle, then don't mention the idea of adding a design principle.
   - If there is a potential design principle, determine whether that principle should be a feature-specific or product-wide design principle.
   - Ensure all design principles meet our design principle requirements.
   - Add feature-specific design principles to the `.xe/features/{feature-id}/feature.md` file.
   - Add product-wide design principles to the `.xe/product.md` file.
   - Explain how changes align with broader project goals.
   - Provide educational context for junior reviewers.

## Verification

- **Run the thread identification script again** to verify all threads have been addressed:
  ```bash
  npx tsx .xe/playbooks/scripts/findPrThreadsNeedingReplies.ts <pr-number> <ai-platform>
  ```
  The output should show 0 threads needing replies.
- Ensure all implemented changes follow project coding standards.
- Run automated tests after making changes, if available.
- Validate that security scans still pass, if applicable.
- Ensure performance benchmarks aren't negatively impacted.
- Verify that changes don't introduce regressions or break existing functionality.
- Check that all response templates use the correct `[Catalyst][{ai-platform}]` prefix.
- Confirm push-back counts are tracked accurately per thread.

## Publishing

1. **Commit and push changes**:
   - Stage all modified files with `git add`.
   - Create a descriptive commit message that summarizes all changes made.
   - Include reference to PR feedback in commit message.
   - Push changes to the PR branch.
   - Verify the push was successful.

2. **Create summary comment**:
   - Post a summary comment on the PR listing all addressed feedback.
   - Include counts of implemented suggestions, push-backs, and force-accepted items.
   - Provide clear next steps if any manual action is required.

3. **Update todo list**:
   - Mark all completed items in the TodoList.
   - Remove any obsolete items from tracking.

## Error handling

**GitHub API errors**:

- If PR doesn't exist, provide clear error message with correct usage.
- If lacking permissions, explain required access levels.
- If `/replies` endpoint returns 404, confirm you are replying to the original code comment and not a reply comment (replies to replies are not supported).
- Retry API calls with exponential backoff for transient failures.

**Git operation errors**:

- If unable to push, check for conflicts and provide resolution guidance.
- If branch is protected, explain the restriction and suggest alternatives.
- Handle merge conflicts gracefully with clear instructions.

**Implementation errors**:

- If a suggested change causes test failures, revert and explain the issue.
- If linting fails, fix formatting issues automatically when possible.
- Document any changes that couldn't be implemented and why.

**Security considerations**:

- Never include sensitive information in comments or commit messages.
- Sanitize any user-provided content before including in responses.
- Avoid exposing internal system details in public comments.
- Validate that suggested changes don't introduce security vulnerabilities.
- Check that new dependencies are from trusted sources.
- Ensure configuration changes don't expose sensitive data.

## Success criteria

The playbook succeeds when:

- [ ] Thread identification script shows 0 threads needing replies.
- [ ] Valid suggestions have been implemented and pushed to the PR branch.
- [ ] All responses use the `[Catalyst][{ai-platform}]` prefix.
- [ ] Push-back counts are tracked accurately (max 3 per thread).
- [ ] Force-accept overrides are honored and implemented.
- [ ] All changes are committed with a descriptive message.
- [ ] Changes are successfully pushed to the PR branch.
- [ ] Summary comment is posted to the PR.
- [ ] No instruction placeholders remain in responses.
- [ ] All errors are handled gracefully with clear user guidance.

## Reviewers

- Required: Engineer
- Optional: Architect
