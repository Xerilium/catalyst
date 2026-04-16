# Feedback for feature-workflow

- When resuming a rollout run via `/catalyst:change`, follow the update-feature.md playbook phases strictly — don't skip Phase 0 (scope) or mix conversational exploration with spec approval gates
  - **Why:** User had to restart Run 3 because the AI skipped scope confirmation, presented spec changes conversationally instead of via AUQ, then tried to course-correct mid-stream. The playbook phases exist to prevent exactly this kind of drift.
  - **How to apply:** Even when context from a prior session exists (e.g., rollout plan with pre-implementation already checked), re-enter the playbook at the correct resume point and follow each phase gate in order.
- AI MUST NOT use AUQ to confirm actions when only one reasonable option exists from context — execute instead of asking
  - **Why:** During Run 3, AI asked "should I create the template?", "should I add both?", "approve plan?" when the answers were obvious. This wastes user attention and signals lack of confidence.
  - **How to apply:** Before creating an AUQ, ask: "Is there genuine ambiguity here, or am I just seeking permission?" If the user's intent is clear and only one option makes sense, execute directly. Reserve AUQ for real choices with tradeoffs.
