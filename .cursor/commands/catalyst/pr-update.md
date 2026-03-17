---
name: "pr-update"
description: Update a pull request by analyzing feedback, implementing changes, and responding to comments
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite
argument-hint: <pr-number>
Usage: /catalyst/pr-update <pr-number>
Examples: /catalyst/pr-update 123
---

# Update Pull Request

Analyzes all PR feedback, implements valid suggestions while respectfully pushing back on questionable ones, replies to all comments with detailed explanations, and commits and pushes changes. Includes force-accept mechanism to override AI judgment and escalation handling after 3 push-backs per thread.

## Usage

```bash
/catalyst/pr-update <pr-number>
```

## Parameters

- `pr-number` (required): GitHub PR number to review and address feedback for

## Process

1. **Verify inputs**
   - Verify PR number is specified
   - Verify the GitHub PR exists and is accessible via GitHub CLI
   - Ensure you have necessary permissions to push to the PR branch
   - Check that GitHub CLI is available and authenticated for API operations
2. **Read playbook**
   - Read the `update-pull-request.md` playbook from `node_modules/@xerilium/catalyst/playbooks/`
   - Extract inputs, outputs, error handling, success criteria, and execution steps
3. **Map and validate inputs**
   - Map command inputs to playbook inputs:
     - First argument → `pr-number`
     - `ai-platform` → "Cursor" (automatically set based on the AI platform running this command)
4. **Execute playbook steps**
   - Follow the playbook steps sequentially for the update-pull-request workflow:
     - Input validation
     - Initialization (extract PR info, create tracking todo list, verify branch status)
     - Research and analysis (identify threads, check for force-accept tags, analyze feedback)
     - Execution (categorize feedback, implement changes, draft responses, post comments)
     - Verification (run thread identification script, validate changes)
     - Publishing (commit and push changes, create summary comment, update todo list)
5. **Provide execution summary**
   - Report what feedback was addressed
   - List implemented changes
   - Note any push-backs or escalations
   - Highlight any manual review needed

## Error handling

- **PR not found** - Verify PR number is correct and GitHub CLI is authenticated
- **Missing permissions** - Explain required access levels to push to PR branch
- **GitHub API errors** - Retry API calls with exponential backoff for transient failures
- **Git operation errors** - Check for conflicts and provide resolution guidance
- **Implementation errors** - If suggested changes cause test failures, revert and explain the issue
- **Thread identification script errors** - Ensure script exists at expected path in node_modules

Always attempt to resolve issues intelligently based on available context. If issues cannot be resolved internally, provide clear guidance on how to resolve issues and retry the command.

## Success criteria

- [ ] Thread identification script shows 0 threads needing replies
- [ ] Valid suggestions have been implemented and pushed to the PR branch
- [ ] All responses use the `[Catalyst][Cursor]` prefix
- [ ] Push-back counts are tracked accurately (max 3 per thread)
- [ ] Force-accept overrides are honored and implemented
- [ ] All changes are committed with a descriptive message
- [ ] Changes are successfully pushed to the PR branch
- [ ] Summary comment is posted to the PR
- [ ] No instruction placeholders remain in responses
- [ ] All errors are handled gracefully with clear user guidance

## Examples

```bash
# Update PR #123
/catalyst/pr-update 123
```

This will:

1. Fetch PR #123 data including all comments and reviews
2. Identify threads needing replies (excluding those already replied to by `[Catalyst][Cursor]`)
3. Analyze feedback and categorize as valid improvements or push-backs
4. Implement valid changes and post threaded responses
5. Commit and push changes with descriptive message
6. Post summary comment on PR with `[Catalyst][Cursor]` prefix
