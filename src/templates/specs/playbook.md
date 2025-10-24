---
owner: "{role}" # Role responsible for playbook outputs: Engineer, Product Manager, Architect, Project Manager
reviewers:
  required: [] # Roles that must review (blocks automation)
  optional: [] # Roles to notify (doesn't block)
triggers:
  - event: "{github-event}"
    action: "{github-event-action}"
    args:
      "{field-name}": "{regex}"
---

# Playbook: {playbook-name}

> [INSTRUCTIONS]
> Fill out template based on instructions, then remove instructions and save to `.xe/playbooks/{playbook-id}.md` using `{verb}-{noun}` naming.
>
> Front matter attributes:
>
> - `owner`: Role responsible for playbook outputs
> - `reviewers`: Roles that review outputs (remove if no review needed)
> - `triggers`: GitHub events that initiate the playbook

## Description

> [INSTRUCTIONS]
> 1-3 sentences describing the capability this playbook enables. Example: "Generates feature specifications from issue descriptions. Creates structured spec files, tasks, and opens a PR for review."

## Inputs

- `{param-name}` - {Description}

> [INSTRUCTIONS]
> List input parameters passed into the playbook. Include both required and optional inputs. Example: `feature-name - The snake_case identifier for the feature`

## Outputs

- {Output description}

> [INSTRUCTIONS]
> List what the playbook produces. Be specific about file paths and naming patterns. Examples: "Feature specification at `.xe/features/{feature-name}/spec.md`" or "PR titled 'Add feature spec for {feature-name}'"

## 1. Validate inputs

> [INSTRUCTIONS]
> Define validation rules and error responses. Examples: "Check `{feature-name}` matches snake_case pattern, error if invalid" or "Verify `.xe/features/{feature-name}` doesn't exist, error if duplicate" or "If optional `{assignee}` missing, use default from CODEOWNERS"

## 2. Initialize

> [INSTRUCTIONS]
> List specific files, state, and context to load before execution. Be explicit about paths. Examples: "Read `.xe/memory/feature-standards.md` for spec format requirements" or "Fetch issue #{issue-number} data via GitHub API" or "Read `.xe/templates/specs/feature-spec.md` template"

## 3. Research

> [INSTRUCTIONS]
> Define what analysis is needed to execute successfully. Examples: "Analyze existing features in `.xe/features/` to identify common patterns" or "Examine codebase structure to determine affected modules" or "Identify dependencies between this feature and existing components". Always request approval before destructive/irreversible actions.

## 4. Execute

> [INSTRUCTIONS]
> Numbered list of steps. Use action verbs. Each step should be deterministic, auditable, and composable. Examples: "1. Parse issue body for `{feature-name}` and `{description}`" or "2. Generate spec using `.xe/templates/specs/feature-spec.md`" or "3. Create file at `.xe/features/{feature-name}/spec.md`"

## 5. Verify

> [INSTRUCTIONS]
> Define how outputs are validated. Examples: "Run `npm test` and fix any failing tests" or "Verify all spec sections are populated" or "Check file paths match naming conventions"

## 6. Request review

> [INSTRUCTIONS]
> Define how to request reviews from `reviewers` in frontmatter. Remove if no review needed. Examples: "Assign PR to required reviewers and block merge" or "Notify optional reviewers via PR comment"

## 7. Publish

> [INSTRUCTIONS]
> Define how to communicate results and update system state. Examples: "Write summary to `.xe/memory/playbook-runs/{playbook-id}-{timestamp}.md`" or "Post PR comment with links and next steps" or "Update `.xe/memory/feature-index.md`"

## Error handling

> [INSTRUCTIONS]
> Define error scenarios and resolution strategies. Examples: "If `.xe/templates/specs/feature-spec.md` missing, halt and notify user" or "If GitHub API rate limit hit, wait and retry up to 3 times" or "If `{feature-name}` conflicts with existing feature, suggest alternatives"

## Success criteria

> [INSTRUCTIONS]
> Markdown checklist of verifiable outcomes. Examples: "File created at `.xe/features/{feature-name}/spec.md`" or "PR opened with title 'Add feature spec for {feature-name}'" or "All tests passing"
