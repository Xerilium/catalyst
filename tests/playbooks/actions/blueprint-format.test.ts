/**
 * Validation tests for the blueprint-format action.
 *
 * Migrates legacy multi-file blueprint structures (`.xe/features/blueprint/`
 * with spec.md/plan.md/data-model.md/design-decisions.md/tasks.md/research.md)
 * to the current shape (`.xe/features/blueprint.md` + appended
 * `.xe/features/design-decisions.md` + new/merged `.xe/rollouts/rollout-blueprint.md`).
 *
 * @req FR:blueprint-workflow/workflow.format
 */

import * as fs from "fs";
import * as path from "path";

describe("blueprint-format action", () => {
  const actionPath = path.join(
    __dirname,
    "../../../src/resources/playbooks/actions/blueprint-format.md",
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(actionPath, "utf-8");
  });

  it("should exist at the expected location", () => {
    expect(fs.existsSync(actionPath)).toBe(true);
  });

  it("should reference Distilled Excellence before Instructions", () => {
    const refIdx = content.search(/Distilled Excellence/);
    const instructionsIdx = content.search(/## Instructions/);
    expect(refIdx).toBeGreaterThan(-1);
    expect(instructionsIdx).toBeGreaterThan(-1);
    expect(refIdx).toBeLessThan(instructionsIdx);
  });

  describe("Inputs", () => {
    it("should declare execution-mode input", () => {
      const inputs = content.split(/## Inputs/)[1]?.split(/^## /m)[0] || "";
      expect(inputs).toMatch(/execution-mode/i);
    });

    it("should NOT require a feature-id input (always operates on .xe/features/blueprint/)", () => {
      const inputs = content.split(/## Inputs/)[1]?.split(/^## /m)[0] || "";
      expect(inputs).not.toMatch(/feature-id/);
    });
  });

  describe("Detection", () => {
    it("should reference the legacy directory `.xe/features/blueprint/`", () => {
      expect(content).toMatch(/\.xe\/features\/blueprint\//);
    });

    it("should mention all common legacy file shapes", () => {
      // Real legacy structures vary; action must handle every common file
      expect(content).toMatch(/spec\.md/);
      expect(content).toMatch(/plan\.md/);
      expect(content).toMatch(/data-model\.md/);
      expect(content).toMatch(/design-decisions\.md/);
      expect(content).toMatch(/tasks\.md/);
      expect(content).toMatch(/research\.md/);
    });
  });

  describe("Content mapping", () => {
    it("should map feature inventory and dependency graph to blueprint Architecture", () => {
      expect(content).toMatch(/Architecture/);
      expect(content).toMatch(/feature inventory|dependency graph/i);
    });

    it("should map roadmap details to blueprint Roadmap", () => {
      expect(content).toMatch(/Roadmap/);
    });

    it("should map data model to blueprint Data Model", () => {
      expect(content).toMatch(/Data Model/);
    });

    it("should append design decisions to .xe/features/design-decisions.md (root, not nested)", () => {
      expect(content).toMatch(/\.xe\/features\/design-decisions\.md/);
      expect(content).toMatch(/append/i);
    });

    it("should merge tasks into rollout-blueprint.md", () => {
      expect(content).toMatch(/rollout-blueprint\.md/);
    });

    it("should stage product-level scenarios for product.md merge (do NOT auto-merge)", () => {
      expect(content).toMatch(/product\.md/);
      expect(content).toMatch(/stage|note|do NOT auto-merge|user follow-up/i);
    });
  });

  describe("Target files", () => {
    it("should write to .xe/features/blueprint.md (single-file target)", () => {
      expect(content).toMatch(/\.xe\/features\/blueprint\.md/);
    });

    it("should reference the blueprint template", () => {
      expect(content).toMatch(/templates\/specs\/blueprint\.md/);
    });

    it("should reference the rollout-blueprint template", () => {
      expect(content).toMatch(/templates\/specs\/rollout-blueprint\.md/);
    });

    it("should preserve prior Run 1+ entries when rollout-blueprint.md exists", () => {
      expect(content).toMatch(/Run 1\+|preserve/i);
    });
  });

  describe("Approval gates", () => {
    it("should invoke auq.md for interactive/checkpoint-review modes", () => {
      expect(content).toMatch(/auq\.md/);
      expect(content).toMatch(/interactive|checkpoint-review/i);
    });

    it("should auto-approve final-review and autonomous modes", () => {
      expect(content).toMatch(/final-review|autonomous/i);
    });
  });

  describe("Cleanup", () => {
    it("should delete the legacy directory after migration", () => {
      expect(content).toMatch(/delete/i);
      expect(content).toMatch(/\.xe\/features\/blueprint\//);
    });
  });

  describe("Commit", () => {
    it("should invoke workflow-commit.md for clean commit checkpoint", () => {
      expect(content).toMatch(/workflow-commit\.md/);
    });
  });

  describe("Exit Criteria", () => {
    it("should include an Exit Criteria section", () => {
      expect(content).toMatch(/^## Exit Criteria/m);
    });

    it("should require legacy directory deleted", () => {
      const exitSection = content.split(/## Exit Criteria/)[1] || "";
      expect(exitSection).toMatch(/legacy.*deleted|deleted.*\.xe\/features\/blueprint/i);
    });

    it("should require new blueprint.md written", () => {
      const exitSection = content.split(/## Exit Criteria/)[1] || "";
      expect(exitSection).toMatch(/blueprint\.md.*written|written.*blueprint\.md/i);
    });

    it("should require user approval (or auto-approval for autonomous modes)", () => {
      const exitSection = content.split(/## Exit Criteria/)[1] || "";
      expect(exitSection).toMatch(/approved/i);
    });
  });
});
