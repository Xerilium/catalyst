---
owner: "Product Manager"
reviewers:
  required: ["Architect"]
  optional: ["Engineer"]
---

# Playbook: Start Rollout

**Goal**: Execute the next run of a rollout — or scaffold a new one

‼️ Write for **Distilled Excellence**: Highest signal per character

## Inputs

Parse user's input to identify:

- **rollout-id**: Kebab-case rollout ID; maps to `.xe/rollouts/rollout-{id}.md`

## Instructions

### Step 1: Locate rollout

**If `rollout-id` given and `.xe/rollouts/rollout-{rollout-id}.md` exists** → proceed to Step 2.

**If `rollout-id` given but no doc found:**

List existing rollouts at `.xe/rollouts/rollout-*.md`— and identify the most relevant:

- Most recently updated rollout doc (by file or frontmatter date)
- Next feature from blueprint rollout (`.xe/rollouts/rollout-blueprint.md`) if it exists — read Run 1+ tasks that aren't `[x]`
- One other existing rollout if any (pick most recently active by `last_updated`)

Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md:

> No rollout doc found for `{rollout-id}`. What would you like to do?
>
> Options: "Create {rollout-id}" / "Execute {most-recent-rollout}" (if any) / "Continue {blueprint-next-run-name}" (if blueprint exists) / "Execute {other-rollout}" (if any)

Route to chosen option. "Create" → Step 1a. "Execute \*" → use that rollout, proceed to Step 2.

**If no `rollout-id` given:**

List all `.xe/rollouts/rollout-*.md` docs. For each, extract the one-line Overview.

Present as numbered list and ask user to pick one, or enter a new rollout ID to create:

```text
Active rollouts:
1. {rollout-id} — {one-line overview}
2. ...
```

Route: existing rollout selected → proceed to Step 2. New ID entered → Step 1a.

#### Step 1a: Create rollout

Execute @node_modules/@xerilium/catalyst/playbooks/actions/create-rollout.md with `rollout-id` as input. Then proceed to Step 2.

### Step 2: Identify next run

Read rollout doc — Active State, Overview, all `## Run N` sections.

Identify next run: first `## Run N` with any unchecked task (`- [ ]`). If all runs complete, proceed to Final Review block and execute those tasks.

### Step 3: Execute

In the next run's section, find the `> **Execute**:` blockquote. Map it to the target playbook:

- `/catalyst:create` → Execute @node_modules/@xerilium/catalyst/playbooks/create-feature.md
- `/catalyst:change` → Execute @node_modules/@xerilium/catalyst/playbooks/update-feature.md
- `/catalyst:fix` → Execute @node_modules/@xerilium/catalyst/playbooks/repair-feature.md
- `/catalyst:explore` → Execute @node_modules/@xerilium/catalyst/playbooks/explore-feature.md

If no `> **Execute**:` declared, infer from run title and rollout context:

- New feature → `create-feature.md`
- Update/refactor → `update-feature.md`
- Bug fix → `repair-feature.md`
- Investigation → `explore-feature.md`
- Ambiguous → ask user to clarify before proceeding

Pass the rollout doc and run context as input to the target playbook's Phase 0 (Scope).

## Exit Criteria

- [ ] Rollout located or created
- [ ] Next run identified
- [ ] Target playbook executed
