# Start or continue a feature change (legacy router)

> **Note**: This is the legacy routing command. Prefer `/catalyst.feature` for new work. This command preserves the state-detection routing logic for reference and fallback.

Start or continue feature development. Features may be defined in the product blueprint (`.xe/features/blueprint/tasks.md`) or a GitHub issue. Active work is tracked as `plan-*.md` files in `.xe/sessions/`.

Playbooks are located in `node_modules/@xerilium/catalyst.playbooks/` and define structured workflows with inputs, outputs, and execution steps.

## Usage

```bash
/catalyst.rollout
/catalyst.rollout [feature-or-change-id]
/catalyst.rollout [issue-id]
```

## Parameters

- `feature-or-change-id` (optional): The unique kebab-case ID of a feature or in-progress change (e.g., "user-authentication", "payment-gateway")
- `issue-id` (optional): The GitHub issue number containing feature or blueprint details (e.g., 41, 123)

## Process

### Without parameters

1. Check if blueprint exists at `.xe/features/blueprint/tasks.md`
2. If blueprint exists:
   - Read `.xe/features/blueprint/tasks.md` to identify the next incomplete feature
   - Check feature dependencies in `.xe/features/blueprint/spec.md` to ensure prerequisites are met
   - Extract the feature-id and feature-description from the blueprint
   - Run the `start-feature` playbook with inputs:
     - `feature-description`: {description from blueprint}
     - `feature-id`: {feature-id from blueprint}
     - `execution-mode`: "interactive" (default)
3. If blueprint doesn't exist:
   - Run the `start-blueprint` playbook to create the blueprint
   - Do NOT pass any inputs (playbook will prompt for product vision)

### With issue-id parameter

Execute the `start-feature` playbook with the following inputs:

- `issue-id`: {issue-id provided by user}
- `execution-mode`: "interactive" (default)

### With feature-or-change-id parameter

Detect current phase and route to the appropriate workflow:

1. **Check open PRs** with branch name `xe/{feature-or-change-id}`:
   - Run: `node node_modules/@xerilium/catalyst.playbooks/github.js --find-open-prs "[Catalyst]"`
   - Parse JSON output for PR with `head.ref` matching `xe/{feature-or-change-id}`
   - If found, extract `pr.number` for use with update-pull-request playbook
2. **Check feature plan** at `.xe/sessions/plan-{feature-or-change-id}.md`
3. **Check existing branch** name `xe/{feature-or-change-id}` using `git branch --list`
4. **Check existing feature** at `.xe/features/{feature-or-change-id}/spec.md`
5. **Check blueprint feature** in `.xe/features/blueprint/spec.md` and `.xe/features/blueprint/tasks.md`

Run the appropriate workflow based on what exists (first match wins):

**If open PR exists:**

1. Run the `update-pull-request` playbook with inputs:
   - `pr-number`: {extracted from GitHub script output}
2. **STOP HERE** - The update-pull-request playbook handles all remaining work

**If feature plan exists:**

1. Read `.xe/sessions/plan-{feature-or-change-id}.md` to determine current phase
2. Switch to branch `xe/{feature-or-change-id}` if it exists
3. Determine resume point from feature plan content:
   - If spec.md exists for related feature(s) and all tasks are implementation tasks → resume at Phase 3 (Plan) or Phase 4 (Implementation)
   - If spec.md does not exist → resume at Phase 2 (Spec)
   - If all tasks are completed → inform user, ask about further changes
4. Run the `start-feature` playbook at the appropriate phase

**If existing branch OR feature spec exists (but no feature plan):**

1. Switch to branch `xe/{feature-or-change-id}` if it exists; otherwise create it
2. Read feature context: `.xe/features/{feature-or-change-id}/spec.md`
3. Create feature plan at `.xe/sessions/plan-{feature-or-change-id}.md`
4. Run the `start-feature` playbook with inputs:
   - `feature-id`: {feature-or-change-id}
   - `execution-mode`: "interactive" (default)
   - Resume at appropriate phase based on existing files

**If blueprint feature exists:**

1. Read `.xe/features/blueprint/tasks.md` to identify current blueprint state
2. Extract the feature-id and feature-description from the blueprint
3. Run the `start-feature` playbook with inputs:
   - `feature-description`: {description from blueprint}
   - `feature-id`: {feature-id from blueprint}
   - `execution-mode`: "interactive" (default)

**If nothing exists:**

1. Inform the user that the feature-or-change-id was not found
2. Ask what they would like to do:
   - Provide corrected ID
   - Create new feature from description
   - Cancel
3. If corrected, rerun this command from the beginning with the new ID

## Error handling

- **Change not found** - Check if value is a feature-id at `.xe/features/{id}/spec.md` or blueprint feature
- **Feature not found** - Check if feature is part of the blueprint in `.xe/features/blueprint/spec.md`
- **Blueprint not found** - If no parameters provided, run `start-blueprint` playbook to create one
- **Playbook not found** - Verify playbook exists before executing; if missing, inform user Catalyst may need reinstallation
- **Multiple matches** - Use priority order defined above (PR → feature plan → branch → feature → blueprint)
- **Other errors** - Follow playbook-specific error handling as defined in the executed playbook

## Success criteria

This command is successful when ONE of the following is achieved:

- [ ] Correct playbook identified based on parameters and existing state
- [ ] Playbook inputs mapped correctly from command parameters
- [ ] Playbook executed (or initiated) successfully
- [ ] User informed of any ambiguities or errors with clear next steps

Note: This command is a legacy router/orchestrator. Prefer `/catalyst.feature`. The actual feature implementation success criteria are defined in the executed playbook (start-feature, update-pull-request, or start-blueprint).

## Examples

```bash
# Start next blueprint feature (or create blueprint if none exists)
/catalyst.rollout

# Continue in-progress change/feature
/catalyst.rollout authentication-system

# Update open PR (if PR exists on branch xe/user-profile-page)
/catalyst.rollout user-profile-page

# Start change from GitHub issue
/catalyst.rollout 41
```