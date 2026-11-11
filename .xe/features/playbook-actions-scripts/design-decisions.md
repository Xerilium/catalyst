# Design Decisions: Playbook Actions - Scripts

## Separate actions per language
**Decision**: Implement three distinct actions (`script`, `bash`, `powershell`) rather than one action with a `lang` parameter.

**Date**: <!-- TODO: determine from git history -->

**Why**: Each language has a fundamentally different execution model (VM context vs. child process), security model, error surface, and capability set; separate actions also provide stronger type safety and cleaner intent.

**Rejected**: Single action with language parameter — required branching logic, weaker typing, and obscured intent.

## JavaScript execution via Node.js VM module
**Decision**: Execute JavaScript in a `vm.createContext()` sandbox with controlled injection of `console`, `get()`, `fs`, and `path`.

**Date**: <!-- TODO: determine from git history -->

**Why**: Provides sufficient isolation for trusted playbook authors without external dependencies; `get()` enables natural nested object access for playbook variables.

**Rejected**: vm2 — archived/unmaintained with known security vulnerabilities; isolated-vm — C++ dependency, overkill for trusted code.

## Shell execution via `child_process.exec`
**Decision**: Use `child_process.exec` (async) with a shared `ShellActionBase` abstract class for bash and PowerShell.

**Date**: <!-- TODO: determine from git history -->

**Why**: Both shell actions are nearly identical (differ only in executable); a shared base class eliminates duplication. Async exec avoids blocking the event loop.

**Rejected**: `execSync` — blocks event loop; `spawn` — more complex, streaming unnecessary for typical playbook scripts.

## Environment variables only for shell actions
**Decision**: Include `env` config on bash/powershell actions; omit it from the `script` action.

**Date**: <!-- TODO: determine from git history -->

**Why**: Environment variables are idiomatic for shell scripts; JavaScript in `script` uses the `get()` function and `{{}}` replacement instead, which is more natural for the VM context.

## Template interpolation before action execution
**Decision**: Template engine performs `{{variable}}` replacement on config before calling `action.execute()`.

**Date**: <!-- TODO: determine from git history -->

**Why**: Separation of concerns — actions receive plain strings and do not need to understand template syntax, keeping action implementations simpler and consistent.

## Unified `Success` code for all actions
**Decision**: All successful operations return the code `'Success'` regardless of which action ran.

**Date**: <!-- TODO: determine from git history -->

**Why**: Action-specific success codes (e.g., `ScriptSuccess`) add no value and complicate error policy mapping.
