# Playbook YAML Format

## Overview

The Catalyst Playbook YAML format provides a clean, human-friendly syntax for authoring workflow definitions. YAML playbooks are easier to read and write than programmatic code, making them ideal for defining reusable workflows, automation templates, and CI/CD pipelines.

Benefits of YAML playbooks:
- **Declarative**: Focus on *what* you want to happen, not *how*
- **Readable**: Clean syntax that's easy to understand at a glance
- **IDE Support**: IntelliSense and validation in VS Code and other editors
- **Version Control Friendly**: Plain text files that work well with Git

## Getting Started

Here's a minimal playbook example:

```yaml
name: create-issue-from-bug-report
description: Creates a GitHub issue when a bug report is submitted
owner: Engineer

steps:
  - github-issue-create: "New bug reported"
    labels:
      - bug
      - needs-triage
```

Save this as `create-issue.yaml` in the `playbooks/` directory, and Catalyst will automatically discover it.

## Syntax Reference

### Top-Level Properties

Every playbook requires these properties:

```yaml
name: my-playbook           # Required: kebab-case identifier
description: What it does   # Required: Human-readable description
owner: Engineer             # Required: Responsible role
steps:                      # Required: At least one step
  - custom-action: "value"
```

Optional properties:

```yaml
reviewers:                  # Review requirements
  required:
    - Architect
    - Tech Lead
  optional:
    - Product Manager

triggers:                   # Event-based activation
  - event: issues
    action: opened
    args:
      label: bug

inputs:                     # Input parameters (see below)
  - string: param-name

outputs:                    # Expected outputs (kebab-case keys)
  pr-number: number
  pr-url: string

catch:                      # Error handling (see below)
  - code: ErrorCode
    steps:
      - recovery-action: "handle error"

finally:                    # Cleanup (always runs)
  - cleanup-action: "cleanup"
```

### Step Syntax

Steps use **action-type-as-property-key** pattern for concise syntax:

```yaml
steps:
  - github-issue-create: "Issue title"
```

The action type (`github-issue-create`) is the property key, and the value (`"Issue title"`) is the primary configuration.

Optional step properties:

```yaml
steps:
  - name: create-issue              # Optional: step identifier
    errorPolicy: continue           # Optional: error handling policy
    github-issue-create: "Title"    # Action type and primary value
    body: "Issue body"              # Additional configuration
    labels:
      - bug
```

### Input Parameters

Inputs use **type-as-key** pattern:

```yaml
inputs:
  - string: issue-number           # String parameter named "issue-number"
    description: The issue to process
    required: true
    default: "123"

  - number: retry-count            # Number parameter
    description: Number of retries
    default: 3

  - boolean: dry-run               # Boolean parameter
    default: false
```

Optional input properties:

```yaml
inputs:
  - string: environment
    description: Deployment environment
    required: true
    allowed:                       # Enum values
      - dev
      - staging
      - production
    validation:                    # Custom validation (see below)
      - regex: "^(dev|staging|production)$"
```

### Validation Rules

Input validation rules:

```yaml
validation:
  # Regex pattern matching
  - regex: "^[0-9]+$"
    code: InvalidFormat           # Optional: error code
    message: Must be numeric      # Optional: error message

  # String length constraints
  - minLength: 3
    maxLength: 50

  # Number range constraints
  - min: 1
    max: 100

  # Custom JavaScript validation
  - script: "value.startsWith('prefix-')"
    message: Must start with 'prefix-'
```

### Error Handling

Catch specific error codes:

```yaml
catch:
  - code: IssueNotFound
    steps:
      - log-error: "Issue not found"
      - create-fallback-issue: "Fallback"

  - code: RateLimitExceeded
    steps:
      - wait-and-retry: "60 seconds"
```

Always execute cleanup:

```yaml
finally:
  - cleanup-resources: ~
  - send-notification: "Workflow complete"
```

## Action Value Patterns

Catalyst supports three patterns for action values:

### Pattern 1: Primitive Value

When the action value is a string, number, or boolean, it's treated as the primary value:

```yaml
steps:
  - github-issue-create: "Issue Title"
    body: "Issue body"
```

This transforms to:

```typescript
{
  action: 'github-issue-create',
  config: {
    value: 'Issue Title',
    body: 'Issue body'
  }
}
```

### Pattern 2: Object Value

When the action value is an object, it's used as the configuration:

```yaml
steps:
  - ai-prompt:
      prompt: "Pick a random number"
      temperature: 0.7
```

This transforms to:

```typescript
{
  action: 'ai-prompt',
  config: {
    prompt: 'Pick a random number',
    temperature: 0.7
  }
}
```

### Pattern 3: Null Value

