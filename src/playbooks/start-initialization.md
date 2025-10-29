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

- Feature branch at `xe/{username}/init`
- `.xe/product.md`
- `.xe/engineering.md`
- `.xe/architecture.md`
- `.xe/process/development.md`
- Pull request for code review and merge

## 1. Validate inputs

Check issue exists and title matches "init*".

## 2. Initialize

1. Fetch issue data from GitHub API
2. Create feature branch: `xe/{username}/init`

## 3. Research

Parse issue body for project details.

## 4. Execute

1. Extract project-name from issue
2. Extract goals from issue
3. Extract tech-preferences from issue
4. Extract engineering-principles from issue
5. Extract team-roles from issue
6. Fill templates and create files in `.xe/`:
   - Create `.xe/product.md` from product template
   - Create `.xe/engineering.md` from engineering template
   - Create `.xe/architecture.md` from architecture template
   - Create `.xe/process/` directory
   - Copy `.xe/process/development.md` from development template
   - Replace `{project-name}` placeholders with actual project name
   - Remove instruction blocks from all files

## 5. Verify

Check files created and populated.

## 6. Request review

1. Create pull request into default branch
2. Set title: `[Catalyst][Init] {project-name}`
3. Summarize project initialization in body description
4. Link related issues with `Fixes #{id}` or `Related to #{id}`
5. Assign reviewers per `.xe/product.md` team roles if defined (both human and AI reviewers)

## 7. Publish

Post PR comment with:

- Summary of project context captured
- Next steps: Review and merge init PR, then begin feature development via blueprint or rollout

## Error handling

**Issue Parsing Failures:**

- If issue not found or access denied, notify user with helpful error message
- If issue title doesn't match "init*" pattern, warn user but proceed
- If required sections missing from issue, prompt user for missing information

**Template Failures:**

- If template files not found, halt and notify user about installation issue
- Suggest running `npm install @xerilium/catalyst` to restore templates

**File Creation Failures:**

- If `.xe/` directory creation fails, check permissions and report issue
- If individual file writes fail, preserve successful files and report specific failure

## Success criteria

- [ ] Feature branch created at `xe/{username}/init`
- [ ] `.xe/product.md` created and populated
- [ ] `.xe/engineering.md` created and populated
- [ ] `.xe/architecture.md` created and populated
- [ ] `.xe/process/development.md` created and populated
- [ ] All placeholder text replaced
- [ ] All instruction blocks removed
- [ ] Pull request created with proper title and description
- [ ] Reviewers assigned per `.xe/product.md` if defined
