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

- **rollout-id**: Kebab-case rollout ID; maps to `.xe/rollouts/rollout-{id}.md`; also check conversation context for active rollout

## Instructions

### Step 1: Locate rollout

**If `rollout-id` known and `.xe/rollouts/rollout-{rollout-id}.md` exists** → proceed to Step 2.

**Otherwise** execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to present a smart option list:

1. "Create `{rollout-id}`" (if known) or "Create new" (Desc: Grounded context for the rollout, if any) → Execute @node_modules/@xerilium/catalyst/playbooks/actions/create-rollout.md with `rollout-id` and grounded context as input
2. Next incomplete feature task in `.xe/rollouts/rollout-blueprint.md` (if exists; Desc: Details from blueprint)
3. Most recently updated other rollout (by `last_updated` frontmatter; Desc: summarize run to start/continue)
4. "Show all rollouts" if more rollouts exist (Desc: # of rollouts and range of topics not covered above) → List all `.xe/rollouts/rollout-*.md` with one-line overviews, ask user to pick in console (not AUQ)

### Step 2: Identify next run

1. Read rollout Active State, Overview, all `## Run N` sections
2. Select first `## Run N` with unchecked task (`- [ ]`)
3. If all runs complete, select `## Final Review`

### Step 3: Execute

**If Final Review selected** → Execute each review task in order → If all completed, output `---` and `{congrats message with emoji} **Next** to work on {suggested rollout}, or **more** to review other rollouts`

- `next` → Go to Step 2 for suggested rollout
- `more` → Go to Step 1 > **Otherwise** case

**If run selected with `> **Execute**:` blockquote** → Execute command directly with rollout doc and run context input

**If run select without `> **Execute**:` blockquote** → Infer intent from run/rollout context, execute appropriate command directly:

- Feature work → `/catalyst:{create|change|fix|explore} {feature-id}`
- Investigation → `/catalyst:explore {context}`
- Ambiguous → `/catalyst:rollout {context}`

## Exit Criteria

- [ ] Rollout located or created
- [ ] Next run identified
- [ ] Target playbook executed
