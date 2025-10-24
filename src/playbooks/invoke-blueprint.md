---
owner: "Product Manager"
reviewers:
  required: ["Architect"]
  optional: []
---

# Playbook: Invoke Blueprint

## Description

Orchestrates sequential implementation of all features defined in the product blueprint. Creates subagents to run `start-rollout` for each feature, with natural human checkpoints via PR reviews.

## Inputs

- `execution-mode` (optional) - "sequential" (one at a time, default) or "parallel" (multiple features if dependencies allow)

## Outputs

- All features from blueprint implemented
- PRs created for each feature
- Blueprint rollout plan updated with completion status

## 1. Validate inputs

- Ensure `.xe/specs/blueprint/spec.md` exists (blueprint must be created first)
- Ensure `.xe/rollouts/rollout-blueprint.md` exists
- If `execution-mode` provided, validate it matches allowed values: "sequential" or "parallel"

## 2. Initialize

- Read `.xe/specs/blueprint/spec.md` to get feature list
- Read `.xe/rollouts/rollout-blueprint.md` to get current feature status
- Build list of features to implement (Status = "Not Started" and dependencies met)

## 3. Execute features

### Sequential Mode (default)

1. Find next feature where:
   - Status = "Not Started"
   - All dependencies have Status = "Complete"
2. If no unblocked features found:
   - Report: "All implementable features complete. Waiting on dependencies or human review."
   - Stop execution
3. **Create subagent** to run `/catalyst:run start-rollout {feature-id}`
4. Subagent executes feature implementation and creates PR
5. **Natural checkpoint:** Human reviews and merges PR
6. After PR merge, feature status automatically updated to "Complete" by start-rollout
7. Repeat from step 1

### Parallel Mode

1. Find ALL features where:
   - Status = "Not Started"
   - All dependencies have Status = "Complete"
2. **Create multiple subagents** (one per feature) to run `/catalyst:run start-rollout {feature-id}` in parallel
3. Subagents execute features independently and create PRs
4. **Natural checkpoints:** Human reviews and merges each PR as they complete
5. Monitor for completion, repeat when new features become unblocked

## 4. Monitor progress

- Display current status:
  - Features complete
  - Features in progress (PRs open)
  - Features blocked (waiting on dependencies)
  - Features not started
- Check if all features complete
- If all complete, update `rollout-blueprint.md` with "Product build complete" note

## Error handling

**Feature implementation failures:**

- If subagent encounters errors, document in feature's rollout plan
- Do not block other features from proceeding
- Report failure to user for manual resolution

**Dependency issues:**

- If circular dependencies detected, halt and report issue
- User must fix blueprint before continuing

**Missing blueprint:**

- If blueprint or rollout plan not found, stop execution
- Prompt user to run `/catalyst:run start-blueprint` first

## Success criteria

- [ ] All unblocked features have subagents created
- [ ] Each feature has PR created
- [ ] Blueprint rollout plan updated as features complete
- [ ] User notified when all features complete

## Notes

**Why this works well:**

- Subagents handle feature complexity independently
- PR reviews are natural human checkpoints (no forced interruptions)
- Can run parallel implementations if dependencies allow
- Each feature gets full context and quality gates via start-rollout
- Blueprint rollout plan provides single source of truth for status

**Usage:**

```bash
# Sequential (one feature at a time)
/catalyst:run invoke-blueprint

# Parallel (multiple features if dependencies allow)
/catalyst:run invoke-blueprint parallel
```
