# Catalyst Product Context

## System Overview

Catalyst is an AI-powered automation framework for software development at scale based on context engineering and spec-driven development principles. It enables autonomous AI software development with reusable playbooks and templates that bring consistency and enterprise-scale quality to support millions of monthly active users. The framework addresses the core problem of AI code generation without context, which can lead to poorly designed software that isn't reliable, doesn't scale, and has security vulnerabilities.

## Product Strategy

Phased implementation priorities guide feature development sequencing and trade-off decisions:

1. Prove the concept works (POC)
2. Perfect the user experience (Mainstream)
3. Deliver breakthrough capability (Innovation)
4. Build extensible foundation (Platform)
5. Enterprise readiness (Enterprise)
6. Scale to broader markets (Scale)

## Technical Requirements

- **Context Engineering Foundation**: Centralized context storage in `.xe/` directory with structured context files (product, architecture, engineering, process)
- **Spec-Driven Development**: Markdown-based specifications and playbooks for consistent, reproducible workflows
- **Human Checkpoint Integration**: Approval gates at key milestones (spec → plan → tasks) to prevent AI hallucinations while maintaining velocity
- **Multi-Agent Support**: Integration with Claude Code (`.claude/commands/`) and GitHub Copilot (`.github/prompts/`) with extensibility for future AI agents
- **Issue-Driven Workflows**: GitHub integration for project initialization and feature tracking via initialization issues, blueprint issues, and feature issues
- **Reusable Playbook System**: Structured workflows with defined inputs, outputs, and execution steps stored in `node_modules/@xerilium/catalyst/playbooks/`
- **Template Library**: Standardized markdown templates for specs, plans, tasks, and rollout orchestration
- **Enterprise-Scale Quality**: Support for projects serving millions of monthly active users with reliability, security, and scalability requirements
- **Progressive Feature Implementation**: Blueprint-based rollout guides enabling features to be implemented one-by-one with human oversight

## Success Metrics

- **Adoption Rate**: Successfully package and distribute Catalyst as npm package for reuse across multiple projects
- **Consistency Score**: 90%+ adherence to standardized templates and playbooks across all implementations
- **Quality Gates**: 100% of deliverables pass human review at spec, plan, and task checkpoints before implementation
- **Velocity**: Reduce time from feature concept to production-ready code by 50% compared to manual workflows
- **Autonomy Level**: Achieve 80% autonomous execution between human checkpoints while maintaining quality standards

## Non-Goals

- **Full Automation**: Catalyst will NOT attempt to eliminate human oversight - human checkpoints at deliverables are core to the design
- **GitHub App Development**: The current phase (Manual MVP) does NOT include building the GitHub app automation layer - this is future work
- **Pre-Existing Code Migration**: Catalyst does NOT automatically migrate legacy codebases - it's designed for new development and progressive enhancements with manual migration support

## Team

**Roles:**

- **Product Manager**: @flanakin
- **Architect**: @flanakin
- **Engineer**: @flanakin

**AI Reviewers:**

- Claude Code
- GitHub Copilot
