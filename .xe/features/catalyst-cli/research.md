---
id: catalyst-cli
title: Catalyst CLI Research
author: "@flanakin"
description: "Research and analysis for CLI framework selection, command design, and distribution strategy."
---

# Research: Catalyst CLI

## Context

Catalyst is transitioning from an AI-driven markdown experience to a Node-based CLI workflow engine. The CLI will orchestrate playbooks, interact with AI when needed, and maximize programmatic execution for consistency and reliability. The goal is to minimize AI risk by focusing AI on specific tasks rather than procedural execution.

### Current State

- **Playbooks**: YAML-based workflows (not yet published; conceptual versions in `src/resources/playbooks/`)
- **Templates**: Spec templates in `templates/` for standardized documentation
- **Traceability**: `traceability/` module for requirement tracking
- **Slash commands**: `.claude/commands/` for AI platform integration (Claude Code)

### Design Drivers

From `.xe/product.md`:

- **Collaborative**: Work with the team, as a team - natural contributions
- **Transparent**: All work is traceable and reversible
- **Autonomous**: Act independently within guardrails
- **Accountable**: Enforce strategic coherence with human checkpoints

---

## CLI Framework Analysis

### Frameworks Evaluated

| Framework | GitHub Stars | Strengths | Weaknesses |
|-----------|-------------|-----------|------------|
| **Commander.js** | 26.2k | Lightweight, flexible, great DX | Flat structure for many commands |
| **Yargs** | 11k | Mature parser, i18n support, validation | Large deps, callback-heavy syntax |
| **oclif** | ~8k | Plugins, TypeScript-first, auto-updates | Steeper learning curve, overkill for small CLIs |

### Recommendation: Commander.js

**Rationale:**

1. **Lightweight**: Catalyst is already a focused tool, not a massive CLI ecosystem
2. **TypeScript support**: Works well with existing TypeScript codebase
3. **Subcommand pattern**: Supports `catalyst <domain> <action>` structure
4. **Low ceremony**: Minimal boilerplate for adding new commands
5. **Active maintenance**: Most popular option with strong community

**Alternative consideration**: If plugin architecture becomes critical (Phase 4: Platform), consider migrating to oclif for community extensions.

---

## Command Design Patterns

### Naming Conventions

