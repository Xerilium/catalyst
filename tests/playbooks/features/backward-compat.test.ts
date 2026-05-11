import { describe, it, expect } from "@jest/globals";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Tests for command routing and workflow integrity
 */
describe("Backward Compatibility", () => {
  const PLAYBOOKS_DIR = join(__dirname, "../../../src/resources/playbooks");

  describe("Command Compatibility", () => {
    const COMMANDS_DIR = join(
      __dirname,
      "../../../src/resources/ai-config/commands",
    );

    // @req FR:feature-workflow/workflow.@ai-command.create
    // @req FR:feature-workflow/workflow.@playbook.create
    it("/catalyst:create command should exist", () => {
      const path = join(COMMANDS_DIR, "create.md");
      expect(existsSync(path)).toBe(true);
    });

    // @req FR:feature-workflow/workflow.@ai-command.change
    // @req FR:feature-workflow/workflow.@playbook.change
    it("/catalyst:change command should exist", () => {
      const path = join(COMMANDS_DIR, "change.md");
      expect(existsSync(path)).toBe(true);
    });

    // @req FR:feature-workflow/workflow.@ai-command.fix
    // @req FR:feature-workflow/workflow.@playbook.fix
    it("/catalyst:fix command should exist", () => {
      const path = join(COMMANDS_DIR, "fix.md");
      expect(existsSync(path)).toBe(true);
    });

    // @req FR:feature-workflow/workflow.@ai-command.explore
    // @req FR:feature-workflow/workflow.@playbook.explore
    it("/catalyst:explore command should exist", () => {
      const path = join(COMMANDS_DIR, "explore.md");
      expect(existsSync(path)).toBe(true);
    });

    // @req FR:feature-workflow/workflow.discover.resume
    it("Commands should reference correct orchestrators", async () => {
      const commands = [
        { file: "create.md", orchestrator: "create-feature.md" },
        { file: "change.md", orchestrator: "update-feature.md" },
        { file: "fix.md", orchestrator: "repair-feature.md" },
        { file: "explore.md", orchestrator: "explore-feature.md" },
      ];

      for (const { file, orchestrator } of commands) {
        const path = join(COMMANDS_DIR, file);
        const content = await readFile(path, "utf-8");

        expect(content).toMatch(new RegExp(orchestrator.replace(".md", "")));
      }
    });
  });

  describe("Feature Workflow Integrity", () => {
    // @req FR:feature-workflow/workflow.@ai-command.create
    // @req FR:feature-workflow/workflow.@playbook.create
    // @req FR:feature-workflow/workflow.@ai-command.change
    // @req FR:feature-workflow/workflow.@playbook.change
    // @req FR:feature-workflow/workflow.@ai-command.fix
    // @req FR:feature-workflow/workflow.@playbook.fix
    // @req FR:feature-workflow/workflow.@ai-command.explore
    // @req FR:feature-workflow/workflow.@playbook.explore
    it("All work-types should have orchestrators", () => {
      expect(existsSync(join(PLAYBOOKS_DIR, "create-feature.md"))).toBe(true);
      expect(existsSync(join(PLAYBOOKS_DIR, "update-feature.md"))).toBe(true);
      expect(existsSync(join(PLAYBOOKS_DIR, "repair-feature.md"))).toBe(true);
      expect(existsSync(join(PLAYBOOKS_DIR, "explore-feature.md"))).toBe(true);
    });

    // @req FR:feature-workflow/workflow.@ai-command.create
    // @req FR:feature-workflow/workflow.@playbook.create
    // @req FR:feature-workflow/workflow.@ai-command.change
    // @req FR:feature-workflow/workflow.@playbook.change
    // @req FR:feature-workflow/workflow.@ai-command.fix
    // @req FR:feature-workflow/workflow.@playbook.fix
    // @req FR:feature-workflow/workflow.@ai-command.explore
    // @req FR:feature-workflow/workflow.@playbook.explore
    it("All work-types should have commands", () => {
      const COMMANDS_DIR = join(
        __dirname,
        "../../../src/resources/ai-config/commands",
      );

      expect(existsSync(join(COMMANDS_DIR, "create.md"))).toBe(true);
      expect(existsSync(join(COMMANDS_DIR, "change.md"))).toBe(true);
      expect(existsSync(join(COMMANDS_DIR, "fix.md"))).toBe(true);
      expect(existsSync(join(COMMANDS_DIR, "explore.md"))).toBe(true);
    });
  });
});
