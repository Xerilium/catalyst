# AskUserQuestion (AUQ) Tool Usage Standard

## Format

- Header: max 1-3 words
- Question text: max 100 words
- Option labels: max 20 words
- Option descriptions: max 100 words
- Plain text ONLY, NO markdown formatting

## Guidelines

- Do NOT use AUQ when:
  - Analysis confirms the user's suggestion — just act
  - The decision is low-risk and easily reversible — just pick and move on
- Each question MUST address exactly one decision
- ALWAYS mark the most appropriate option: "(Recommended)" when confident, "(Suggested)" when under-informed
- Research, gather evidence, present an informed recommendation — don't ask humans uninformed, context-less questions
- Ground recommendations in product vision (`.xe/product.md`) and engineering principles (`.xe/engineering.md`)
- When under-informed, present best-effort suggestion and offer an option to research further for a higher-confidence recommendation
- Include enough state context for the user to decide WITHOUT referencing console output (console is NOT usable when AUQ is open)
- Options MUST include concise details to adequately compare how they differ
- Group independent questions into a single AUQ call to minimize prompts

## Patterns

### Progressive Approval

- **What**: Approve a large body of content in logical groups, with an option to review items individually
- **When**: Reviewing proposed changes, feedback responses, or any batch of related decisions
- **How**: Present each group's context as a message, then ask a focused AUQ to approve or drill in
