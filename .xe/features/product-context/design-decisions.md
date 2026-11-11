# Design Decisions: Product Context Templates

## Reuse Existing Template Location
**Decision**: Create new templates in the existing `src/resources/templates/specs/` directory alongside product.md, architecture.md, and engineering.md.

**Date**: <!-- TODO: determine from git history -->

**Why**: Templates for product context already live there; no reason to split them across directories. Consistent organization avoids updating existing references.

**Rejected**: Separate `src/resources/templates/context/` folder (unnecessary reorganization, would break existing references).

## Competitive Analysis as Separate Template
**Decision**: Create competitive-analysis.md as a standalone template rather than including competitive content in product.md.

**Date**: <!-- TODO: determine from git history -->

**Why**: Separation of concerns — product vision and competitive landscape are distinct documents with different update cadences and owners.

**Rejected**: Including competitive analysis in product.md (violates separation of concerns); skipping it entirely (competitive analysis is specified in the blueprint scope).

## Template Placeholder Format
**Decision**: Use `{placeholder-name}` for variables and `> [INSTRUCTIONS]` blocks for AI guidance.

**Date**: <!-- TODO: determine from git history -->

**Why**: Consistent with the existing spec.md template format. Clear distinction between template instructions (consumed by AI during project initialization) and final content. Easy for AI to parse and replace.

**Rejected**: No formal convention documented; alternatives not evaluated — consistency with existing templates drove the choice.

## Aggressive Token Optimization (Post-Implementation)
**Decision**: Cut templates by 70% (415 → 125 lines) by removing content with low or zero token ROI.

**Date**: <!-- TODO: determine from git history -->

**Why**: Content not consumed by any AI features at this stage has zero value. Low-ROI content (personas, scenarios, metrics, technical requirements) deferred to the features that will actually consume it.

**Rejected**: Keeping full templates (wastes tokens on content AI cannot reliably generate and no feature reads yet).

## Defer go-to-market.md
**Decision**: Delete the go-to-market.md template rather than publishing it.

**Date**: <!-- TODO: determine from git history -->

**Why**: No features currently consume GTM content. Adding it now is pure overhead with zero ROI.

**Rejected**: Creating GTM template now — deferred to Phase 2 when distribution/launch features actually need it.
