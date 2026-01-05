# Engineering Principles

> [INSTRUCTIONS]
> Define engineering principles and standards. Focus on timeless, actionable guidelines that guide AI and human development. Remove any principles that don't fit this project. Minimize token usage by keeping principles concise.

## Core Principles

- **KISS**: Simple, straightforward solutions over complex ones, avoid premature optimization
- **YAGNI**: Build only what is needed, avoid implementing features "just in case"
- **Separation of Concerns**: Logic organized by purpose, components have single responsibilities
- **Single Responsibility**: Each module handles exactly one well-defined function
- **Open/Closed**: Open for extension, closed for modification via configuration and composition
- **Dependency Inversion**: Depend on abstractions, not concrete implementations
- **Principle of Least Astonishment**: Behavior matches user expectations, consistent patterns
- **DRY**: Single source of truth, no duplication of logic or configuration
- **Fail Fast**: Detect and report errors immediately with clear, actionable messages
- **Design for Testability**: Easy to test and validate, comprehensive coverage
- **Deterministic Processing**: Consistent, predictable output for identical inputs

## Technical Standards

See `.xe/standards/` for language-specific coding standards and conventions.

> [INSTRUCTIONS]
> Define project-specific quality standards. The Quality section must include priority classifications, priority threshold, and coverage targets. Optionally add other technical standards if they provide actionable implementation guidance.

- **Quality**
  - Priority classifications:
    - P1 (Critical): Security, data integrity, core functionality
    - P2 (Important): Error handling, key features, integration points
    - P3 (Standard): Regular functionality, validation, formatting
    - P4 (Minor): Performance + optimizations, tooling, automation
    - P5 (Informational): Documentation, process
  - Priority threshold: P3
    - Requirements traceability: 100%
    - Code coverage: 90%

## Development Process

See `.xe/process/development.md` for the complete development workflow and implementation process.
