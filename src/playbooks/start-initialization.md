---
owner: "Engineer"
reviewers:
  required: ["Architect"]
  optional: []
triggers:
  - event: "issues"
    action: "opened"
    args:
      title: "init.*"
---

# Playbook: start-initialization

Initializes a new project by parsing an init issue and generating context files.

## Inputs

- `issue-number` - The number of the init issue

## Outputs

- `.xe/product.md`
- `.xe/engineering.md`
- `.xe/architecture.md`
- `.xe/process/development.md`

## 1. Validate inputs

Check issue exists and title matches "init*".

## 2. Initialize

Fetch issue data from GitHub API.

## 3. Research

Parse issue body for project details.

## 4. Execute

1. Extract project-name from issue.
2. Extract goals from issue.
3. Extract tech-preferences from issue.
4. Extract team-roles from issue.
5. Fill templates and create files in .xe/.

## 5. Verify

Check files created and populated.

## 6. Request review

Present to Architect for review.

## 7. Publish

Confirm init complete.

## Error handling

If issue parsing fails, notify user.

## Success criteria

- [ ] All 4 files created
- [ ] Reviewed by Architect
- [ ] Project initialized