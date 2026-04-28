# Write Spec

Create or update feature specifications.

‼️ If **execution-mode** is `autonomous-local` or `autonomous-branch`, skip AUQ invocations entirely

‼️ Write for **Distilled Excellence**.

## Inputs

- `feature-id`: Kebab-cased ID of the feature being spec'd
- `execution-mode`: `interactive`, `checkpoint-review`, `autonomous-local`, or `autonomous-branch`

## Instructions

1. Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to collect the following for each feature (batch 4Qs/loop, avoid phased Qs unless required):
   - Q1: **Purpose** — 1-4 options for the mission statement
     - For new features: proposed mission statements
     - For existing features needing changes: specific proposed changes
     - "Keep as-is" option for features not needing Purpose changes
   - Q2: **Dependencies** — confirm upstream feature dependencies
     - Prevent reverse dependencies (NEVER list downstream consumers)
   - Q3: **Data Model precision** (skip if no entities) — identify likely entities, list names, and ask how detailed they want to be in the spec. Recommend based on criticality/exposure. Options:
     - **Precise** — Exact names, all fields, allowed/defaults, validation, relationships locked. Use when entities are load-bearing or external callers depend on the exact shape.
     - **Standard** — Exact names, key fields and constraints; descriptions and validation where they aid understanding. Use for typical features.
     - **Logical** — Descriptive names, high-level shapes only. Use for internal scaffolding or exploratory designs.
     - **Select individually** — Different precision per entity. Offer only when the feature has 2+ entities.
   - Q4+: **Scenarios and constraints** — one question per scenario or architecture constraint being created, updated, or removed:
     - Show proposed FR ID & text (no markdown formatting)
     - Each scenario decomposes into sibling sub-FRs: `.input`, `.{behavior-name}`, `.output`, `.{interface-name}`. Omit slots that don't apply. Use literal `.input`/`.output` by default; domain names allowed when clearer. Prefer short interface labels (`cli`, `mcp`, `api`, `web`, `mobile`, `{file-format}`); for INTERNAL interfaces describe availability and behavior only, NOT implementation details (URLs, ports, command names, route paths); for PUBLIC interfaces (consumer-facing CLI commands, published APIs, file formats that ARE the contract) include those details since they ARE the contract.
     - Options: "Approve scenario + FRs", "Approve scenario + review FRs", or others as appropriate
     - Continue until all FRs/constraints are approved
   - Qn: **Data Model entities** — for each entity (skip primitives), present the entity FR at the precision chosen in Q3 (name + description if applicable + summarized field list); options: "Approve entity + fields" / "Approve entity, review fields separately" / "Review each individually". For ambiguous cases (one large entity vs split, naming choice), ask one targeted question. If a major new entity emerged during scenario design that wasn't in the Q3 list, treat it as the "ambiguous case" and confirm precision for it specifically.
2. Confirm ALL Qs are approved (none skipped; repeat AUQ loops as needed)
3. Generate full `spec.md` for this feature using template `node_modules/@xerilium/catalyst/templates/specs/spec.md`
4. **Downstream review** — for each consumer from Step 1.7, classify in rollout Notes as (a) no impact or (b) impact — add task under `#### {downstream-feature-id}`. Skip when Step 1.7 was skipped.
5. Verify integrity and completeness: every scenario, FR, dependency, and constraint is reflected per template instructions and @node_modules/@xerilium/catalyst/standards/catalyst-traceability.md
6. Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to present full spec for final approval. Repeat steps 1–6 for each feature in scope; in `autonomous-branch` execution mode, commit after each feature approval.

## Exit Criteria

- [ ] All specs finalized, written to disk, and user-approved (auto-approved for `autonomous-local` and `autonomous-branch` execution mode)
- [ ] FRs use the sibling sub-FR shape (input / behaviors / output / interfaces) where applicable
- [ ] Entities documented as `$`-prefix entity FRs in the `## Data Model` section of `spec.md`
- [ ] Finalized specs do NOT reference downstream features (reverse dependencies)
- [ ] Finalized specs are "living" documents that represent the desired state and do NOT reference updates or changes from a previous state
- [ ] Specs use `@req` requirements traceability annotations for upstream dependencies
- [ ] No FR IDs were changed or removed without explicit user approval and, if approved, all downstream `@req` annotations in specs where identified and added to the in-progress plan to be addressed before closure
- [ ] Every Step 1.7 consumer is classified (a) or (b) in rollout Notes; (b) outcomes have tasks under `#### {downstream-feature-id}`
