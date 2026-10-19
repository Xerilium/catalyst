---
id: feedback-loop
title: Feedback Loop
description: Command-agnostic post-run feedback collection to drive iterative improvement of playbooks and AI behavior.
dependencies:
  - context-storage
  - ai-plugin
  - feature-context
---

<!-- markdownlint-disable single-title -->

# Feature: Feedback Loop

## Purpose

Provide a command-agnostic feedback collection mechanism that runs after Catalyst workflow runs, capturing structured evaluation of workflow efficiency and quality to drive iterative improvement of playbooks, skills, and AI behavior during dogfooding.

## Scenarios

### FR:playbook: Feedback Playbook

AI Agent needs to evaluate workflow efficiency and quality after a command run so that playbooks can be iteratively improved based on observed execution patterns.

- **FR:playbook.location** (P1): System MUST provide a feedback playbook at `src/resources/playbooks/invoke-retrospective.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:playbook.evaluate** (P1): Playbook MUST self-assess workflow execution and pick the single most impactful improvement
  - Assessment dimensions: user friction, instruction adherence, phase effectiveness, token efficiency, AUQ quality, artifact quality
- **FR:playbook.recommend** (P1): Playbook MUST present the single recommendation via AUQ with actionable routing options
  - Distinguishes between playbook-specific fixes and general workflow patterns
- **FR:playbook.command-agnostic** (P1): Playbook MUST be command-agnostic with no knowledge of specific commands or playbooks
  - Relies on conversation context (the AI already knows what ran) rather than hardcoded references
- **FR:playbook.routing** (P2): Playbook MUST offer the user a choice of where to route the improvement
  - **FR:playbook.routing.update-playbook** (P2): Option to modify the playbook file that had the issue
  - **FR:playbook.routing.feature-file** (P2): Option to append to `.xe/features/{feature-id}/feedback.md` via the shared feedback-write action at `src/resources/playbooks/actions/feedback-write.md`
    > - @req FR:context-storage/playbooks.framework
    > - @req FR:feature-context/feedback.@file
    > - @req FR:feature-context/feedback.template
    - Action MUST specify: target path, template source, H2 grouping discipline, bullet format, and a quality gate requiring the proposed fix be verified against the original problem in terse, minimal format
  - **FR:playbook.routing.github-issue** (P3): Option to create a GitHub issue to track the improvement

### FR:inject: Feedback Injection into Skills

Developer needs feedback collection injected into every Catalyst skill without modifying skill source templates so that feedback runs automatically during dogfooding.

- **FR:inject.script** (P1): System MUST provide an injection script that modifies generated skill files post-build
  > - @req FR:ai-plugin/build.self-host
- ~~**FR:inject.all-providers**~~: [deprecated: FR:inject.plugin-skills]
- **FR:inject.plugin-skills** (P1): Script MUST inject feedback into every skill of the self-hosted plugin (`.claude/skills/catalyst/skills/*/SKILL.md`)
- **FR:inject.preamble** (P2): Script MUST insert a preamble after the frontmatter of each skill instructing AI to track workflow quality and efficiency throughout the run for later feedback collection
  - Preamble MUST also reinforce AUQ compliance as a persistent reminder throughout the run
- **FR:inject.trigger** (P1): Script MUST append a feedback playbook reference at the bottom of each skill so feedback collection runs after the main workflow completes
- ~~**FR:inject.provider-conventions**~~: [deprecated: FR:inject.preamble]
- **FR:inject.source-safe** (P1): Script MUST NOT modify skill templates in `src/resources/ai-plugin/skills/` or the packaged plugin
  - Only modifies the self-hosted plugin copy
- **FR:inject.build-integration** (P2): Build process MUST invoke the injection script after installing the self-hosted plugin
  - Injection only runs during local development builds, not during package publishing

## Architecture Constraints

**AC:decoupled**: Feedback-loop MUST NOT depend on any specific command or workflow playbook. The coupling is by convention only — the injection script appends a playbook reference to generated skill files. The feedback playbook and the workflow playbooks have no knowledge of each other.

**AC:local-only-injection**: The injection mechanism is a development-time concern. The feedback playbook ships with the package (available to any consumer), but the injection script only runs in this repository's build process. Consumers who want feedback collection wire it up themselves.

## External Dependencies

None
