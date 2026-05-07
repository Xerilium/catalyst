/**
 * Validation tests for the shared workflow-state action (Active State update).
 *
 * @req FR:workflow-context/state
 */

import * as fs from "fs";
import * as path from "path";

describe("workflow-state action", () => {
  const actionPath = path.join(
    __dirname,
    "../../../src/resources/playbooks/actions/workflow-state.md",
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(actionPath, "utf-8");
  });

  // @req FR:workflow-context/state.action
  it("should exist at the expected location", () => {
    expect(fs.existsSync(actionPath)).toBe(true);
  });

  // @req FR:workflow-context/state.action
  it("should reference Distilled Excellence before Instructions", () => {
    const refIdx = content.search(/Distilled Excellence/);
    const instructionsIdx = content.search(/## Instructions/);
    expect(refIdx).toBeGreaterThan(-1);
    expect(instructionsIdx).toBeGreaterThan(-1);
    expect(refIdx).toBeLessThan(instructionsIdx);
  });

  // @req FR:workflow-context/state.action
  it("should signal non-skippability with DO NOT SKIP", () => {
    expect(content).toMatch(/DO NOT SKIP/);
  });

  // @req FR:workflow-context/state.input
  it("should declare rollout-id input", () => {
    expect(content).toMatch(/## Inputs/);
    expect(content).toMatch(/rollout-id/);
  });

  // @req FR:workflow-context/state.invocation
  it("should describe invocation at STOP gates, after AUQ changes, and before long-running operations", () => {
    expect(content).toMatch(/STOP gate/i);
    expect(content).toMatch(/AUQ/);
    expect(content).toMatch(/long.running|compaction/i);
  });

  // @req FR:workflow-context/state.overwrite
  it("should describe overwrite semantics with - None placeholder", () => {
    expect(content).toMatch(/OVERWRITE/);
    expect(content).toMatch(/`- None`/);
  });

  // @req FR:workflow-context/state.fields
  it("should enumerate all six Active State fields", () => {
    expect(content).toMatch(/\*\*Model\*\*/);
    expect(content).toMatch(/\*\*Decisions\*\*/);
    expect(content).toMatch(/\*\*Open\*\*/);
    expect(content).toMatch(/\*\*Next\*\*/);
    expect(content).toMatch(/\*\*Pins\*\*/);
    expect(content).toMatch(/\*\*Assumptions\*\*/);
  });

  // @req FR:workflow-context/state.output
  it("should update last_updated frontmatter and have Exit Criteria", () => {
    expect(content).toMatch(/last_updated/);
    expect(content).toMatch(/## Exit Criteria/);
  });
});
