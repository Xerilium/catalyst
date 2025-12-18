---
id: req-traceability
title: Requirement Traceability Research
author: "@flanakin"
description: "Research findings, analysis, and design decisions for the Requirement Traceability feature"
---

# Research: Requirement Traceability

## Overview

This document captures research findings, industry best practices, and design decisions for implementing requirement traceability in Catalyst. The goal is to enable bidirectional links between requirements defined in specifications and their implementations in code/tests.

## Executive Summary

**Recommendation: Proceed with Implementation**

Requirements traceability provides clear value for Catalyst's use case:

1. **Validation of AI-generated code**: Ensures AI agents implement all specified requirements
2. **Refactoring safety**: Tracks which requirements are affected by code changes
3. **Coverage visibility**: Identifies gaps between specs and implementation
4. **Compliance foundation**: Enables future audit/compliance capabilities

The investment is justified because:
- Lightweight annotation-based approach has low adoption friction
- Build-time validation catches issues early
- Integrates naturally with existing Catalyst spec/plan workflow
- Research shows 24% faster task completion and 50% fewer errors with traceability support

---

## Market Research

### Industry Growth & Adoption

**Market Size**:
- Current market: $1.2-1.86B (2024)
- Projected market: $4.3-5.8B (2033)
- Growth rate: 13.4-15.2% CAGR

**Key Insight**: Strong market growth indicates requirements traceability is becoming standard practice, not optional.

### Demonstrated ROI

**Cost Savings**:
- 70% of rework is due to requirements issues
- Average rework cost: ~$504K per project
- 10% reduction in development costs = $50K+ savings per project

