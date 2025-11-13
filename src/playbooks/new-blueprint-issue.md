---
owner: "Product Manager"
reviewers:
  required: []
  optional: ["Architect"]
triggers: []
---

# Playbook: new-blueprint-issue

Generates a GitHub issue for blueprint creation, optionally using init issue context.

## Inputs

- `init-issue-number` (optional) - The init issue number to use for context

## Outputs

- GitHub issue with blueprint template

## Execute

1. Gather context:
   - If `init-issue-number` provided: Fetch init issue with comments via `npx catalyst-github issue get {issue-number} --with-comments`
   - Read `.xe/product.md` for product vision and goals
   - Read `.xe/architecture.md` for technical context
2. Analyze requirements and draft comprehensive blueprint issue content:
   - **Phased Implementation**: Propose MVP capabilities vs future phases based on goals and complexity
   - **Primary User Workflow**: Describe high-level user journey through Phase 1 capabilities
   - **Additional Context**: Include relevant constraints and priorities from init issue and context files
3. Create issue with drafted content:
   - Run `node node_modules/@xerilium/catalyst/playbooks/scripts/new-blueprint-issue.js --content={drafted-content}`
   - Script validates (checks for existing issues, GitHub CLI, gets project name)
   - Script creates issue and returns URL
4. Provide issue URL to user

## Success criteria

- [ ] GitHub issue created with blueprint template
- [ ] Issue pre-filled with context if init issue provided
