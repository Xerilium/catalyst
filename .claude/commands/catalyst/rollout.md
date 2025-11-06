---
name: "rollout"
description: Start or continue a feature rollout
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite
argument-hint: [feature-or-rollout-id] [issue-id]
Usage: /catalyst:rollout [feature-or-rollout-id] [issue-id]
Examples: /catalyst:rollout
  /catalyst:rollout one-click-purchase
  /catalyst:rollout 41
---

# Start or continue a feature rollout

Start a new or continue an existing feature rollout. New rollouts may be defined in the product blueprint (`.xe/specs/blueprint/tasks.md`) or a GitHub issue. Existing rollouts are listed in the `.xe/rollouts` folder.

Playbooks are located in `node_modules/@xerilium/catalyst/playbooks/` and define structured workflows with inputs, outputs, and execution steps.

## Usage

```bash
/catalyst:rollout
/catalyst:rollout [feature-or-rollout-id]
/catalyst:rollout [issue-id]
```

## Parameters

- `feature-or-rollout-id` (optional): The unique kebab-case ID of a feature or in-progress rollout (e.g., "user-authentication", "payment-gateway")
- `issue-id` (optional): The GitHub issue number containing feature or blueprint details (e.g., 41, 123)

## Process

### Without feature-or-rollout-id or issue-id parameters

1. Check if blueprint exists at `.xe/specs/blueprint/tasks.md`
2. If blueprint exists:
   - Read `.xe/specs/blueprint/tasks.md` to identify the next incomplete feature
   - Check feature dependencies in `.xe/specs/blueprint/spec.md` to ensure prerequisites are met
   - Extract the feature-id and feature-description from the blueprint
   - Run the `start-rollout` playbook with inputs:
     - `feature-description`: {description from blueprint}
     - `rollout-id`: {feature-id from blueprint}
     - `execution-mode`: "manual" (default)
3. If blueprint doesn't exist:
   - Run the `start-blueprint` playbook to create the blueprint
   - Do NOT pass any inputs (playbook will prompt for product vision)

### With issue-id parameter

Execute the `start-rollout` playbook with the following inputs:

- `issue-id`: {issue-id provided by user}
- `execution-mode`: "manual" (default)

### With feature-or-rollout-id parameter

Check for existing progress in the following order:

1. **Check open PRs** with branch name `xe/{feature-or-rollout-id}`:
   - Run: `node node_modules/@xerilium/catalyst/playbooks/scripts/github.js --find-open-prs "[Catalyst]"`
   - Parse JSON output for PR with `head.ref` matching `xe/{feature-or-rollout-id}`
   - If found, extract `pr.number` for use with update-pull-request playbook
2. **Check existing branch** name `xe/{feature-or-rollout-id}` using `git branch --list`
3. **Check existing rollout** at `.xe/rollouts/rollout-{feature-or-rollout-id}.md`
4. **Check existing feature** at `.xe/specs/{feature-or-rollout-id}/spec.md`
5. **Check blueprint feature** in `.xe/specs/blueprint/spec.md` and `.xe/specs/blueprint/tasks.md`

Run the appropriate workflow based on what exists (first match wins):

**If open PR exists:**

1. Run the `update-pull-request` playbook with inputs:
   - `pr-number`: {extracted from GitHub script output}
2. **STOP HERE** - Do NOT proceed with any other steps from this command
3. **IMPORTANT:** The update-pull-request playbook will handle all remaining work

**If existing branch OR rollout OR feature exists:**

1. Switch to branch `xe/{feature-or-rollout-id}` if it exists; otherwise create it
2. Determine current progress by checking which files exist:
   - If rollout doc exists: Read `.xe/rollouts/rollout-{feature-or-rollout-id}.md`
   - If feature exists: Read `.xe/specs/{feature-or-rollout-id}/tasks.md`
3. **If all tasks are completed:**
   - Inform the user that the feature has been completed
   - Ask if they want to make changes or enhancements
   - If yes, collect details and continue; if no, **STOP HERE**
4. **If tasks are incomplete or don't exist:**
   - Read feature context: `spec.md`, `plan.md` (if they exist)
   - Read source files as defined in the feature implementation plan
   - Run the `start-rollout` playbook with inputs:
     - `rollout-id`: {feature-or-rollout-id}
     - `execution-mode`: "manual" (default)
   - **Specify starting phase** based on existing files:
     - **Phase 4: Implementation Execution** if `tasks.md` exists (focus only on incomplete tasks)
     - **Phase 3: Planning** if `spec.md` exists but no `tasks.md`
     - **Phase 2: Specification Development** if no `spec.md` exists
     - If content already exists, update as needed based on requirements

**If blueprint feature exists:**

1. Read `.xe/specs/blueprint/tasks.md` to identify current blueprint state
2. If this is a specific feature within the blueprint:
   - Extract the feature-id and feature-description from the blueprint
   - Run the `start-rollout` playbook with inputs:
     - `feature-description`: {description from blueprint}
     - `rollout-id`: {feature-id from blueprint}
     - `execution-mode`: "manual" (default)
3. If no specific feature requested (user ran `/catalyst:rollout {phase-or-tier-id}`):
   - Run the `start-blueprint` playbook to continue blueprint execution
   - The playbook will determine the appropriate next action

**If nothing exists:**

1. Inform the user that the feature-or-rollout-id was not found
2. Ask what they would like to do:
   - Provide corrected ID
   - Create new feature from description
   - Cancel
3. If corrected, rerun this command from the beginning with the new `feature-or-rollout-id` or `issue-id`

## Error handling

- **Rollout not found** - Check if value is a feature-id at `.xe/specs/{id}/spec.md` or blueprint feature
- **Feature not found** - Check if feature is part of the blueprint in `.xe/specs/blueprint/spec.md`
- **Blueprint not found** - If no parameters provided, run `start-blueprint` playbook to create one
- **Playbook not found** - Verify playbook exists before executing; if missing, inform user Catalyst may need reinstallation
- **Multiple matches** - Use priority order defined in "Check for existing progress" (PR → branch → rollout → feature → blueprint)
- **Other errors** - Follow playbook-specific error handling as defined in the executed playbook

## Success criteria

This command is successful when ONE of the following is achieved:

- [ ] Correct playbook identified based on parameters and existing state
- [ ] Playbook inputs mapped correctly from command parameters
- [ ] Playbook executed (or initiated) successfully
- [ ] User informed of any ambiguities or errors with clear next steps

Note: This command is a router/orchestrator. The actual feature implementation success criteria are defined in the executed playbook (start-rollout, update-pull-request, or start-blueprint).

## Examples

```bash
# Start next blueprint feature (or create blueprint if none exists)
/catalyst:rollout

# Continue in-progress rollout/feature
/catalyst:rollout authentication-system

# Update open PR (if PR exists on branch xe/user-profile-page)
/catalyst:rollout user-profile-page

# Start rollout from GitHub issue
/catalyst:rollout 41
```
