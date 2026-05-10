# Init Interview

Research repository signals, draft proposed answers, then conduct a guided product interview through the AUQ action. The user approves or refines AI-proposed answers grounded in research and known product context — no blank questions, no AI guesswork left unconfirmed.

‼️ Write for **Distilled Excellence**: Highest signal per character

## Inputs

- `description`: Free-form prompt context the user provided when invoking the command (optional)
- `context-files`: Referenced files for additional context (optional)

## Instructions

### Step 1: Research

Inspect the repository to draft proposed answers BEFORE asking. Pull from:

- `README.md` (or `README.*`) — name, purpose, audience, typical commands
- Package metadata — `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, etc. (name, description, dependencies signal stack)
- Source layout — top-level directories suggest architecture (monorepo? service+web? cli?)
- Existing config — CI files, linters, test frameworks signal engineering preferences
- Inline `description` and `context-files` from invocation

Synthesize repo signals into proposed answers for every input field listed in Step 2. Mark fields where research yielded no signal — those are the unknowns the interview must surface explicitly.

### Step 2: Interview

For EACH input field below, Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to confirm the {field-name} answer. For EVERY question:

- Prefix questions with `(Qi/n)` (known total, e.g., `(Q3/8)`) or `(Qi/n+)` (more expected, total unknown, e.g., `(Q3/8+)`) so users know how many to expect
- Target ≤8 questions; ask more when required
- Present a recommended answer grounded in Step 1 research with one-sentence rationale
- Offer 2-4 alternatives the user can pick instead
- Call out unknowns explicitly when research yielded nothing — never guess silently

Batch related fields into a single AUQ call when they're logically grouped (still prefix each question). AI MAY skip an optional field via AUQ when research strongly indicates it's not needed (e.g., customer journey for an internal CLI tool); confirm the skip with the user, do not assume.

Input fields to cover:

1. **Project overview** — what the project does, the problem it addresses, why it matters
2. **Goals** — primary goals, success metrics, milestones
3. **Technology preferences** — preferred stack, must-have or must-avoid technologies, deployment preferences
4. **Engineering preferences** — non-negotiable values and quality criteria
5. **Team roles** — Product Manager, Architect, Engineer, and other roles with handles
6. **Product strategy priorities** — ranked phased focus areas (POC, Mainstream, Innovation, Platform, Enterprise, Scale)
7. **Customer journey** — product-level journeys the product enables (optional; confirm skip when domain doesn't warrant)
8. **Competitive context** — known competitors, differentiation, table-stakes features (optional; confirm skip when domain doesn't warrant)

## Exit Criteria

- [ ] Repository research completed; proposed answers drafted for every input field
- [ ] Interview run via AUQ action; every input field is either confirmed (answered) or explicitly skipped (user-acknowledged)
- [ ] Every question carries a `(Qi/n)` or `(Qi/n+)` progress prefix
- [ ] No silent AI guesses — every assumption is either user-confirmed or flagged unknown
- [ ] Confirmed input set ready to hand off to `init-render.md`
