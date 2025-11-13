# Catalyst

Your AI-powered product team. Autonomous engineering. Zero burnout.

## Recent Changes

### Command Prefix Update (v0.1.4)

Non-namespaced command prefixes have been updated from `catalyst-` to `catalyst.` for consistency with namespacing conventions:

- Commands: `/catalyst-init` → `/catalyst.init`, `/catalyst-run` → `/catalyst.run`, etc.
- Generated files: `catalyst-<cmd>.ext` → `catalyst.<cmd>.ext`
- CLI executable: `catalyst-github` → `catalyst.github`

If you have scripts or automation that reference the old dash format, please update them to use the dot format.
