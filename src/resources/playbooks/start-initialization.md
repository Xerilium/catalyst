---
owner: "Product Manager"
reviewers:
  required: ["Architect"]
  optional: ["Engineer"]
---

# Playbook: Start Initialization

**Goal**: Initialize a Catalyst project by collecting product, engineering, and team context interactively and rendering the foundational artifacts

## Inputs

Parse user's input to identify optional parameters:

- **description**: Free-form prompt context the user provided when invoking the command (project name, problem statement, hints, etc.); used to seed research before the interview
- **context-files**: Referenced files (proposals, notes, transcripts, etc.) read for additional context
  - Flag temporary files for possible cleanup later — NEVER delete without confirmation

## Phase 1: Scope

1. Detect existing `.xe/product.md`:
   - When present → research existing `.xe/` artifacts and propose improvements to strengthen product vision (modernize, innovate, scale, adoption), or any weakness identified. Provided inputs scope the research and proposals; without inputs improve what's deemed weak.
   - When absent → proceed to fresh initialization
2. Inspect repository signals (README, package metadata, top-level source layout) and any prompt context to draft proposed answers
3. Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to present the initial AUQ batch (up to 4 questions):
   - Q1-Q3: high-level context-gathering questions tailored to inputs and research; skip individually when research is sufficient. If research suggests the user would benefit from the full interview to refine inputs, ask "Run the full product interview to refine these inputs?" with a recommendation
   - Q4: **Execution mode** — present all four, recommend one based on complexity and user preference:
     - **interactive** — Progressive Q&A. Nothing staged/committed by AI.
     - **checkpoint-review** — Autonomous between checkpoints; human review at gates. Nothing staged/committed by AI.
     - **final-review** — Autonomous to completion on current branch; final human review. Nothing staged/committed by AI.
     - **autonomous** — New branch + PR for human review.
4. Run the interview based on execution mode and the Q3 interview decision:
   - `interactive` OR user opted into the interview → execute @node_modules/@xerilium/catalyst/playbooks/actions/init-interview.md for the full AUQ-driven interview
   - Other modes → run the interview autonomously without AUQ (fill best-guess answers from research). If AI determines questions are required to proceed safely, ask a follow-up batch of ≤4 questions

⏸️ **STOP HERE**: Do NOT proceed to Phase 2 until – MUST have:

- **execution-mode** set
- Confirmed input set covering project overview, goals, technology preferences, engineering preferences, team roles, product strategy priorities, customer journey (or confirmed not needed), competitive context (or confirmed not needed)

## Phase 2: Implement

Execute @node_modules/@xerilium/catalyst/playbooks/actions/init-render.md to fill every bundled template with the confirmed inputs and write the artifacts under `.xe/`.

⏸️ **STOP HERE**: Do NOT proceed to Phase 3 until every artifact is written, placeholders are replaced, and instruction blocks are stripped

## Phase 3: Review

Present the rendered artifacts for review and close out:

1. Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-audit.md
2. Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-review.md
3. Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-closure.md (pr-type: Init)
4. Execute @node_modules/@xerilium/catalyst/playbooks/actions/workflow-celebrate.md
5. Closing message: tell the user to run `/catalyst:blueprint` when ready to start designing the product

## Error handling

**Implementation Failures**: preserve completed work, surface blocker to user, escalate if unresolvable

**Spec Changes During Implementation**: stop, document, return to Phase 1 if input set is invalid

**Context/Dependency Issues**: if required templates missing, halt and notify user

## Success criteria

- [ ] Each phase exit criteria met
- [ ] Each nested instructions exit criteria met
- [ ] `.xe/product.md`, `.xe/engineering.md`, `.xe/architecture.md`, `.xe/process/development.md` rendered; `.xe/customer-journey.md` and `.xe/competitive-analysis.md` rendered when in scope
- [ ] Closing message points the user to `/catalyst:blueprint` for product design
- [ ] User confirms work is complete
