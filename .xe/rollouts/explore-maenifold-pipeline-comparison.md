# Explore: Catalyst Playbook Engine vs maenifold-rs Workflows and Pipelines

Draft for review. No specs or code changed.

**Prompted by**: Backlog item "Compare Catalyst playbook engine with maenifold-rs workflows/pipelines: recommendation on how to merge, pros/cons of each design."

**Sources** (read-only):

- Catalyst: `.xe/features/playbook-engine`, `playbook-definition`, `playbook-yaml`, `playbook-template-engine`, `playbook-actions-controls`, `ai-provider` (incl. `FR:acp`), `blueprint.md` (Prime handoff note)
- maenifold-rs ([msbrettorg/maenifold-rs](https://github.com/msbrettorg/maenifold-rs), MIT, pre-1.0, commit `955eaf538`): `docs/ARCHITECTURE.md`, `wiki/features/workflows-and-pipelines/*`, `wiki/apps/pipeline-driver.md`, `crates/maenifold-workflow/src/pipeline/types*.rs`

Not verified by running code. Claims about maenifold-rs come from its docs and type definitions.

## Recommendation (TL;DR)

**Do not merge the engines. Borrow five ideas into the Catalyst/Prime engine, and add one thin adapter.**

1. Keep Catalyst's sequential, step-list engine. It fits Catalyst's job: deterministic repo automation with human checkpoints.
2. Treat maenifold-rs as a peer, not a base. It is a memory and agent-orchestration product with a Rust runtime; Catalyst needs neither.
3. Borrow into the engine (build in Prime if the Prime handoff goes ahead): typed step outputs, a `parallel` action with join policy, per-step retry with backoff, run fork/rewind, detached runs with a lock.
4. Add an optional adapter action later (`maenifold-pipeline`) so a playbook can start a maenifold pipeline over MCP. Build only when a real use case asks for it.
5. Do nothing on ACP: Catalyst already ships an `acp` provider (#157), which gives the same agent-neutral execution.

Reasoning: the two engines solve different problems (see [Core difference](#core-difference)). A full merge costs a rewrite of both and loses the features each team values most.

## Findings

### Core difference

|                     | Catalyst playbook engine                                                                    | maenifold-rs pipeline                                       |
| ------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Question it answers | "Run this repo procedure, stop for a human at checkpoints."                                 | "Run agents as nodes in a graph, keep their state durable." |
| Control model       | Ordered step list with structured control (`if`, `for-each`, `try`, `function`, `playbook`) | Directed acyclic graph with a scheduler                     |
| Closest analogy     | A script                                                                                    | A build system or job DAG                                   |

maenifold-rs also has a second, simpler thing called a **workflow**. It is a JSON template of steps that one agent session walks through, one `Workflow` tool call per step. This is close to Catalyst's Markdown playbooks (an agent reads steps and follows them), not to Catalyst's YAML engine.

| Catalyst                                                     | Nearest maenifold-rs match                            |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| YAML playbook run by the engine                              | `Pipeline` (DAG run by `execute_pipeline`)            |
| Markdown playbook run by the AI agent (`explore-feature.md`) | `Workflow` (JSON step template, agent-driven)         |
| `ai-prompt` action                                           | `prompt` node                                         |
| `playbook` action (nested run)                               | `workflow` node (a template inside a DAG)             |
| `bash`, `script`, `git`, `file` actions                      | `tool` node (MCP tool call)                           |
| `checkpoint` action                                          | No direct match (nearest: Gate domain, `wait`/resume) |
| `if` / `for-each`                                            | Conditional edge; no loop                             |
| `try` / `throw` / error policy                               | Node retry policy; failure cascade to dependents      |

### Side-by-side design

| Area                              | Catalyst                                                                                               | maenifold-rs                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language and runtime              | TypeScript on Node 18+, in-process                                                                     | Rust workspace (16 crates), local daemon plus detached driver process                                                                                                         |
| Definition format                 | YAML (JSON Schema for IDE support)                                                                     | JSON `PipelineDefinition` (`nodes`, `edges`, `inputs`)                                                                                                                        |
| Unit of work                      | Step = one action call                                                                                 | Node = one of 5 types: `workflow`, `prompt`, `session`, `sequentialThinking`, `tool`                                                                                          |
| Action extensibility              | Many typed actions (TS classes, build-time catalog, JSON Schema generated from config types)           | Fixed node types; extend through MCP tools and workflow templates                                                                                                             |
| Ordering                          | Strict: `FR:execution.no-skip`, definition order                                                       | Graph: ready set computed from edges; parallel up to `max_concurrency`                                                                                                        |
| Branching                         | `if` with expression                                                                                   | Edge types `success`, `always`, `conditional {path, equals}` (JSON Pointer or dot path on the upstream output)                                                                |
| Loops                             | `for-each` over an array                                                                               | None in a DAG (validation checks cycles)                                                                                                                                      |
| Joins                             | n/a (sequential)                                                                                       | `JoinPolicy`: `all`, `any`, `first`                                                                                                                                           |
| Data passing                      | Named variables and step results; `${{ get('x') }}` template in a sandbox                              | Typed handoff: `input_schema` / `output_artifact` (JSON Schema); template placeholders in prompts                                                                             |
| Expressions                       | JavaScript in a sandbox, secret masking                                                                | Predicate = path plus equals only                                                                                                                                             |
| Human in the loop                 | First-class `checkpoint` (options, default, timeout, autonomous auto-select, resume without re-prompt) | Not a node type. Human control by pausing, cancelling, or Gate tasks                                                                                                          |
| Errors                            | `CatalystError` (code, guidance), `ErrorPolicy`, `try`/`catch`/`finally`                               | Per-node `RetryPolicy` (max attempts, exponential backoff, deterministic jitter), failure classification, cascade, quarantine                                                 |
| Timeouts                          | Not specified at step level                                                                            | Per node type; unbounded by default for agent nodes                                                                                                                           |
| State                             | JSON run file `.xe/runs/run-{id}.json`, atomic write after each step; completed runs archived by date  | Markdown session files with frontmatter (`memory://` URIs); per-node state (`pending`, `ready`, `active`, `completed`, `skipped`, `abandoned`, `stuck`, `failed`, `retrying`) |
| Resume                            | Skip completed steps; resume `paused` or `failed` runs                                                 | Resume paused pipeline by spawning a new driver; recovery of orphaned active nodes                                                                                            |
| Concurrency control               | `LockManager` for paths and branches, TTL locks                                                        | Exclusive session lock for the driver                                                                                                                                         |
| Run lifecycle                     | Foreground process (CLI)                                                                               | Detached process (`setsid`), survives the caller                                                                                                                              |
| Mutation of live or finished runs | None                                                                                                   | `fork`, `graft`, `join`, `rewind` (guarded: only when not live)                                                                                                               |
| AI execution                      | `ai-prompt` through `AIProvider` (claude, copilot, cursor, gemini, ollama, openai, `acp`)              | ACP only, with per-node `agentClient`, model, thought level; `sessionRef` resumes a prior ACP session                                                                         |
| Observability                     | Log channel separate from framework logs; debug mode stores unnamed results                            | MCP resources `pipeline://session/{id}` with subscribe, Mermaid render of live runs                                                                                           |
| Memory and context                | None in the engine (separate `context-storage`)                                                        | Core product: markdown memory, `[[WikiLinks]]` graph, assumptions, lineage; pipelines read and write it                                                                       |
| Maturity                          | Shipped in Catalyst; spec-first with traceability                                                      | "Pre-1.0 developer preview. Pipeline features are experimental." Large test suite                                                                                             |
| Distribution                      | npm package                                                                                            | Build from source                                                                                                                                                             |
| Governance                        | Xerilium                                                                                               | Single org (`msbrettorg`), MIT                                                                                                                                                |

### Where each design is stronger

**Catalyst strengths**

- Checkpoints are first-class and resume-safe. This is the main Catalyst feature for human oversight.
- Rich action library for repo work (git, GitHub, files, scripts, shell) with a typed config and generated schema.
- Template engine with sandbox and secret masking. Expressions can do real logic.
- Structured control flow (`if`, `for-each`, `try`, `function`) is easy to read and write by hand.
- One runtime language with the rest of the product. No second toolchain.
- Fits both uses: engine-run YAML and agent-run Markdown share one playbook search path.

**maenifold-rs strengths**

- True parallelism with join rules. Catalyst has no `parallel` action yet (named only as an example in `playbook-definition`).
- Typed node outputs checked against JSON Schema. Conditional routing reads structured data, not text.
- Retry with backoff and failure classification, per node.
- Run surgery: fork a finished run from a node, re-run with another agent or model, graft a scoring node, rewind a subtree. Catalyst cannot do this.
- Detached, crash-recoverable runs with a lock and orphan recovery.
- Live inspection over MCP resources and Mermaid.
- Late-bound agent per node; the same graph runs with different agents (a built-in evaluation harness).

### Where each design is weaker

**Catalyst gaps**

- No parallel step execution.
- No step-level retry or timeout beyond `ErrorPolicy` retry count.
- Step outputs are untyped (`value: unknown`).
- No fork or rewind of a past run; resume only.
- Runs die with the foreground process.
- `playbook-engine` feedback notes open ergonomics gaps (e.g., no variable append).

**maenifold-rs gaps (for Catalyst's use)**

- No human checkpoint node.
- No loops and no general expressions; branching is path-equals only.
- No built-in repo actions (git, files, scripts). Everything is an MCP tool or an agent prompt.
- Heavy: Rust daemon, ONNX embeddings, SQLite, graph. Pipeline code cannot be used without the runtime around it (the `pipeline-driver` crate still depends on `maenifold-mcp`).
- Experimental. Contract may change before 1.0.
- Docs and types disagree in one place: the wiki Mermaid example has a back-edge (`revise` to `review`), while validation checks for cycles. Needs confirming before relying on loop-like patterns.

## Analysis

### Merge options

| Option                                        | What it is                                                                                                          | Pros                                                                                                                       | Cons                                                                                                                                                                                        | Cost          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **A. Stay separate, add adapter**             | New Catalyst action `maenifold-pipeline` calls the `Pipeline` MCP tool (or `maenifold tool` CLI) and waits or polls | Smallest change; keeps both designs; no new dependency unless user opts in; Catalyst gains graph runs and memory on demand | Two state stores; two failure models; user must install maenifold; adapter contract tracks a pre-1.0 API                                                                                    | S             |
| **B. Catalyst compiles to maenifold**         | Translate YAML playbooks to `PipelineDefinition`; maenifold becomes the runtime                                     | One graph engine; free parallelism, retry, surgery                                                                         | `for-each`, `function`, `checkpoint`, `try`, template engine, script and git actions have no equivalent; hard runtime dependency (Rust, daemon); loss of npm-only install; pre-1.0 contract | XL; high risk |
| **C. Port ideas into Catalyst engine**        | Keep TS engine; add typed outputs, `parallel` with join policy, retry, fork/rewind, detached run                    | Closes real gaps; no new runtime; stays traceable to specs; aligns with Prime handoff                                      | We build and maintain it; risk of a shallow copy of a larger design                                                                                                                         | M per idea    |
| **D. Replace Catalyst engine with maenifold** | Drop `playbook-*` features                                                                                          | Remove engine maintenance                                                                                                  | Loses checkpoint, templates, actions, Markdown playbooks tie-in; vendor lock to one maintainer; product identity shifts to memory/graph                                                     | XL; reject    |
| **E. Shared spec, two runtimes**              | Define a neutral "playbook graph" format both can run                                                               | Long-term portability                                                                                                      | Spec effort without a user need; two moving targets; maenifold is pre-1.0                                                                                                                   | L; premature  |

### Idea-by-idea borrow list (Option C)

| Idea                                                  | Value for Catalyst                                                       | Fit                                                                                | Size | Priority     |
| ----------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ---- | ------------ |
| `parallel` action with `all`/`any`/`first` join       | Run independent checks, multi-repo sweeps, multi-reviewer passes at once | Fits as a `PlaybookActionWithSteps` (already named as an example); no graph needed | M    | High         |
| Typed step output (`output-schema`)                   | Safer `ai-prompt` results; routing on structured data                    | Optional JSON Schema on `ai-prompt` and `playbook`; validate on return             | S-M  | High         |
| Per-step `retry` (max, backoff, jitter) and `timeout` | Flaky `gh`, network, and AI calls                                        | Extend `ErrorPolicy`; one place                                                    | S    | High         |
| Detached run plus lock                                | Long runs survive the terminal; fits Autopilot and sweeps                | CLI `catalyst run --detach`; reuse `LockManager`                                   | M    | Medium       |
| Fork and rewind of a run                              | Re-run from a step with another model; cheap A/B of agents               | Run JSON already stores variables and completed steps; add `fork(runId, fromStep)` | M    | Medium       |
| Graph edges and general DAG                           | Only needed if parallel plus conditions grow complex                     | `parallel` plus `if` cover most cases                                              | L    | Skip for now |
| Memory graph and WikiLink context                     | Out of scope for the engine                                              | Separate product question                                                          | n/a  | Skip         |

### Pros and cons per product direction

**If Catalyst stays sequential-plus-control-flow (Option C or A)**

- Pros: readable playbooks; one mental model; human checkpoints stay central; low risk.
- Cons: complex fan-out and join logic stays awkward until `parallel` lands.

**If Catalyst moves to a DAG (Options B, D, E)**

- Pros: natural fit for multi-agent graphs, evaluation, and surgery.
- Cons: playbooks get harder to hand-write; checkpoints and loops must be re-modelled; big rewrite for features users do not ask for today.

### Risks

- **Dependency risk**: maenifold-rs is pre-1.0 and run by one org. Any hard link is a bet on its contract.
- **Scope drift**: copying DAG features invites a second engine. Keep to `parallel` plus `if`.
- **Prime handoff**: the blueprint marks `playbook-engine` as a Prime candidate. Work done in Catalyst now may move. Build new engine features where the engine will live.
- **Duplicate ACP work**: Catalyst's `acp` provider already covers agent-neutral prompts. Do not rebuild it in an adapter.

## Open questions

Each has a default. If nobody answers, the default applies.

| #   | Question                                                                                              | Default if silent                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | Merge or stay separate?                                                                               | Stay separate. Borrow ideas (Option C). No adapter yet.                                                             |
| 2   | Where does new engine work land: Catalyst or Prime?                                                   | Prime, if the handoff is confirmed before the first idea starts. Else Catalyst, in the existing `playbook-*` specs. |
| 3   | Which idea first?                                                                                     | `parallel` action with join policy, then step `retry` and `timeout`.                                                |
| 4   | Do we want a `maenifold-pipeline` adapter action?                                                     | No. Revisit when a user or internal flow needs maenifold memory or graph runs.                                      |
| 5   | Do we need a DAG definition format?                                                                   | No. Revisit if `parallel` plus `if` cannot express a real playbook.                                                 |
| 6   | Does maenifold-rs allow cycles in pipelines?                                                          | Assume no (DAG, validated). Confirm in `pipeline/validation.rs` before any design depends on it.                    |
| 7   | Do we want to talk to the maenifold-rs maintainer about a shared output-schema or handoff convention? | No outreach. Reconsider at maenifold 1.0.                                                                           |
| 8   | Should fork/rewind of runs be a CLI feature or an internal tool only?                                 | Internal tool first (`catalyst run fork`), hidden until used twice.                                                 |

## Next steps (if Option C is accepted)

1. Run `/catalyst:change playbook-actions-controls` to add the `parallel` action spec (join policy, error handling, state, resume).
2. Run `/catalyst:change playbook-engine` for step `retry` and `timeout`, and optional `output-schema`.
3. File a follow-up for detached runs and run fork after steps 1-2 ship.
4. No work on the adapter until open question 4 changes.

## References

- Catalyst: `.xe/features/playbook-engine/spec.md`, `playbook-definition/spec.md`, `playbook-actions-controls/spec.md`, `ai-provider/spec.md` (`FR:acp`), `blueprint.md` (Prime handoff)
- Catalyst ACP provider: PR #157
- maenifold-rs: `docs/ARCHITECTURE.md`; `wiki/features/workflows-and-pipelines/index.md`, `pipeline-surgery.md`, `templates-and-evaluation.md`; `wiki/apps/pipeline-driver.md`; `crates/maenifold-workflow/src/pipeline/types.rs`, `types_node.rs`
- [Agent Client Protocol](https://agentclientprotocol.com)
