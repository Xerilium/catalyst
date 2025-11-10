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

**CRITICAL**: This playbook MUST run to completion. Success is 0 threads needing replies. If work remains after a phase, state progress and ask if you should continue. Never stop without completing ALL work or explicitly asking to continue with a concise status showing threads remaining.

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
   - Use `node node_modules/@xerilium/catalyst/playbooks/scripts/github.js --get-pr <pr-number>` to get PR title and description.
   - Use `node node_modules/@xerilium/catalyst/playbooks/scripts/github.js --get-pr-feature <pr-number>` to detect feature and related files.
   - Read the PR description to understand the purpose and scope.
   - If feature files exist (spec.md, plan.md, tasks.md), read them for context.
   - Set up context for the current branch and working directory.
   - **Note**: Other documentation or linked issues will be read only if feedback requires them to validate requirements or alignment.

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
  node node_modules/@xerilium/catalyst/playbooks/scripts/github.js --find-pr-threads <pr-number> <ai-platform>
  ```

  The script identifies threads where the latest reply is from a user (not the AI platform) and provides:
  - Push-back count for each thread (automatically tracked from comment history)
  - Whether thread contains `#force-accept` tag
  - Thread preview and metadata
- **For each thread**, use `--get-thread-comments` to fetch full conversation:

  ```bash
  node node_modules/@xerilium/catalyst/playbooks/scripts/github.js --get-thread-comments <pr-number> <thread-id>
  ```

  This provides complete thread context for crafting responses.
- For each piece of feedback, evaluate:
  - **Technical validity**: Is this a bug fix, security issue, or improvement?
  - **Project alignment**: Does this align with Catalyst standards and patterns?
  - **Scope appropriateness**: Is this within the scope of the current PR?

## Execution

> **CRITICAL**: Address ALL threads until verification shows 0 remaining. Do not stop early or ask if you should continue.
>
> **WORKFLOW**: This is an iterative loop - Research → Execution → Verification → repeat until 0 threads remain. Never skip verification.

1. **Categorize feedback and respond**:

   **Decision flow**:

   1. Has `#force-accept`? → Implement regardless
   2. Is it a bug, security issue, or clear improvement? → Implement
   3. Does it conflict with project standards or introduce risk? → Push back (max 3x per thread)
   4. Unclear or exploratory? → Ask for clarification

   **Key principles**:
   - Prioritize feature requirements, quality, and correctness
   - Respect established principles, patterns, and architecture
   - Keep changes within PR scope
   - Push back politely with reasoning

2. **Implement valid changes systematically**:

   - For each valid suggestion, use appropriate tools (Read, Edit, Write) to implement the change.
   - Follow established coding standards and patterns.
   - Ensure changes don't introduce regressions.
   - Update related documentation if necessary.
   - Add or update tests if the change affects functionality.

3. **Load design principles for decision points**:

   - **Skip for straightforward implementations**: Bug fixes, typos, obvious improvements, force-accept items
   - **Load when needed for debates**: Push-backs, questionable suggestions, or technical trade-offs
   - Read `.xe/product.md` and relevant spec files (`.xe/features/*/spec.md`) to understand design principles
   - Use principles to resolve debates objectively rather than through opinions

