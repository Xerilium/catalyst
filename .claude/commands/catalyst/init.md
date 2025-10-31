---
name: "init"
description: Initialize a new project from a GitHub issue
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite
argument-hint: [issue-id]
Usage: /catalyst:init [issue-id]
Examples: /catalyst:init
  /catalyst:init 123
---

# Initialize Project

Initialize a new Catalyst project from a GitHub issue containing project initialization details.

Playbooks are located in `node_modules/@xerilium/catalyst/playbooks/` and define structured workflows with inputs, outputs, and execution steps.

## Usage

```bash
/catalyst:init [issue-id]
```

## Parameters

- `issue-id` (optional): The GitHub issue number containing project initialization details

## Process

### With issue-id parameter

Execute the `start-initialization` playbook with the specified `issue-id`.

### Without issue-id parameter

1. Execute the `new-init-issue` playbook to create a GitHub issue
2. Provide the issue URL to the user
3. Ask the user to either:
   - Fill out the issue and report back with the issue ID
   - Assign the issue to an AI agent for automated processing
4. If the user returns with an issue ID, execute the `start-initialization` playbook

## Error handling

- **Issue not found** - If issue-id is invalid, provide helpful error message
- **Missing permissions** - If GitHub API access fails, notify user about permissions
- **Issue creation fails** - Report error and suggest manual issue creation
- **Template errors** - If template files are missing, report specific files needed
- **Validation failures** - Follow playbook-specific error handling

## Success criteria

- [ ] Appropriate playbook selected based on parameters
- [ ] Playbook executed successfully
- [ ] All context files created in `.xe/` folder
- [ ] Project ready for next development phase

## Examples

```bash
# Create new init issue
/catalyst:init
```

This will:

1. Execute `new-init-issue` playbook
2. Create a GitHub issue with init template
3. Provide issue URL and next steps to user

```bash
# Initialize from existing GitHub issue
/catalyst:init 123
```

This will:

1. Execute `start-initialization` playbook
2. Fetch issue #123 from GitHub
3. Parse issue content and generate context files