Based on CLI best practices from [Command Line Interface Guidelines](https://clig.dev/) and [Heroku CLI Style Guide](https://devcenter.heroku.com/articles/cli-style-guide):

- **Lowercase only**: No mixed case in commands
- **Single words**: No hyphens, underscores, or spaces in command names
- **Verb-first for actions**: `catalyst run <playbook>` reads naturally

### Output Standards

- **Human-first**: Default to readable output with color support
- **Progressive disclosure**: Show hints for next steps, not overwhelming docs
- **Pascal-cased errors**: Friendly error codes like `PlaybookNotFound`, not cryptic codes

---

## Revised Command Structure

### MVP: Infrastructure Only

The initial CLI focuses purely on infrastructure - running playbooks. All domain-specific commands (rollout, blueprint, init, req, etc.) are deferred until the underlying features are mature.

```
catalyst --help              # Show available commands
catalyst --version           # Show version
catalyst run <playbook>      # Execute a playbook
```

### Future: Dynamic Commands (Deferred)

Playbooks can register as first-class commands via a `cli/commands/` directory structure:

```
node_modules/@xerilium/catalyst/cli/commands/
├── blueprint.yaml    # catalyst blueprint → wraps start-blueprint
├── init.yaml         # catalyst init → wraps start-initialization
└── rollout.yaml      # catalyst rollout → wraps start-rollout
```

**Security model**: Only load command definitions from trusted paths (`node_modules/@xerilium/catalyst/`), never from project-local directories. This prevents command hijacking where `catalyst init` could be redirected to malicious code.

### Decision Criteria for Future Command Promotion

A playbook should become a registered command if:

1. **Frequency**: Used multiple times per feature/project
2. **Complexity**: Requires multiple inputs that benefit from CLI UX
3. **Discoverability**: Users should find it without knowing playbook internals
4. **Integration**: Orchestrates multiple sub-playbooks or systems

---

## Implementation Phases

### Phase 1: MVP (This Feature)

- [ ] CLI entry point: `npx catalyst` or `catalyst` (global install)
- [ ] Help system: `catalyst --help`
- [ ] Version: `catalyst --version`
- [ ] Run command: `catalyst run <playbook-id> [--input key=value]`
- [ ] Shell completion support (bash, zsh, fish)

### Phase 2: Dynamic Commands (Future)

- [ ] Command registration from `cli/commands/*.yaml`
- [ ] Promoted commands: `catalyst init`, `catalyst blueprint`, etc.

### Phase 3: Binary Distribution (Future)

- [ ] Node.js SEA (Single Executable Application) compilation
- [ ] Cross-platform binary builds
- [ ] Code signing for distribution

---

## Technical Considerations

### Project Structure

```
src/cli/
├── index.ts           # Entry point, Commander setup
├── run.ts             # Run command implementation
├── utils/
│   ├── output.ts      # Human-readable output formatting
│   └── errors.ts      # Pascal-cased error handling
└── types.ts           # CLI-specific types
```

### Package.json Updates

```json
{
  "bin": {
    "catalyst": "./bin/catalyst.js"
  }
}
```

### Testing Strategy

- Unit tests for command parsing and validation
- Integration tests for playbook execution via CLI
- Manual testing as first validation of playbook engine

---

## Binary Distribution Analysis

### Why Consider Binaries?

Node.js CLIs have inherent security considerations:

- Anyone with file access can modify `.js` files
- Supply chain risks from npm dependencies
- Requires Node.js runtime on target machine

### Options Evaluated

| Tool | Status | Notes |
|------|--------|-------|
| **Node.js SEA** | Built-in (experimental) | Native since Node 21, requires bundling to single CJS file |
| **vercel/pkg** | ⚠️ Archived Jan 2024 | Was the gold standard, no longer maintained |
| **nexe** | Active | Community alternative to pkg |

### Recommendation: Node.js SEA (Future Phase)

Node.js Single Executable Applications (SEA) is now built into Node.js (v20+):

1. Bundle TypeScript → single CommonJS file (using esbuild or Rollup)
2. Generate a "blob" from the bundle
3. Inject the blob into a copy of the Node binary
4. Sign the binary (optional but recommended)

**Trade-offs:**

| Pros | Cons |
|------|------|
| Single binary, no Node.js install required | Still experimental (Stage 1.1) |
| Can be signed for verification | Cross-platform builds require target OS |
| Harder to tamper than loose `.js` files | Binary size ~50-80MB (includes Node runtime) |
| Easier distribution | Bundling complexity |

**Decision**: Ship as normal Node.js CLI for MVP. Add SEA compilation as optional distribution method once CLI stabilizes.

### Language Alternatives Considered

| Language | Pros | Cons |
|----------|------|------|
| **Node.js** | TypeScript ecosystem, existing codebase | Supply chain risks, runtime dependency |
| **Go** | Single binary, fast startup | Different language, separate toolchain |
| **Rust** | Memory-safe, best security | Steep learning curve, slow development |

**Decision**: Stay with Node/TypeScript. The security benefits of compiled languages don't justify the complexity of maintaining two languages. Command hijacking is solved by trusted path loading, not language choice.

---

## Open Questions

1. **Progress output**: Spinner vs. log-style for long-running operations?
   - Recommendation: Spinner for TTY, log-style for non-TTY (detect via `process.stdout.isTTY`)

2. **Input validation**: Should CLI validate inputs before passing to playbook engine?
   - Recommendation: Minimal validation in CLI; let playbook engine handle schema validation

---

## References

- [Command Line Interface Guidelines](https://clig.dev/)
- [Heroku CLI Style Guide](https://devcenter.heroku.com/articles/cli-style-guide)
- [Node.js CLI Apps Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices)
- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Node.js Single Executable Applications](https://nodejs.org/api/single-executable-applications.html)
- [Building Multi-Platform Executable Binaries in Node.js with SEA](https://dev.to/zavoloklom/how-to-build-multi-platform-executable-binaries-in-nodejs-with-sea-rollup-docker-and-github-d0g)
