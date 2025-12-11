# Documentation Strategy Research

## Executive Summary

Catalyst requires a comprehensive documentation strategy that serves multiple audiences (internal contributors, external users, playbook authors) with distinct content needs and consumption patterns. Based on analysis of the product context, architecture, and existing documentation state, I recommend a **hybrid approach** that combines:

1. **Feature-centric internal documentation** (`.xe/features/{feature-id}/`) for development context
2. **Centralized public documentation** (`docs/`) for end-user consumption and GitHub Pages hosting
3. **Automated documentation generation and validation** to ensure freshness and coverage
4. **Documentation-as-code practices** with quality gates and coverage tracking

This approach balances the autonomy principle (features own their docs) with the transparency principle (unified access for users) while avoiding duplication and maintaining freshness through automation.

## Current State Analysis

### Existing Documentation

**Product & Engineering Context** (`.xe/`):
- [product.md](.xe/product.md) - Product vision, principles, strategy
- [architecture.md](.xe/architecture.md) - System architecture, tech stack, patterns
- [engineering.md](.xe/engineering.md) - Engineering principles and standards
- Well-maintained, foundational, used by AI agents

**Feature Documentation** (`.xe/features/{feature-id}/`):
- ~19 features with varying documentation completeness
- Standard files: `spec.md`, `plan.md`, `tasks.md`, `research.md`
- Mixed quality and freshness (active features more current)
- Excellent for implementation context, not user-facing

**Public Documentation** (`docs/`):
- `docs/playbooks/template-syntax.md` - Template engine syntax guide
- `docs/playbooks/yaml-format.md` - YAML playbook format guide
- Minimal content, but high quality where it exists
- GitHub Pages ready (assumed based on architecture.md)

**Templates** (`src/templates/`):
- Comprehensive templates for specs, plans, tasks, research
- Self-documenting through instructions and examples
- Used by agents to generate consistent documentation

**README Files**:
- Root `README.md` - Minimal (4 lines)
- `.xe/rollouts/README.md` - Index file for rollouts

### Gaps and Issues

1. **No unified external docs** - Users have no clear entry point to learn Catalyst
2. **Feature docs not externalized** - Rich internal specs not accessible to users
3. **No API reference docs** - TypeScript interfaces/classes undocumented
4. **Inconsistent coverage** - Some features well-documented, others minimal
5. **No freshness validation** - Stale docs not detected
6. **Missing playbook action docs** - Actions scattered, no unified reference
7. **No contributing guide** - Barrier to external contributors
8. **No changelog** - Users can't track what's new
9. **README underwhelming** - Doesn't sell the vision or guide users

### Documentation Already Mentioned in Architecture

From [architecture.md:67-69](.xe/architecture.md):

> Public documentation for playbook actions is aggregated in a dedicated playbook-documentation feature rather than distributed across individual action features. This approach avoids documentation duplication, prevents circular dependencies, and provides a unified learning path for playbook authors.

This establishes precedent for **aggregated public docs** separate from feature implementation docs.

## Documentation Audiences and Needs

### Audience 1: End Users (Catalyst Consumers)

**Profile**: Developers integrating Catalyst into their projects via npm

**Needs**:
- Quick start guide to install and initialize
- Conceptual overview of Catalyst's architecture
- Playbook authoring guides (YAML, templates, actions)
- Action reference documentation (all available actions with examples)
- Troubleshooting and FAQ
- Migration guides for version upgrades

**Preferred Format**: Web-based docs (GitHub Pages), searchable, with examples

**Success Metric**: Time to first successful playbook < 30 minutes

### Audience 2: Playbook Authors

**Profile**: Users writing custom playbooks and actions

**Needs**:
- Comprehensive action catalog with configuration options
- Template syntax reference
- Error code reference
- Best practices and patterns
- Action development guide (creating custom actions)
- Debugging and testing playbooks

**Preferred Format**: Web docs + inline IDE hints (JSDoc, schema-based)

**Success Metric**: 90%+ of questions answered in docs without asking maintainers

### Audience 3: Internal Contributors

**Profile**: Developers building and maintaining Catalyst features

**Needs**:
- Architecture context and design decisions
- Feature specifications and implementation plans
- Development workflow and process guides
- Code contribution guidelines
- Testing and quality standards
- Dependency graphs and feature relationships

**Preferred Format**: Markdown in `.xe/` directory (git-versioned, AI-readable)

**Success Metric**: 100% of features have complete spec/plan/tasks docs

### Audience 4: AI Agents (Claude, Copilot)

**Profile**: AI tools generating code, specs, and plans

**Needs**:
- Structured, parseable markdown (frontmatter, headings)
- Complete context without duplication
- Templates to ensure consistency
- Action registry for playbook execution
- Validation schemas for correctness

**Preferred Format**: Markdown with YAML frontmatter, living specifications

**Success Metric**: 80%+ autonomous execution without context clarification

## Documentation Architecture Options

### Option A: Feature-Centric (Status Quo Enhanced)

**Approach**: Documentation lives in feature directories, scripts aggregate for public consumption

