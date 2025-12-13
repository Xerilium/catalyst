# Create Blueprint

Create a product blueprint from a GitHub issue breaking down the product into discrete features with dependencies and priorities.

Playbooks are located in `node_modules/@xerilium/catalyst/playbooks/` and define structured workflows with inputs, outputs, and execution steps.

## Usage

```bash
/catalyst-blueprint [issue-id]
```

## Parameters

- `issue-id` (optional): The GitHub issue number containing blueprint details

## Process

### With issue-id parameter

Execute the `start-blueprint` playbook with the specified `issue-id`.

### Without issue-id parameter

1. Check for existing active blueprint issue using `node node_modules/@xerilium/catalyst/playbooks/github.js --find-issue "[Catalyst][Blueprint]" {project-name}`
2. If active blueprint issue exists (command returns issue number):
   - Use that issue ID
   - Execute `start-blueprint` playbook with the found issue ID
3. If no blueprint issue exists (command exits with code 1):
   - Execute `new-blueprint-issue` playbook to create a GitHub issue
   - Provide the issue URL to the user
   - Ask the user to either:
     - Fill out the issue and report back with the issue ID
     - Assign the issue to an AI agent for automated processing
4. If the user returns with an issue ID, execute the `start-blueprint` playbook

## Error handling

- **Issue not found** - If issue-id is invalid, provide helpful error message
- **Missing permissions** - If GitHub API access fails, notify user about permissions
- **Issue creation fails** - Report error and suggest manual issue creation
- **Template errors** - If template files are missing, report specific files needed
- **Validation failures** - Follow playbook-specific error handling
- **Multiple blueprint issues** - If multiple active blueprint issues exist, ask user which one to use

## Success criteria

- [ ] Appropriate playbook selected based on parameters
- [ ] Playbook executed successfully
- [ ] Blueprint spec created in `.xe/features/blueprint/spec.md`
- [ ] Feature dependency graph documented
- [ ] Pull request created for review

## Examples

```bash
# Create new blueprint issue or use existing one
/catalyst-blueprint
```

This will:

1. Check for existing blueprint issue
2. If found, execute `start-blueprint` playbook with that issue
3. If not found, execute `new-blueprint-issue` playbook
4. Create a GitHub issue with blueprint template
5. Provide issue URL and next steps to user

```bash
# Create blueprint from specific GitHub issue
/catalyst-blueprint 41
```

This will:

1. Execute `start-blueprint` playbook
2. Fetch issue #41 with comments from GitHub
3. Parse issue content and generate blueprint spec with feature breakdown