**Quantified Benefits from Research**:
- **24% faster task completion** with traceability support ([itemis blog](https://blogs.itemis.com/en/feature-of-the-month-march-2017-tracing-requirements-and-source-code))
- **50% more correct implementations** when developers have traceability data
- **Lower defect rates** in components with complete traceability data
- **35% effort reduction** using value-based traceability (VBRT) vs. full tracing
- **75% reduction** in audit preparation time

**Key Insight**: ROI is measurable and significant, particularly for projects with regulatory requirements or high quality standards.

### Benefits Analysis

**Quality Assurance**:
- Early defect detection
- Ensures requirements are actually implemented
- Streamlines testing and validation
- Reduces "forgotten requirements" syndrome

**Risk Management**:
- Identifies potential issues early in development
- Tracks requirement evolution
- Prevents scope creep
- Enables impact analysis for changes

**Project Management**:
- Better planning and estimation
- Improved stakeholder communication
- Transparency into development progress
- Alignment with business objectives

**Compliance & Auditing**:
- Critical for regulated industries (medical, aerospace, automotive)
- Reduces audit preparation time by 75%
- Provides documentation trail

---

## Industry Best Practices

### What Works Well

Based on research from [Inflectra](https://www.inflectra.com/Ideas/Topic/Requirements-Traceability.aspx), [TestRail](https://www.testrail.com/blog/requirements-traceability-matrix/), [Perforce](https://www.perforce.com/resources/alm/requirements-traceability-matrix), and [Visure Solutions](https://visuresolutions.com/blog/traceability-matrix/):

1. **Early adoption**: Establish traceability from project start, not retrofitted later
2. **Clear ID conventions**: Simple, memorable IDs like `FR-001` or `REQ-auth-login`
3. **Immutable identifiers**: IDs never change, even when requirements are deleted or reorganized
4. **Bidirectional linking**: Navigate from requirement → code AND code → requirement
5. **Continuous maintenance**: Update traceability as code evolves, not in batches
6. **Automated validation**: Integrate checks into build/CI to catch drift early
7. **Stakeholder connection**: Link requirements to owners for decision-making

### What Doesn't Work

1. **Spreadsheet-based tracking**: Labor-intensive, error-prone, quickly becomes stale ([Wikipedia](https://en.wikipedia.org/wiki/Requirements_traceability))
2. **Sequential numbering only**: FR-1, FR-2, FR-3 breaks when requirements are reordered
3. **Manual link maintenance**: Forgotten updates create false sense of coverage
4. **Overly granular tracing**: Tracing to individual lines creates maintenance burden
5. **100% coverage mandates**: Creates annotation fatigue without proportional value
6. **Complex tooling requirements**: High barrier to adoption reduces compliance

### Challenges

From [ResearchGate](https://www.researchgate.net/publication/235353186_Why_Software_Requirements_Traceability_Remains_a_Challenge) and [PMI](https://www.pmi.org/learning/library/requirement-traceability-tool-quality-results-8873):

1. **Tool integration complexity**: Distributed information across tool chains
2. **Maintenance overhead**: Keeping traceability current during rapid development
3. **Granularity decisions**: Balancing detail level with maintenance cost
4. **Multi-file implementations**: Requirements spanning multiple files/modules
5. **Feature evolution**: Handling requirement splits, merges, and renames

---

## Competitive Landscape

### Existing Commercial Solutions

**Enterprise Tools** (Inflectra, Jama Software, Visure):
- Cost: $1000s-$10000s per year
- Target: Large enterprises, regulated industries
- Features: Full ALM suites, compliance reporting, visual matrices
- Deployment: Cloud SaaS or on-premise
- Integration: Jira, Azure DevOps, enterprise systems

**Limitations**:
- Heavyweight, complex setup
- Not designed for markdown-based workflows
- Poor fit for small teams or OSS projects
- No integration with Catalyst's spec-driven development model

### Open Source Alternatives

**Reqflow** (GPLv2+):
- **Approach**: Document analysis using regex patterns
- **Formats**: DOCX, ODT, HTML, PDF, plain text
- **Method**: Scans documents for requirement IDs and cross-references
- **Output**: Traceability matrices (text, CSV, HTML)
- **Limitations**: Document-focused, not code-focused

**Doorstop** (Python):
- **Approach**: Requirements as markdown in version control
- **Method**: Hierarchical requirement documents with unique IDs
- **Features**: Git-native, diff/blame tracking
- **Limitations**: Python-based, separate requirement documents

**Key Insight**: No existing tool provides lightweight, inline code annotation for TypeScript/Node.js projects with markdown-based specs.

### Requirement ID Patterns in Industry Tools

A detailed analysis of how existing tools format requirement identifiers:

| Tool | ID Format | Example | Characteristics |
|------|-----------|---------|-----------------|
| **IBM DOORS** | `PREFIX + NUMBER` | `REQ-123`, `KKK456` | Module-specific prefix, sequential auto-number, customizable per module |
| **Jama Connect** | `PROJECT-SET-NUMBER` | `PROJ-REQ-123` | Three-part: project key + set key + counter; project key is 1-16 chars |
| **Polarion ALM** | `PREFIX-NUMBER` or `PREFIX-NUMBER-SUFFIX` | `ABC-5`, `BR-100-Web` | Configurable prefix/suffix (up to 5 chars each), step intervals supported |
| **Doorstop** | `PREFIX + PADDED_NUMBER` | `REQ001`, `HLR001`, `LLR001` | Document prefix + sequential 3-digit number, stored as YAML files |
| **Helix ALM (Perforce)** | `PREFIX-NUMBER-SUFFIX` | `BR-100-Web` | Prefix up to 5 chars, optional suffix, helps identify requirement types |
| **TestRail** | `C + NUMBER` | `C123`, `C15` | "C" prefix for test cases; references field links to external req IDs |
| **Azure DevOps** | `NUMBER` (plain) | `123`, `45678` | Auto-assigned unique integer per organization; type indicated by work item type |
| **ReqIF Standard** | `GUID` (technical) + `ForeignID` (human) | GUID: `550e8400-e29b...`, ForeignID: `REQ-42` | Dual system: GUID for interchange, human-readable for display |

**Sources**: [Doorstop](https://doorstop.readthedocs.io/), [Jama Support](https://support.jamasoftware.com/hc/en-us/articles/26320313010061-Item-ID-breakdown-and-what-can-we-modify-from-it), [IBM DOORS](https://www.ibm.com/support/pages/modifying-object-identifier-prefix-ibm-rational-doors), [Polarion Extensions](https://extensions.polarion.com/extensions/129-create-own-identifiers), [Helix ALM](https://help.perforce.com/helix-alm/helixalm/2024.1.0/sdk/Content/SDK/FormattingNameFields.htm), [TestRail](https://support.testrail.com/hc/en-us/articles/7077292642580-Cases), [Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/boards/work-items/about-work-items), [ReqIF Academy](https://www.reqif.academy/forums/topic/which-kind-of-identifier-to-use-for-which-purpos/)

### Key Observations from Industry Patterns

#### Common Pattern: PREFIX + NUMBER

- Nearly all tools use some form of `PREFIX-NUMBER`
- Prefixes are typically 2-5 characters
- Numbers are auto-incremented integers

#### Weaknesses of Pure Sequential IDs

- IBM DOORS explicitly warns: "You should never give the DOORS 'Absolute Number' a meaning besides the numbers being unique"
- Sequential numbers have no semantic meaning
- Renumbering is problematic (IDs become stale references)

#### ReqIF Dual-ID Approach

- Technical ID (GUID) for tool interchange
- Human-readable ID (ForeignID) for discussion
- Best practice: maintain mapping table between them

#### Annotation Tag Patterns

- Parasoft DTP: `@req <ID>` in code comments
- Polarion: `@req <ID>` or `@test <ID>` annotations
- Doxygen: Custom `@req{ID}` and `@satisfy{@req{ID}}` aliases
- JUnit 5 proposal: `@Requirement("REQ-123")` annotation

### Why Catalyst Needs a Different Approach

The industry standard `PREFIX-NUMBER` pattern has limitations for our use case:

1. **No feature grouping**: `REQ-123` doesn't indicate which feature it belongs to
2. **No category filtering**: Can't easily find all performance requirements
3. **Temptation to renumber**: When specs reorganize, sequential numbers want to change
4. **Cross-project conflicts**: `REQ-123` in one feature vs. another is ambiguous

#### Catalyst's Hierarchical Format

Our format addresses these limitations:

- `playbook-engine.func.validate-steps` → Feature grouping
- `*.perf.*` → Category filtering
- Descriptive names → No renumbering temptation
- Globally unique → No cross-project conflicts

### Market Gap Analysis

**What exists**:
- Enterprise ALM suites (expensive, complex)
- Document-based traceability (separate from code)
- Python-based markdown tools (wrong tech stack)

**What's missing**:
- Lightweight code annotation (`@req` tags in comments)
- TypeScript/Node.js native implementation
- Integration with markdown spec files in version control
- Developer-first workflow (minimal overhead)
- Catalyst-specific integration (spec.md → code → tests)

**Catalyst Opportunity**: Build the first developer-friendly, TypeScript-native, markdown-integrated requirements traceability solution.

---

## Design Decisions

### Decision 1: Annotation-Based Traceability

**Decision**: Use comment-based `@req` annotations in source code rather than external link files.

**Alternatives Considered**:

1. **External link files** (`.traceability.json`, `.req-links`)
   - Pro: Doesn't touch source code, centralized management
   - Con: Easily drifts from reality, separate maintenance burden, not visible during code review

2. **Inline annotations in comments** (chosen)
   - Pro: Travels with code during refactoring, visible in diffs, IDE support possible
   - Con: Slightly clutters source, language-specific comment syntax

3. **Structured metadata in dedicated files** (e.g., requirements.yaml per feature)
   - Pro: Clean source code
   - Con: Disconnected from implementation, easily forgotten

**Rationale**:

- Annotations in code are the single source of truth for "what implements what"
- Standard pattern used by Parasoft, Doxygen, and proposed for JUnit 5 ([GitHub Issue](https://github.com/junit-team/junit5/issues/1900))
- Moves with code during refactoring (unlike external files)
- Visible during code review, making traceability part of normal workflow
- Language-agnostic (any language with comments can use `@req`)

### Decision 2: Hierarchical Requirement IDs with Immutable Names

**Decision**: Use format `{TYPE}:{scope}/{path}` with immutable, descriptive names.

**Why Industry Tools Use Sequential Numbers**:
- Human convenience: `REQ-42` is easy to say in meetings
- But they're often NOT immutable: "if elements are reordered they get new numbers"
- IBM DOORS warns: "never give the Absolute Number a meaning besides being unique"
- ReqIF uses dual system: GUID internally, human-readable "ForeignID" externally

**Alternatives Considered**:

1. **Sequential numbers only** (`FR-001`, `FR-002`)
   - Pro: Simple, familiar, short
   - Con: No meaning, temptation to renumber, no feature grouping

2. **GUIDs**
   - Pro: Globally unique, immutable by nature
   - Con: Unmemorable (`550e8400-e29b-41d4-a716-446655440000`), hard to discuss

3. **Dual-ID system** (like ReqIF)
   - Pro: Short IDs for discussion, GUIDs for technical tracking
   - Con: Requires mapping table, IDs can drift

4. **Hierarchical with descriptive names** (chosen)
   - Pro: Self-documenting, grouped by feature, immutable, searchable, grep-friendly
   - Con: Longer than numbers (25-55 chars), requires naming discipline

**Format**: `{TYPE}:{scope}/{path}`
- `TYPE`: Requirement type (`FR`, `NFR`, `REQ`)
- `scope`: Feature or initiative ID (kebab-case)
- `path`: Hierarchical requirement path within spec (dot-separated)

**Delimiter Options Considered**:

| Format | Example | Notes |
|--------|---------|-------|
| `FR:scope/path` | `FR:playbook-engine/templates.syntax.var-interpolation` | Colon for type, slash for scope |
| `FR/scope/path` | `FR/playbook-engine/templates.syntax.var-interpolation` | All slashes |
| `[FR]path` | `[FR]templates.syntax.var-interpolation` | Brackets for type |

**Recommended**: `FR:scope/path` - each delimiter has one job.

**Spec Format** (full path at every level for grep):
```markdown
- **FR:templates.syntax.var-interpolation**:
  Simple variable interpolation: `{{variable-name}}` for direct string substitution
```

**Code Format**:
```typescript
// @req FR:playbook-template-engine/templates.syntax.var-interpolation
```

**Rationale**:

- Type prefix (FR/NFR/REQ) enables filtering by requirement type
- Feature grouping enables per-feature coverage reports
- Descriptive names are self-documenting and searchable
- Full IDs at every level means grep finds both spec and code
- Immutability prevents broken links
- No mapping table needed - spec ID + feature context = full code ID

### Decision 3: Multi-File Implementation Strategy

**Decision**: Annotate primary implementation file(s); use test annotations to verify coverage.

**Alternatives Considered**:

1. **Annotate all files** that touch a requirement
   - Pro: Complete traceability
   - Con: Massive annotation burden, annotation fatigue, maintenance nightmare

2. **Annotate entry point only**
   - Pro: Minimal annotations
   - Con: Misses distributed implementations, incomplete coverage data

3. **Primary files + tests** (chosen)
   - Pro: Balanced coverage, tests provide verification layer
   - Con: Requires judgment about "primary"

**Strategy**:

1. **Code annotations**: Place `@req` at the primary implementation location(s)
   - For functions: At the function definition
   - For classes: At the class or key method
   - For multi-file: At the orchestrating/entry point code

2. **Test annotations**: Every test that verifies a requirement uses `@req`
   - Tests provide secondary traceability layer
   - Verifies requirements are actually tested, not just implemented

3. **Partial implementation marker**: Use `@req:partial` for distributed implementations
   - Indicates this file contributes to requirement but isn't complete implementation
   - Enables accurate coverage reports

**Rationale**:

- Research shows tracing to function level is optimal balance of granularity vs. maintenance ([itemis](https://blogs.itemis.com/en/feature-of-the-month-march-2017-tracing-requirements-and-source-code))
- Tests are natural verification point for requirements
- Partial marker acknowledges reality of distributed implementations
- Avoids "annotation everywhere" fatigue

### Decision 4: Requirement State Model

**Decision**: Support explicit lifecycle states for requirements in specs to distinguish intentional non-implementation from gaps.

**Industry Research** ([StarTeam SDK](https://admhelp.microfocus.com/starteam/sdk/starteam-sdk-java-help/api/com/starteam/Requirement.Status.html), [Thinkwise](https://community.thinkwisesoftware.com/questions-conversations-78/requirement-status-383), [IREB](https://re-magazine.ireb.org/articles/an-agile-lifecycle-for-requirements)):

Common requirement states in industry tools:
- **Draft/In Progress**: Being authored, not yet finalized
- **Proposed/Review**: Ready for stakeholder review
- **Approved/Validated**: Accepted for implementation
- **Deferred**: Low priority, scheduled for future release
- **Rejected**: Will not be implemented
- **Implemented**: Code complete, not yet verified
- **Verified/Tested**: Verified against the requirement
- **Deprecated**: Superseded by another requirement
- **Deleted**: Removed from scope

**Catalyst's Simplified Model**:

We need fewer states since specs are already "approved" when merged. Our states focus on implementation tracking:

| State | Meaning | Coverage Impact |
|-------|---------|-----------------|
| `active` | In scope for implementation (default) | Counted in coverage |
| `deferred` | Intentionally not implementing this phase | Excluded from coverage |
| `deprecated` | Superseded; should not be referenced | Excluded; warns on use |
| `not-applicable` | Considered but not relevant (e.g., platform-specific) | Excluded from coverage |

**Key Insight**: The "deferred" vs "missing" distinction is critical:
- **Missing**: Active requirement with no implementation (a gap to fix)
- **Deferred**: Intentionally not implementing (not a gap)

Without this distinction, reports would incorrectly flag deferred work as gaps.

**Format in Specs**:
```markdown
- **FR:auth.oauth**: [deferred] OAuth integration for third-party login
- ~~**FR:old.path**~~: [deprecated: FR:new.path] Original description retained here
```

### Decision 5: Requirement Evolution Strategy

**Decision**: Requirements IDs are immutable; use deprecation and replacement, not mutation.

**Handling Common Scenarios**:

| Scenario | Strategy |
|----------|----------|
| **Feature rename** | Feature ID in requirement stays same (it's an identifier, not a display name) |
| **Requirement clarification** | Same ID, updated description in spec |
| **Requirement split** | Original deprecated, new IDs for split parts, link in spec |
| **Requirement merge** | Merged requirements deprecated, new ID for combined, link in spec |
| **Requirement deletion** | ID marked deprecated, never reused |

**Deprecation Pattern in Specs**:

```markdown
## Requirements

### Deprecated Requirements

- ~~**FR-original-id**~~: Deprecated. Split into `FR-new-id-1` and `FR-new-id-2`
- ~~**FR-old-auth**~~: Deprecated. Merged into `FR-unified-auth`
```

**Code Handling**:

- Scanner warns on annotations referencing deprecated requirements
- Provides migration guidance: "Replace `@req foo.func.original` with `@req foo.func.new-1` or `@req foo.func.new-2`"

**Rationale**:

- Immutability prevents broken links in code, issues, PRs, and documentation
- Deprecation trail maintains historical traceability
- Matches semantic versioning philosophy for APIs ([semver.org](https://semver.org/))
- Simple rule: "IDs never change, never reused"

### Decision 6: Requirement Severity Classification (S1-S5)

**Decision**: Support severity levels to prioritize traceability efforts and enable meaningful coverage thresholds.

**Problem Statement**:

- Not all requirements are equally important for traceability
- "Why didn't you add @req for these requirements?" is the right framing
- Need a way to distinguish critical requirements (must have code+tests) from informational requirements (no code expected)
- 100% coverage mandates create annotation fatigue without proportional value

**Severity Scale**:

| Level | Name | Description | Traceability Expectation |
|-------|------|-------------|--------------------------|
| S1 | Critical | Core functionality, security, data integrity | MUST have code + tests |
| S2 | Important | Key features, error handling, integration points | MUST have code |
| S3 | Standard | Regular functionality, validation, formatting | SHOULD have code (default) |
| S4 | Minor | Convenience features, optimizations, edge cases | MAY have code |
| S5 | Informational | Documentation, process, non-code deliverables | No code tracing expected |

**Design Principles**:

1. **Invisible guardrails**: Severity enables tools to ask "why is this S1 requirement missing?" rather than failing on low-value gaps
2. **Gradual adoption**: Default S3 means existing specs work without modification
3. **Configurable threshold**: Teams set `--min-severity S2` to focus on critical/important requirements
4. **Per-severity reporting**: Coverage breakdown by severity highlights critical gaps

**Syntax**:

```markdown
- **FR:auth.session** (S1): Session management must use secure tokens
- **FR:auth.session.format** (S3): Sessions use JWT format
- **NFR:docs** (S5): API must be documented
```

**Why Not Per-Feature Severity?**:

- Teams want global thresholds, not per-feature granularity
- Severity is a property of the requirement itself, not the feature
- Simpler mental model: "all S1 requirements must be traced"

**Why Not Auto-Inference?**:

- AI inference of severity from requirement text is unreliable
- Context matters: "must" in one feature may be more critical than in another
- Explicit markers ensure intentionality

**Rationale**:

- Aligns with industry practice of prioritized requirements (MoSCoW method)
- Enables meaningful coverage targets (100% of S1, 90% of S2, 70% of S3)
- Reduces annotation fatigue by excluding S4/S5 from default metrics
- Supports compliance scenarios where critical requirements need full traceability

### Decision 7: Coverage Thresholds and Enforcement

**Decision**: Configurable thresholds with sensible defaults; no 100% mandate.

**Default Behavior**:

1. **Spec requirements**: Report coverage but don't fail build
2. **Orphaned annotations**: Warn but don't fail (may reference not-yet-documented requirements)
3. **New features**: Encourage >80% coverage for functional requirements

**Configuration** (in `catalyst.config.json` or `package.json`):

```json
{
  "catalyst": {
    "traceability": {
      "enabled": true,
      "thresholds": {
        "coverage": 80,
        "orphaned": "warn"
      },
      "exclude": ["**/test-utils/**", "**/mocks/**"]
    }
  }
}
```

**Rationale**:

- 100% mandates create annotation fatigue and low-value annotations
- Value-based traceability research shows 35% effort reduction with targeted approach
- Configuration enables teams to increase strictness as maturity grows
- Exclude patterns prevent noise from test utilities

### Decision 7: Language-Agnostic Annotation Format

**Decision**: Use `@req` tag in standard comment syntax for any language.

**Format Examples**:

```typescript
// TypeScript/JavaScript
// @req playbook-engine.func.validate-steps
function validateStep(step: Step): void { }

// @req playbook-yaml.perf.schema-gen-500ms, playbook-yaml.func.schema-validation
async function generateSchema(): Promise<JSONSchema> { }
```

```python
# Python
# @req auth.func.password-hash
def hash_password(password: str) -> str:
    pass
```

```go
// Go
// @req api.func.rate-limiting
func RateLimit(handler http.Handler) http.Handler {
}
```

```yaml
# YAML (for config/playbook files)
# @req playbook-definition.data.yaml-schema
inputs:
  - string: project-name
```

**Scanner Strategy**:

1. Regex pattern: `@req\s+([\w.-]+(?:\s*,\s*[\w.-]+)*)`
2. Works with any comment syntax (`//`, `#`, `/* */`, `<!-- -->`, etc.)
3. Handles multiple requirements on one line (comma-separated)
4. Optional `:partial` suffix: `@req:partial feature.func.distributed`

**Rationale**:

- Simple regex enables language-agnostic scanning
- No parser dependencies or language-specific logic
- Matches existing conventions (JSDoc `@param`, Doxygen `@req`)
- Extensible to new languages without code changes

### Decision 8: Nested and Hierarchical Requirements

**Decision**: Support parent-child relationships through naming convention, not syntax.

**Approach**:

- Use naming to express hierarchy: `feature.func.auth` as parent, `feature.func.auth-login`, `feature.func.auth-logout` as children
- Parent requirement is satisfied when all children are satisfied
- Spec documents hierarchy explicitly in requirements section

**Why Not Numeric Hierarchy (FR-1.1, FR-1.2)**:

- Breaks when requirements reordered
- No semantic meaning (what does 1.1 vs 1.2 mean?)
- Descriptive names are self-documenting

**Example in Spec**:

```markdown
### Authentication (parent: auth.func.auth)

- **FR-auth-login**: User can log in with email/password
  - Full ID: `auth.func.auth-login`
- **FR-auth-logout**: User can log out from any device
  - Full ID: `auth.func.auth-logout`
```

**Coverage Calculation**:

- Parent `auth.func.auth` coverage = (covered children / total children) × 100%
- Reports show both individual and rollup coverage

---

## Technical Approach

### Scanner Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLI Entry Point                       │
│                  npx catalyst-req scan                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Spec Parser                            │
│  - Reads .xe/features/*/spec.md files                   │
│  - Extracts requirement IDs and metadata                │
│  - Builds requirement registry with categories          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Code Scanner                            │
│  - Walks source directories (configurable)              │
│  - Regex matches @req annotations in all file types    │
│  - Extracts file:line locations for each requirement   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                Coverage Analyzer                         │
│  - Cross-references specs vs. code annotations          │
│  - Identifies missing implementations                   │
│  - Identifies orphaned annotations                      │
│  - Calculates coverage percentages                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Report Generator                        │
│  - JSON output for programmatic use                     │
│  - Terminal summary for humans                          │
│  - HTML report for detailed analysis (future)           │
└─────────────────────────────────────────────────────────┘
```

### Output Format

```json
{
  "metadata": {
    "scanTime": "2024-12-07T10:30:00Z",
    "filesScanned": 142,
    "featuresFound": 5
  },
  "requirements": {
    "playbook-engine.func.validate-steps": {
      "spec": ".xe/features/playbook-engine/spec.md:45",
      "category": "func",
      "implementations": [
        { "file": "src/engine/validator.ts", "line": 42, "partial": false }
      ],
      "tests": [
        { "file": "tests/engine/validator.test.ts", "line": 15 }
      ],
      "status": "covered"
    },
    "playbook-engine.func.resume-execution": {
      "spec": ".xe/features/playbook-engine/spec.md:78",
      "category": "func",
      "implementations": [],
      "tests": [],
      "status": "missing"
    }
  },
  "orphaned": [
    {
      "id": "old-feature.func.removed-req",
      "locations": ["src/legacy/handler.ts:23"]
    }
  ],
  "summary": {
    "totalRequirements": 45,
    "implemented": 38,
    "tested": 35,
    "missing": 7,
    "coverage": 84.4
  }
}
```

---

## Integration with Catalyst Workflow

### Spec Development

1. Author defines requirements in `spec.md` using immutable IDs
2. Use spec shorthand (`FR-auth-login`) with full ID in mapping table
3. Requirements visible to implementation agents

### Implementation

1. AI agent reads spec, understands requirements
2. Agent annotates code with `@req` as it implements
3. Human reviewer verifies annotations during PR review

### Validation

1. Build runs `npx catalyst-req scan`
2. Reports coverage and gaps
3. Optional: Fail build if coverage below threshold

### Rollout Integration

1. Rollout playbook checks requirement coverage for feature
2. Blocks completion if critical requirements unimplemented
3. Generates coverage report as rollout artifact

---

## Open Questions Resolved

### 1. Should we enforce 100% coverage?

**Answer**: No. Use configurable thresholds with 80% default for functional requirements. 100% creates annotation fatigue without proportional value.

### 2. Should annotations support requirement hierarchies?

**Answer**: Yes, through naming convention (`auth-login`, `auth-logout` as children of conceptual `auth` group). No special syntax needed.

### 3. How do we handle requirements spanning multiple files?

**Answer**:
- Annotate primary implementation file(s)
- Use `@req:partial` for distributed implementations
- Tests provide verification layer

### 4. Should we support requirement ranges (@req FR-1 to FR-5)?

**Answer**: No. Ranges don't work with descriptive IDs and encourage numeric sequences. List individual requirements instead.

### 5. Should we use AST parsing or regex?

**Answer**: Start with regex (simple, language-agnostic), add AST parsing only if accuracy issues emerge.

---

## ROI Assessment for Catalyst

### Investment Required

**Phase 1** (Internal Use):
- Scanner implementation: 2-3 days
- Documentation and conventions: 1 day
- **Total**: ~3-4 days development time

**Phase 2** (Product Feature):
- npm package extraction: 1-2 days
- CLI tool polish: 1 day
- Integration with rollout process: 1-2 days
- **Total**: ~3-5 days additional development

**Total Investment**: 6-9 days development effort

### Cost-Benefit Considerations

| Aspect | Cost | Benefit |
|--------|------|---------|
| Initial annotation | ~30 seconds per requirement | Permanent documentation |
| Ongoing maintenance | Low (annotations move with code) | Always-current coverage data |
| Build validation | ~5 seconds per run | Early detection of gaps |
| Learning curve | Minimal (comment-based) | Immediate adoption |

### When NOT Worth It

Traceability adds overhead without proportional value for:
- Trivial single-file utilities
- Prototype/spike code
- Personal projects without compliance needs

**Recommendation**: Make traceability opt-in per feature, with sensible defaults.

---

## Performance Considerations

| Metric | Target | Strategy |
|--------|--------|----------|
| Scan time (50K LOC) | <5 seconds | Parallel file reading, compiled regex |
| Spec parsing | <100ms per spec | Simple markdown parsing |
| Memory usage | <100MB | Stream processing, no full AST |

### Optimization Strategies

1. **Compiled regex**: Pre-compile `@req` pattern once
2. **Parallel scanning**: Use worker threads for file reading
3. **Incremental mode** (future): Only rescan changed files using git diff
4. **Caching**: Cache spec parsing results, invalidate on file change

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Annotation fatigue | Developers skip annotations | Keep syntax minimal, provide IDE snippets |
| Stale annotations | False coverage data | Build validation, PR review culture |
| Over-engineering IDs | Adoption friction | Simple format, clear examples, templates |
| Multi-language complexity | Scanner bugs | Unified regex approach, comprehensive tests |

---

## Recommendations

### Primary Recommendation: **PROCEED**

Implement requirements traceability as a phased rollout:

**Phase 1** (Immediate - Internal Use):
1. Define `@req` annotation convention
2. Implement scanner script to extract annotations
3. Generate coverage report (JSON + terminal)
4. Document in CONTRIBUTING.md
5. Apply to current features as pilot
6. Measure ROI after 1 sprint

**Phase 2** (After Phase 1 Validation - Product Feature):
1. Extract scanner to `@catalyst/req-trace` npm package
2. Create CLI tool (`npx @catalyst/req-trace scan`)
3. Integrate with Catalyst rollout process
4. Document in Catalyst user guides
5. Publish to npm for community use

**Phase 3** (Future - Advanced Features):
1. ESLint rule to validate annotations
2. VSCode extension for requirement navigation
3. GitHub Action for PR coverage checks
4. Visual traceability matrix UI

### Success Metrics

**Phase 1 Success**:
- 80%+ requirements coverage in pilot features
- <30 seconds to annotate requirement
- <5 seconds scan time for Catalyst codebase
- Zero false positives for orphaned annotations
- Developers report value in retrospective

---

## References

### Industry Resources
- [Inflectra: Requirements Traceability](https://www.inflectra.com/Ideas/Topic/Requirements-Traceability.aspx)
- [TestRail: RTM How-To Guide](https://www.testrail.com/blog/requirements-traceability-matrix/)
- [Perforce: RTM Best Practices](https://www.perforce.com/resources/alm/requirements-traceability-matrix)
- [Visure Solutions: Traceability Matrix Tools](https://visuresolutions.com/blog/traceability-matrix/)

### Academic Research
- [Why Requirements Traceability Remains a Challenge (ResearchGate)](https://www.researchgate.net/publication/235353186_Why_Software_Requirements_Traceability_Remains_a_Challenge)
- [Traceability Patterns for Agile Development (ACM)](https://dl.acm.org/doi/10.5555/1504034.1504078)

### Technical References
- [itemis: Tracing Requirements to Source Code](https://blogs.itemis.com/en/feature-of-the-month-march-2017-tracing-requirements-and-source-code)
- [JUnit 5 @Requirement Proposal](https://github.com/junit-team/junit5/issues/1900)
- [Sparx Systems: Requirements Naming](https://sparxsystems.com/enterprise_architect_user_guide/15.2/model_domains/requirements_naming_and_numbering.html)
- [Semantic Versioning](https://semver.org/)
- [Wikipedia: Requirements Traceability](https://en.wikipedia.org/wiki/Requirements_traceability)
