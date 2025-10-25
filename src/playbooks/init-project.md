---
owner: "Product Manager" # Role responsible for playbook outputs: Engineer, Product Manager, Architect, Project Manager
reviewers:
  required: ["Architect"] # Roles that must review (blocks automation)
  optional: [] # Roles to notify (doesn't block)
triggers:
  - event: "manual"
    action: "init"
    args: {}
---

# Playbook: init-project

Generates initial project context files from user inputs. Creates product, engineering, architecture, and process files in the .xe folder for AI-assisted development.

## Inputs

- `project-name` - The name of the project
- `goals` - High-level project goals
- `tech-preferences` - Preferred technologies or constraints
- `team-roles` - Key team members and their roles

## Outputs

- `.xe/product.md` - Product context file
- `.xe/engineering.md` - Engineering principles file
- `.xe/architecture.md` - Technical architecture file
- `.xe/process/development.md` - Development process file

## 1. Validate inputs

Check that all required inputs are provided and valid.

## 2. Initialize

Read templates from `/src/templates/specs/` and `/src/templates/process/`.

## 3. Research

Analyze user inputs for enterprise fit and completeness.

## 4. Execute

1. Fill placeholders in product.md template with inputs.
2. Fill placeholders in engineering.md template with inputs.
3. Fill placeholders in architecture.md template with inputs.
4. Fill placeholders in development.md template with inputs.
5. Create files in `.xe/` folder.

## 5. Verify

Verify all files are created and placeholders replaced.

## 6. Request review

Present generated files to Product Manager for review.

## 7. Publish

Confirm project initialization complete and provide next steps.

## Error handling

If templates missing, halt and notify user.

## Success criteria

- [ ] All 4 context files created in `.xe/`
- [ ] Files reviewed and approved by Product Manager
- [ ] Project ready for blueprint creation