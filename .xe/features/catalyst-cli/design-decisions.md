# Design Decisions: Catalyst CLI

## CLI framework

**Decision**: Commander.js

**Date**: <!-- TODO: determine from git history -->

**Why**: Lightweight, TypeScript-compatible, supports the `catalyst <domain> <action>` subcommand pattern, low ceremony for adding commands, most popular option with strong community

**Rejected**: Yargs — large dependencies and callback-heavy syntax; oclif — plugin architecture is overkill for current scope, though reconsidered if community extensions become critical

## Dynamic command discovery

**Decision**: Playbooks in `src/resources/cli-commands/*.yaml` are auto-registered as first-class CLI commands at startup

**Date**: <!-- TODO: determine from git history -->

**Why**: Allows domain commands (`init`, `blueprint`, `rollout`) to be added via playbooks without CLI code changes; reuses the existing `runCommand()` path

**Rejected**: Hardcoded command registration — requires code changes for every new command

## Command security model

**Decision**: Load command definitions only from package paths (`dist/resources/cli-commands/`), never from project-local directories

**Date**: <!-- TODO: determine from git history -->

**Why**: Prevents command hijacking by a project's local files overriding package-level commands

## MVP command scope

**Decision**: Ship only infrastructure commands (`--help`, `--version`, `run`) initially; defer all domain commands to follow-on playbooks

**Date**: <!-- TODO: determine from git history -->

**Why**: Underlying features (rollout, blueprint, etc.) are not yet mature enough to expose via CLI; infrastructure must be stable first

## Binary distribution

**Decision**: Ship as a standard Node.js CLI for MVP; defer Node.js SEA (Single Executable Application) compilation to a future phase

**Date**: <!-- TODO: determine from git history -->

**Why**: SEA is still experimental; bundling complexity is not justified until the CLI stabilizes

**Rejected**: vercel/pkg — archived January 2024; Go/Rust — security benefits don't justify maintaining a second language when command hijacking is solved by trusted path loading

## Shell completion

**Decision**: Abandoned; if needed in the future, provide manual installation instructions (matching the approach of `kubectl`, `gh`, `docker`)

**Date**: <!-- TODO: determine from git history -->

**Why**: Auto-install is technically infeasible — zsh requires `fpath` injection before `compinit`, which is too risky to automate; all approaches still require a shell restart

**Rejected**: Eval-based and file-based auto-install — both fail for zsh or require brittle config file manipulation