**Structure**:
```
.xe/features/{feature-id}/
  spec.md          # Internal spec (what/why)
  plan.md          # Implementation plan (how)
  tasks.md         # Task breakdown
  research.md      # Research and decisions
  docs.md          # NEW: Public-facing docs (optional)

docs/               # Generated from features
  features/
    {feature-id}.md  # Auto-generated from docs.md or spec.md
```

**Pros**:
- Single source of truth per feature
- Features own their documentation
- Easy to keep docs in sync with code
- Aligns with autonomy principle

**Cons**:
- Duplication risk (spec.md vs docs.md)
- Harder to maintain unified narrative
- Requires build-time generation
- May expose internal details to users

### Option B: Centralized Public Docs (Traditional)

**Approach**: Separate documentation repository/directory for all public-facing content

**Structure**:
```
.xe/features/       # Internal only (spec, plan, tasks)

docs/               # All public documentation
  getting-started/
  concepts/
  guides/
  reference/
    actions/
    api/
  contributing/
```

**Pros**:
- Clear separation of internal vs external docs
- Unified user experience
- Easier to craft narrative flow
- Full control over public messaging

**Cons**:
- Risk of docs diverging from code
- Duplication of feature descriptions
- More manual maintenance burden
- Harder to enforce completeness

### Option C: Hybrid (Recommended)

**Approach**: Feature specs remain internal, public docs are curated and aggregated

**Structure**:
```
.xe/features/{feature-id}/
  spec.md          # Internal spec (development context)
  plan.md          # Implementation plan
  tasks.md         # Task breakdown
  research.md      # Research and decisions
  architecture.md  # OPTIONAL: Complex architectural decisions

docs/               # Public-facing documentation
  index.md         # Landing page
  getting-started/
    installation.md
    quick-start.md
  concepts/
    context-engineering.md
    spec-driven-development.md
    playbook-engine.md
  guides/
    playbooks/
      authoring.md
      template-syntax.md  # Exists
      yaml-format.md      # Exists
      testing.md
    actions/
      creating-actions.md
      action-registry.md
    contributing.md
  reference/
    actions/          # Auto-generated from action registry
      ai/
      github/
      controls/
      scripts/
    api/              # Auto-generated from TypeScript
      playbook-engine.md
      template-engine.md
    errors.md         # Error codes catalog
  changelog.md
  faq.md

src/playbooks/scripts/actions/{category}/
  {action-name}.ts  # Action implementation
  {action-name}.doc.md  # OPTIONAL: Detailed action docs (examples, edge cases)
```

**Documentation Generation**:
- Action reference: Auto-generated from ACTION_REGISTRY and JSDoc
- API reference: Generated from TypeScript via TSDoc
- Feature overview: Manually curated (links to relevant actions/APIs)

**Pros**:
- Clear audience separation (internal vs external)
- Features maintain implementation context
- Public docs curated for user experience
- Automation reduces manual burden
- Avoids duplication (generate from code)
- Scalable as feature count grows

**Cons**:
- Requires build tooling for generation
- Public docs need manual curation
- More complex documentation workflow

## Automation and Quality Strategy

### Documentation Generation

**Auto-Generate**:
1. **Action Reference** - From ACTION_REGISTRY + JSDoc
   - Parse action metadata (dependencies, config schema)
   - Extract JSDoc descriptions and examples
   - Generate markdown reference pages
   - Update on every build

2. **API Reference** - From TypeScript interfaces
   - Use TSDoc or similar tool
   - Generate from public APIs only
   - Include code examples from tests
   - Update on every build

3. **Feature Index** - From feature frontmatter
   - Scan `.xe/features/` for all spec.md files
   - Extract id, title, description, dependencies
   - Generate dependency graph visualization
   - Show feature completion status

**Manual Curation**:
1. Guides and tutorials (human-written, examples)
2. Conceptual overviews (architecture explanations)
3. Troubleshooting and FAQ (based on user issues)
4. Migration guides (version upgrade paths)

### Coverage and Freshness Validation

**Pre-commit Hooks**:
- Validate all features have required docs (spec, plan, tasks)
- Check frontmatter completeness (id, title, dependencies)
- Run markdown linter (consistent style)
- Validate internal links (no broken references)

**CI Validation**:
- All actions have JSDoc descriptions
- All public APIs have TSDoc comments
- Generated docs are up-to-date (fail if out of sync)
- External links are reachable (weekly check)
- No TODO/FIXME in public docs