4. **Draft comment responses**:

   > **RULE**: Every response MUST result in action. Valid responses are:
   > 1. **Implement** - Make the requested change
   > 2. **Push back** - Explain why the change shouldn't be made
   > 3. **Ask for clarification** - When the request is unclear
   >
   > Never "acknowledge" without doing one of these three actions. Acknowledgment without implementation is a non-response.

   **For implemented changes**:

   ```markdown
   ⚛️ [Catalyst][{ai-platform}] ✅ **Implemented**

   {Only explain if there was a deviation from the request, otherwise omit explanation}
   ```

   **For push-backs (track count per thread)**:

   ```markdown
   ⚛️ [Catalyst][{ai-platform}] 🤔 **Push-back** (#{push-back-count}/3)

   {1-2 sentences explaining technical/alignment concerns}

   {Optional: 1 sentence alternative if applicable}

   Reply with `#force-accept` if you'd like me to implement this anyway.
   ```

   **For escalation after 3 push-backs**:

   ```markdown
   ⚛️ [Catalyst][{ai-platform}] I've shared my concerns ({1 sentence TLDR}), but I respect you may have additional context. If this is your preferred approach, clarify the exact changes with `#force-accept` and I'll implement it.
   ```

   **For force-accepted items**:

   ```markdown
   ⚛️ [Catalyst][{ai-platform}] ✅ **Force-accepted**

   Implemented as requested: {1-2 sentence summary of changes}
   ```

   **For unclear force-accept requests**:

   ```markdown
   ⚛️ [Catalyst][{ai-platform}] I see `#force-accept`, but need clarification:

   - {Question 1}
   - {Question 2}

   Please specify and re-add `#force-accept`.
   ```

   **For exploratory questions**:

   When the user asks exploratory questions (e.g., "Would it be helpful to...", "Should we...", "Do we need..."), think deeply about the best direction given product vision and engineering guidelines. You are a technical leader - make proactive decisions when the correct course is clear:

   1. **Load context**: Read `.xe/product.md`, relevant spec files, and engineering principles
   2. **Evaluate options**: Consider pros/cons, alignment with project goals, maintainability, user impact
   3. **Decide and implement**: If one option is clearly better, implement it and explain the reasoning
   4. **Present options**: If multiple valid approaches exist with meaningful trade-offs, present them with a recommendation

   ```markdown
   ⚛️ [Catalyst][{ai-platform}] ✅ **Implemented**

   {Explanation of decision and what was implemented, with reasoning based on project principles}
   ```

   OR (when genuine ambiguity exists):

   ```markdown
   ⚛️ [Catalyst][{ai-platform}]

   {Present 2-3 options with clear pros/cons and recommend one based on project principles. Ask user to confirm preferred approach.}
   ```

5. **Post all comment responses**:

   For each thread identified in Research and Analysis:

   - Post contextual response from step 4 as threaded reply:

     ```bash
     node node_modules/@xerilium/catalyst/playbooks/scripts/github.js --post-pr-comment-reply <pr-number> <comment-id> "<response-body>"
     ```

   - Use the original thread comment ID (not a reply ID)

6. **MANDATORY: Return to Verification section** - Do not proceed to Publishing without verifying 0 threads remain

## Verification

1. **Run thread identification script** to verify all threads have been addressed:

   ```bash
   node node_modules/@xerilium/catalyst/playbooks/scripts/github.js --find-pr-threads <pr-number> <ai-platform>
   ```

2. **Confirm output shows 0 threads need a reply**
3. **If threads remain**, return to Execution section and address them before proceeding

Additional verification steps:

- Ensure all changes follow project coding standards
- Run automated tests after making changes, if available
- Validate security scans still pass, if applicable
- Ensure performance benchmarks aren't negatively impacted
- Verify changes don't introduce regressions or break existing functionality
- Verify all response templates use the correct `[Catalyst][{ai-platform}]` prefix
- Confirm push-back counts are tracked accurately per thread

## Publishing

1. **Commit and push changes**:

   - Stage all modified files with `git add`
   - Create a descriptive commit message that summarizes all changes made
   - Include reference to PR feedback in commit message
   - Push changes to the PR branch
   - Verify the push was successful

2. **Create summary comment**:

   - Post a summary comment on the PR listing all addressed feedback
   - Include counts of implemented suggestions, push-backs, and force-accepted items
   - Provide clear next steps if any manual action is required

3. **Update todo list**:
   - Mark all completed items in the TodoList
   - Remove any obsolete items from tracking

4. **Report concise summary to user**:
   - DO NOT duplicate the detailed commit message or PR comment
   - Report only: threads addressed, threads resolved (from verification script), threads remaining, suggested next actions
   - Example: "Addressed 13 threads, verified 0 remain. Changes committed and pushed."

## Error handling

**GitHub API errors**:

- If PR doesn't exist, provide clear error message with correct usage
- If lacking permissions, explain required access levels
- If `/replies` endpoint returns 404, confirm you are replying to the original code comment and not a reply comment (replies to replies are not supported)
- Retry API calls with exponential backoff for transient failures

**Git operation errors**:

- If unable to push, check for conflicts and provide resolution guidance
- If branch is protected, explain the restriction and suggest alternatives
- Handle merge conflicts gracefully with clear instructions

**Implementation errors**:

- If a suggested change causes test failures, revert and explain the issue
- If linting fails, fix formatting issues automatically when possible
- Document any changes that couldn't be implemented and why

**Security considerations**:

- Never include sensitive information in comments or commit messages
- Sanitize any user-provided content before including in responses
- Avoid exposing internal system details in public comments
- Validate that suggested changes don't introduce security vulnerabilities
- Check that new dependencies are from trusted sources
- Ensure configuration changes don't expose sensitive data

## Success criteria

The playbook succeeds when:

- [ ] Thread identification script shows 0 threads needing replies
- [ ] Valid suggestions have been implemented and pushed to the PR branch
- [ ] All responses use the `[Catalyst][{ai-platform}]` prefix
- [ ] Push-back counts are tracked accurately (max 3 per thread)
- [ ] Force-accept overrides are honored and implemented
- [ ] All changes are committed with a descriptive message
- [ ] Changes are successfully pushed to the PR branch
- [ ] Summary comment is posted to the PR
- [ ] No instruction placeholders remain in responses
- [ ] All errors are handled gracefully with clear user guidance

## Reviewers

- Required: Engineer
- Optional: Architect
