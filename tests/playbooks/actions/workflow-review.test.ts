/**
 * Validation tests for the shared workflow-review action.
 *
 * @req FR:workflow-context/review
 */

import * as fs from "fs";
import * as path from "path";

describe("workflow-review action", () => {
  const actionPath = path.join(
    __dirname,
    "../../../src/resources/playbooks/actions/workflow-review.md",
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(actionPath, "utf-8");
  });

  // @req FR:workflow-context/review.action
  it("should exist at the expected location", () => {
    expect(fs.existsSync(actionPath)).toBe(true);
  });

  // @req FR:workflow-context/review.action
  it("should reference Distilled Excellence before Instructions", () => {
    const refIdx = content.search(/Distilled Excellence/);
    const instructionsIdx = content.search(/## Instructions/);
    expect(refIdx).toBeGreaterThan(-1);
    expect(instructionsIdx).toBeGreaterThan(-1);
    expect(refIdx).toBeLessThan(instructionsIdx);
  });

  // @req FR:workflow-context/review.input
  it("should declare rollout-id and execution-mode inputs", () => {
    expect(content).toMatch(/## Inputs/);
    expect(content).toMatch(/rollout-id/);
    expect(content).toMatch(/execution-mode/);
  });

  // @req FR:workflow-context/review.skip
  it("should skip presentation when execution-mode is autonomous", () => {
    expect(content).toMatch(/autonomous/);
    expect(content).toMatch(/skip/i);
  });

  // @req FR:workflow-context/review.present
  it("should require HR + H2 Review header followed by body sections", () => {
    expect(content).toMatch(/^---/m);
    expect(content).toMatch(/## Review:\s*\{rollout-id\}/);
    // Body sections
    expect(content).toMatch(/Completed/);
    expect(content).toMatch(/Remaining/);
    expect(content).toMatch(/Findings/);
    expect(content).toMatch(/Blockers/);
    expect(content).toMatch(/Files/);
    expect(content).toMatch(/Next/);
    expect(content).toMatch(/Cleanup/);
    expect(content).toMatch(/External issues/);
    // Omit-empty rule for body
    expect(content).toMatch(/omit/i);
  });

  // @req FR:workflow-context/review.recap
  it("should require an abbreviated recap with all sections (None when empty) and a done prompt", () => {
    expect(content).toMatch(/recap/i);
    expect(content).toMatch(/None/);
    expect(content).toMatch(/\*\*done\*\*/);
    expect(content).toMatch(/Anything else/i);
  });

  // @req FR:workflow-context/review.loop
  it("should loop until user types done with complexity-based handling", () => {
    expect(content).toMatch(/loop|until.*done/i);
    expect(content).toMatch(/simple tweaks?/i);
    expect(content).toMatch(/new tasks?/i);
  });

  // @req FR:workflow-context/review.loop
  it("should defer spec-change recovery to the calling playbook", () => {
    expect(content).toMatch(/spec.change.*calling playbook|calling playbook.*spec/i);
  });

  // @req FR:workflow-context/review.output
  it("should have STOP gate ensuring done before exit and Exit Criteria", () => {
    expect(content).toMatch(/\*\*STOP HERE\*\*/);
    expect(content).toMatch(/## Exit Criteria/);
  });
});
