---
name: "sitrep"
description: Quick read-only session status check-in
allowed-tools: Read, Glob, Grep
---

# Session Status Report

Quick session status. Read-only — do NOT edit files, run state-changing tools, or invoke AUQ. Be specific with file paths (use path:line format) where relevant. Respond with exactly these lines:

---

## [if initiative: `🎯 Initiative: {initiative-id}`; if rollout: `📦 Rollout: {rollout-id}`; if feature: 💎 Feature: `{feature-id}`, otherwise: 1-5 words describing effort]

⭐️ **Goal:** [one line - the *why*, the original ask or motivating problem]

🛠️ **Working on:** [one line - current task/goal]

✅ **Progress:** [one line - what's done, what remains]

🚧 **Blockers:** [one line - open questions, issues, or "none"]

⏭️ **Next:** [one line - immediate next step]

📁 **Files:** [list of relevant paths with line numbers, or "none"]

---
