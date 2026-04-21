# Feedback for feature-workflow

## General

- Architecture pattern validation during implementation: The feature-code and feature-test playbook actions should check `.xe/architecture.md` for relevant patterns (e.g., Kitchen-Sink Validation Pattern) and prompt the implementer to update integration points when adding or modifying actions. Currently, architecture patterns are documented but not enforced — the kitchen-sink often falls behind when new actions are added.
  - **Why:** The kitchen-sink validation pattern catches integration bugs that unit tests miss, but it only works if the kitchen-sink is updated alongside action changes. Multiple sessions have added actions without updating the kitchen-sink until a separate quality pass caught the gap.
  - **How to apply:** During feature-code execution, if the change adds or modifies a playbook action, check if `kitchen-sink.yaml` demonstrates it. If not, flag it as a required task in the rollout plan.
- AI MUST NOT use AUQ to confirm actions when only one reasonable option exists from context — execute instead of asking
  - **Why:** During Run 3, AI asked "should I create the template?", "should I add both?", "approve plan?" when the answers were obvious. This wastes user attention and signals lack of confidence.
  - **How to apply:** Before creating an AUQ, ask: "Is there genuine ambiguity here, or am I just seeking permission?" If the user's intent is clear and only one option makes sense, execute directly. Reserve AUQ for real choices with tradeoffs.

## Rollouts

- When resuming a rollout run via `/catalyst:change`, follow the update-feature.md playbook phases strictly — don't skip Phase 0 (scope) or mix conversational exploration with spec approval gates
  - **Why:** User had to restart Run 3 because the AI skipped scope confirmation, presented spec changes conversationally instead of via AUQ, then tried to course-correct mid-stream. The playbook phases exist to prevent exactly this kind of drift.
  - **How to apply:** Even when context from a prior session exists (e.g., rollout plan with pre-implementation already checked), re-enter the playbook at the correct resume point and follow each phase gate in order.
- The update-feature.md resume-routing table ("task breakdown exists → Phase 3") does NOT exempt Phase 0 — resume ALWAYS passes through Phase 0 first to confirm execution-mode and scope
  - **Why:** Re-occurred on rollout-product-foundation: AI read the resume table, jumped to implementation, and started editing the spec without ever establishing execution-mode. User had to stop and force a restart. The rollout file doesn't persist execution-mode, so without Phase 0 the AI is operating in an undefined mode.
  - **How to apply:** On resume, Phase 0 is mandatory. Verify scope is still valid, get execution-mode set via AUQ if not already, THEN use the resume table to decide which later phase to re-enter. The resume table is about skipping spec/plan re-work, not about skipping scope confirmation.
- Verify integration points in actual source files before documenting behavior that depends on them
  - **Why:** While editing start-initialization.md, the AI fabricated an "opt-out detection" step that inspected init issue fields that don't exist in the init issue template. User caught it: "did you add anything to the init issue template about customer journeys? Is there anything to detect?" The AI was specifying downstream behavior that had no upstream signal.
  - **How to apply:** When writing a step that reads or depends on content from another file (issue templates, config files, external systems), first read that source. If the signal doesn't exist, don't invent the mechanism — either keep the behavior unconditional, or add the upstream piece explicitly as a separate task.