**Coverage Tracking**:
- Document coverage percentage (# features with docs / total features)
- Action coverage percentage (# actions with docs / total actions)
- API coverage percentage (# APIs with TSDoc / total public APIs)
- Target: 90%+ coverage for all categories

**Freshness Validation**:
- Flag docs not updated in 90+ days (feature-specific)
- Flag docs referencing deprecated code
- Require doc updates with breaking changes
- Review stale docs quarterly

### Opt-Out Mechanism

**Feature Opt-Out**:
- Features can opt out of public docs via frontmatter: `public: false`
- Internal-only features (e.g., build tools) don't need external docs
- Opt-out must be explicit, not default
- Opt-out reason required for audit trail

**Action Opt-Out**:
- Internal/experimental actions: `@internal` JSDoc tag
- Deprecated actions: `@deprecated` JSDoc tag with migration path
- Not included in public action reference

## Integration with Catalyst Workflow

### Feature Development Lifecycle

**Phase 1: Specification**
- Create `spec.md` (internal, defines what/why)
- No public docs required yet

**Phase 2: Planning**
- Create `plan.md` and `research.md` (internal)
- If feature is user-facing, add `docs: required` to spec frontmatter

**Phase 3: Implementation**
- Write code with JSDoc/TSDoc comments
- If action created, add JSDoc with examples
- If public API, add TSDoc with usage examples

**Phase 4: Documentation (NEW)**
- If `docs: required` in spec, create/update public docs
- Run doc generation scripts
- Validate doc coverage passes
- Human review of generated docs for accuracy

**Phase 5: PR Review**
- Doc coverage check in CI (fails if required docs missing)
- Generated docs included in PR for review
- Reviewer validates user-facing docs are clear

**Phase 6: Release**
- Update CHANGELOG.md
- Generate updated docs site
- Deploy to GitHub Pages

### Scripts and Tooling

**Documentation Scripts**:
1. `npm run docs:generate` - Generate all auto-generated docs
2. `npm run docs:validate` - Check coverage and freshness
3. `npm run docs:serve` - Local preview of docs site
4. `npm run docs:deploy` - Deploy to GitHub Pages

**IDE Integration**:
- VSCode extension for doc templates (snippets)
- Markdown preview for docs/ folder
- Link validation in editor
- Schema validation for action docs

## Precedents and Best Practices

### Similar Projects

**Playwright**:
- Docs site with API reference auto-generated from code
- Guides manually curated
- Clear separation of concepts vs reference

**Terraform**:
- Provider docs auto-generated from schema
- User guides manually written
- Registry for browsing providers

**GitHub Actions**:
- Action metadata in YAML (action.yml)
- README.md for each action
- Marketplace aggregates action docs

### Catalyst-Specific Considerations

**Alignment with Product Principles**:
- **Collaborative**: Docs enable team collaboration
- **Transparent**: All decisions documented and visible
- **Autonomous**: Automation reduces manual burden
- **Accountable**: Coverage metrics enforce quality

**Alignment with Engineering Principles**:
- **DRY**: Generate from code, don't duplicate
- **Single Responsibility**: Features own internal docs, public docs are separate concern
- **Fail Fast**: CI fails if docs incomplete
- **Design for Testability**: Doc validation scripts

## Recommendation: Hybrid Approach with Automation

**Implementation Strategy**:

1. **Short-term (Phase 1 - POC)**:
   - Create `docs/` structure with manual guides
   - Write getting-started and key concept docs
   - Enhance README.md with compelling intro
   - Set up GitHub Pages deployment

2. **Medium-term (Phase 2 - Mainstream)**:
   - Implement action reference auto-generation
   - Add doc coverage validation to CI
   - Create contributing guide
   - Set up doc preview in PRs

3. **Long-term (Phase 3 - Platform)**:
   - API reference auto-generation from TypeScript
   - Interactive doc examples (try in browser)
   - Doc search functionality
   - Multi-version doc hosting

**Immediate Next Steps**:
1. Create feature spec for documentation feature
2. Define doc templates and frontmatter schemas
3. Implement basic action reference generation
4. Write core user-facing guides manually
5. Set up CI validation for doc coverage

## Open Questions for Human Review

1. **GitHub Pages vs. Dedicated Hosting?** - Should we use GitHub Pages (simple, free) or invest in dedicated docs hosting (better search, versioning)?

2. **Doc Versioning Strategy?** - Do we need versioned docs (e.g., docs for v0.1 vs v0.2), or is latest-only sufficient for now?

3. **API Stability Guarantees?** - Should we document API stability levels (experimental, stable, deprecated) and enforce semver?

4. **Community Contribution Path?** - Do we accept external PRs for docs? If so, what's the review process?

5. **Internal vs Public Architecture Docs?** - Should architecture decisions stay internal-only, or expose some to users for transparency?

6. **Doc Review Frequency?** - How often should we audit docs for freshness? Quarterly? Per release?

## Success Criteria for Documentation Feature

1. **Coverage**: 90%+ of user-facing features and actions have public docs
2. **Freshness**: 0 docs stale for 90+ days without justification
3. **Discoverability**: Users can find answers within 3 clicks from home page
4. **Completeness**: 0 broken links or missing references in public docs
5. **Automation**: 80%+ of reference docs auto-generated from code
6. **Adoption**: 50%+ reduction in "how do I...?" issues filed

## Appendix: Feature Dependency Graph

This documentation feature depends on:
- **playbook-definition** - For action registry structure
- **playbook-engine** - For execution context and error handling
- **error-handling** - For error code documentation

This feature does NOT depend on individual action features to avoid circular dependencies. Instead, it reads from the ACTION_REGISTRY and code annotations.