When the action value is null (`~` in YAML), use only additional properties:

```yaml
steps:
  - github-repo-info: ~
    owner: my-org
    repo: my-repo
```

This transforms to:

```typescript
{
  action: 'github-repo-info',
  config: {
    owner: 'my-org',
    repo: 'my-repo'
  }
}
```

### Property Merging

Additional properties always override object values (last-wins):

```yaml
steps:
  - custom-action:
      prop1: "from object"
      prop2: "will be overridden"
    prop2: "from additional"
    prop3: "additional only"
```

Results in:

```typescript
{
  prop1: 'from object',
  prop2: 'from additional',  // Last-wins
  prop3: 'additional only'
}
```

## IDE Setup

### VS Code

Install the [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) by Red Hat.

#### Option 1: YAML Front Matter (Recommended)

Add this comment at the top of your playbook file:

```yaml
# yaml-language-server: $schema=https://catalyst.xerilium.com/schemas/playbook.schema.json
---
name: my-playbook
description: My playbook
```

#### Option 2: Workspace Settings

Create or edit `.vscode/settings.json`:

```json
{
  "yaml.schemas": {
    "https://catalyst.xerilium.com/schemas/playbook.schema.json": [
      "playbooks/*.yaml",
      ".xe/playbooks/*.yaml"
    ]
  }
}
```

After setup, you'll get:
- Autocomplete for properties
- Inline validation errors
- Hover documentation
- Schema-based suggestions

## Common Patterns

### Creating Issues from Events

```yaml
name: auto-triage-bugs
description: Automatically triages bug reports
owner: Engineer

triggers:
  - event: issues
    action: labeled
    args:
      label: bug

steps:
  - github-issue-update: ~
    labels:
      - needs-triage
      - priority-high

  - github-issue-comment: "Thanks for reporting! We'll triage this soon."
```

### Managing Pull Requests

```yaml
name: auto-merge-dependabot
description: Automatically merges Dependabot PRs after CI passes
owner: Engineer

triggers:
  - event: pull_request
    action: labeled
    args:
      label: dependencies

inputs:
  - number: pr-number
    required: true

steps:
  - name: wait-for-ci
    github-pr-wait-for-checks: ~
    prNumber: "{{ inputs.pr-number }}"

  - name: merge-pr
    github-pr-merge: ~
    prNumber: "{{ inputs.pr-number }}"
    mergeMethod: squash

catch:
  - code: CIFailed
    steps:
      - github-pr-comment: "CI failed, cannot auto-merge"
```

### CI/CD Workflows

```yaml
name: deploy-to-staging
description: Deploy application to staging environment
owner: DevOps

inputs:
  - string: git-ref
    description: Git ref to deploy
    required: true
    validation:
      - regex: "^(main|release/.+)$"
        message: Can only deploy from main or release branches

steps:
  - name: run-tests
    script-run: "npm test"

  - name: build-app
    script-run: "npm run build"

  - name: deploy
    kubectl-apply: ~
    manifest: "./k8s/staging.yaml"
    namespace: staging

finally:
  - send-slack-notification: "Deployment complete"
```

## Troubleshooting

### Common Errors

**Error: "Property 'name' is required"**

Make sure your playbook includes all required top-level properties:

```yaml
name: my-playbook
description: Description here
owner: Engineer
steps:
  - custom-action: "test"
```

**Error: "Property does not match pattern: ^[a-z][a-z0-9-]*$"**

Playbook names must be kebab-case (lowercase with hyphens):

```yaml
# ❌ Wrong
name: MyPlaybook

# ✅ Correct
name: my-playbook
```

**Error: "Array must have at least 1 items"**

Steps array cannot be empty:

```yaml
# ❌ Wrong
steps: []

# ✅ Correct
steps:
  - custom-action: "test"
```

**Error: "YAML syntax error at line X"**

Check your indentation. YAML is whitespace-sensitive:

```yaml
# ❌ Wrong - inconsistent indentation
steps:
    - custom-action: "test"
  extraProp: "value"

# ✅ Correct - consistent 2-space indentation
steps:
  - custom-action: "test"
    extraProp: "value"
```

**Error: "Input parameter missing type"**

Use type-as-key pattern for inputs:

```yaml
# ❌ Wrong
inputs:
  - name: my-param
    type: string

# ✅ Correct
inputs:
  - string: my-param
```

## Schema Reference

The complete JSON Schema is available at:

**https://catalyst.xerilium.com/schemas/playbook.schema.json**

You can reference this schema for:
- IDE IntelliSense setup
- Programmatic validation
- Documentation generation
- Schema evolution tracking

The schema uses `oneOf` to enforce exactly one action per step while allowing extensibility through the `custom-action` variant.
