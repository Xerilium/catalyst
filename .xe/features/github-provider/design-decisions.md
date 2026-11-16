# Design Decisions: GitHub Provider

> [INSTRUCTIONS]
> Record design rationale — what was decided, why, and what was rejected. Created when significant decisions are made during any phase (spec, planning, implementation). Each H2 is one decision.
>
> - Feature decisions → `.xe/features/{feature-id}/design-decisions.md`
> - Product/architecture decisions → `.xe/features/design-decisions.md`

## Skip email and team code owners

**Decision**: Code-owner matching keeps only user owners (`@user`). It skips owners given by email or as a team (`@org/team`).

**Date**: 2026-11-14

**Why**: A review names a user, so an email or a team can't be matched to a reviewer without more API calls and permissions. A file owned only by a team or email passes Catalyst's code-owner check. When the base branch requires code-owner review, GitHub still enforces it at merge.

**Rejected**:

- **Expand teams to their members**: Needs `read:org` access, which app and `GITHUB_TOKEN` tokens often lack.
- **Treat a team-owned file as never approved**: Would hold every such PR, even when GitHub would merge it.
