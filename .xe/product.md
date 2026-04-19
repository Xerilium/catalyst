# Product Vision

## Purpose

Catalyst is an AI-powered automation framework for software development at scale based on context engineering and spec-driven development principles. It enables autonomous AI software development with reusable playbooks and templates that bring consistency and enterprise-scale quality to projects serving millions of monthly active users. The framework addresses the core problem of AI code generation without context, which can lead to poorly designed software that isn't reliable, doesn't scale, and has security vulnerabilities.

## Product Strategy

Phased implementation priorities guide feature development sequencing and trade-off decisions:

1. Prove the concept works (POC)
2. Perfect the user experience (Mainstream)
3. Deliver breakthrough capability (Innovation)
4. Build extensible foundation (Platform)
5. Enterprise readiness (Enterprise)
6. Scale to broader markets (Scale)

## Design Principles

- **Collaborative: Work with the team, as a team**
  > Catalyst operates within GitHub issues and PRs as a team member, not a tool. Contributions should feel natural in tone, timely, and contextual, as if written by a human with deep understanding. Human-AI collaboration should be seamless.

- **Transparent: Work in the open**
  > Catalyst thinks and acts in the open. All work is traceable by default and reversible by design. Every input, output, decision, and action must be visible, inspectable, and auditable.

- **Autonomous: Act independently, own the outcome**
  > Catalyst takes initiative to make informed decisions and perform safe, reversible actions based on context. Catalyst doesn't wait for step-by-step instructions or pause for questions and clarifications within predefined guardrails and risk thresholds. Catalyst declares intent, provides rationale, and moves forward, leaving final, course-correcting decisions to reviewers.

- **Accountable: Enforce strategic coherence**
  > Catalyst proactively seeks oversight and approval at predetermined human checkpoints. Catalyst never hides logic or bypasses control. Humans define the guardrails, configure risk thresholds, and can opt in, opt out, or override AI autonomy at every stage.

## Personas

- **Developer**: A software developer using Catalyst to build features with AI assistance, operating within IDE environments (Claude Code, Cursor, GitHub Copilot).
- **Project Maintainer**: A technical lead responsible for project configuration, blueprint creation, and feature prioritization.
- **AI Agent**: An autonomous AI system (Claude Code, GitHub Copilot) executing playbooks, generating specifications, and implementing features within Catalyst's guardrails.
- **Playbook Engine**: The Catalyst runtime that parses and executes YAML playbook definitions, managing workflow state and action dispatch.

## Scenarios

### FR:context-engineering: Context Engineering Foundation

AI Agent needs centralized, structured project context in `.xe/` (product, architecture, engineering, process) so that every workflow run has complete context without repeated clarification.

### FR:spec-driven: Spec-Driven Development

Developer needs markdown-based specifications and playbooks so that workflows are consistent, reproducible, and reviewable across features, agents, and projects.

### FR:checkpoints: Human Checkpoint Integration

Project Maintainer needs approval gates at key milestones (spec, plan, implementation, review) so that AI hallucinations are caught early without sacrificing development velocity.

### FR:multi-agent: Multi-Agent Support

Developer needs Catalyst to integrate with multiple AI coding agents (Claude Code via `.claude/commands/`, GitHub Copilot via `.github/prompts/`) so that teams can adopt the framework without changing their AI tooling.

### FR:issue-driven: Issue-Driven Workflows

Project Maintainer needs GitHub issues to drive project initialization, blueprint build-out, and feature tracking so that all work is traceable and resumable from the issue tracker.

### FR:playbook-system: Reusable Playbook System

Playbook Engine needs structured workflow definitions with inputs, outputs, and execution steps so that every project runs the same logic without reinventing process.

### FR:templates: Template Library

Developer needs standardized markdown templates for specs, plans, tasks, and rollout orchestration so that artifacts are consistent across features and contributors.

### FR:enterprise-quality: Enterprise-Scale Quality

Project Maintainer needs Catalyst to produce code that meets reliability, security, and scalability bars for projects serving millions of monthly active users so that the framework is viable for production workloads, not just prototypes.

### FR:progressive-rollout: Progressive Feature Implementation

Project Maintainer needs blueprint-based rollout guides so that large programs of work ship feature-by-feature with human oversight instead of as one monolithic change.

## Customer Journey

See [customer-journey.md](customer-journey.md) for the product-level workflows showing actor interactions and checkpoints through initialization, blueprint build-out, and feature development.

## Team

**Roles:**

- **Product Manager**: @flanakin
- **Architect**: @flanakin
- **Engineer**: @flanakin

**AI Reviewers:**

- Claude Code
- GitHub Copilot
