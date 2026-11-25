---
name: "sitrep"
description: Quick read-only session status check-in
allowed-tools: Read, Glob, Grep, Bash(git status:*), Bash(git log --oneline:*), Bash(git branch --show-current:*), Bash(gh pr view:*), Bash(gh pr checks:*), Bash(gh pr list:*)
argument-hint: [tldr]
Usage: /catalyst:sitrep [tldr]
Examples: /catalyst:sitrep, /catalyst:sitrep tldr
---

# Session Status Report

Quick session status. Read-only check-in — do NOT edit files, run state-changing tools, or invoke AUQ.

Mode: argument `tldr` → tldr report. No argument → full report.

## Step 1: Read live state

Read fresh state in every run, before you write a word. Take Goal from the conversation. Take every other value from this run's reads. Never use memory, an earlier sitrep, or a guess as a status source.

- Git: `git status`, `git log --oneline -10`, `git branch --show-current` for the session's repo or worktree. Never pass `--output`.
- PRs and CI: `gh pr view` and `gh pr checks` for each PR the session touched
- Tasks: the active rollout (`.xe/rollouts/rollout-*.md`) Active State and checkboxes, plus todo list state
- Files: read each file the report names

If a read fails, write `unknown` for that value. Do not fill it from memory.

## Step 2: Report

Comms rules for both modes:

- Simplified Technical English. State only current state, blockers, and next steps. No fluff. No recap.
- Each paragraph under 20 words. Each bullet under 10 words. Full report under 100 words. Less is better.
- Write each PR as `[{number}]({full-url})`. Never `#123` or a bare number.
- Blocked on the developer: start the blocker with `Need your {ack|response|...}...`.
- Use path:line for files.

After the report, while the same ask waits for a reply, write only `...` in unprompted messages. A new ask comes up: write `---`, then the new ask as a separate message under the same limits.

### Full report

## [if initiative: `🎯 Initiative: {initiative-id}`; if rollout: `📦 Rollout: {rollout-id}`; if feature: 💎 Feature: `{feature-id}`, otherwise: 1-5 words describing effort]

⭐️ **Goal:** [the _why_: original ask or motivating problem]

🛠️ **Working on:** [current task]

✅ **Progress:** [done and remaining]

🚧 **Blockers:** [`Need your ...` or "none"]

⏭️ **Next:** [immediate next step]

📁 **Files:** [relevant path:line list, or "none"]

### tldr report

Under 50 words:

## [same header as full report]

🛠️ **Now:** [current state in one line]

⏭️ **Next:** [immediate next step]

🚧 [`Need your ...` line — only when blocked]

## Step 3: Continue

The check-in ends with the report. Then resume the in-flight task under that task's own rules. A report never ends the session's work.
