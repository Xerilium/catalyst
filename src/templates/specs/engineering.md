# Engineering Principles for {project-name}

> [INSTRUCTIONS]
> This document defines engineering principles and standards for {project-name}. Select and customize principles from established best practices, prioritizing enterprise-grade reliability, scalability, and maintainability. Keep the list to 8-12 core principles—focus on timeless, actionable guidelines that guide AI and human development. Add project-specific principles only if they address unique constraints. Remove all instruction blocks after completion.

## Core Principles

> [INSTRUCTIONS]
> Choose from or adapt these standard principles. For each selected principle, provide a brief rationale (1-2 sentences) explaining why it applies to {project-name}. Prioritize principles that reduce complexity, ensure consistency, and support AI-assisted workflows with human checkpoints.

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
> Reference language-specific standards in `.xe/standards/`. Customize these categories based on the project tech stack and requirements. Keep to high-level guidelines, not implementation details. Prioritize standards that support AI-assisted development, scalability, and enterprise reliability. Remove or adapt categories that don't apply.

- **Architecture**
  - Clear directory organization
  - Standardized naming conventions
  - Reusable, modular features and components
  - Platform-native patterns

- **User Experience**
  - Minimize technical barriers
  - Clear progress indicators
  - Professional output quality
  - Accessible to non-technical users

- **Reliability**
  - Robust error handling and recovery
  - Data validation at each step
  - Consistent state management
  - Reproducible results

- **Quality**
  - 90% code coverage target for all features
  - 100% coverage for critical paths and error handling
  - Complete specifications and implementation plans
  - Clear documentation for complex logic and architectural decisions

## Development Process

See `.xe/process/development.md` for the complete development workflow and implementation process.
