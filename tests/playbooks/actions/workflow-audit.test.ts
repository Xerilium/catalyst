/**
 * Validation tests for the shared workflow-audit action.
 *
 * @req FR:workflow-context/audit
 */

import * as fs from "fs";
import * as path from "path";

describe("workflow-audit action", () => {
  const actionPath = path.join(
    __dirname,
    "../../../src/resources/playbooks/actions/workflow-audit.md",
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(actionPath, "utf-8");
  });

  // @req FR:workflow-context/audit.action
  it("should exist at the expected location", () => {
    expect(fs.existsSync(actionPath)).toBe(true);
  });

  // @req FR:workflow-context/audit.action
  it("should reference Distilled Excellence before Instructions", () => {
    const refIdx = content.search(/Distilled Excellence/);
    const instructionsIdx = content.search(/## Instructions/);
    expect(refIdx).toBeGreaterThan(-1);
    expect(instructionsIdx).toBeGreaterThan(-1);
    expect(refIdx).toBeLessThan(instructionsIdx);
  });

  // @req FR:workflow-context/audit.input
  it("should declare rollout-id input", () => {
    expect(content).toMatch(/## Inputs/);
    expect(content).toMatch(/rollout-id/);
  });

  // @req FR:workflow-context/audit.identify
  it("should describe completeness gap identification against source context", () => {
    expect(content).toMatch(/source context|stated requirements/i);
    expect(content).toMatch(/unchecked tasks?/i);
  });

  // @req FR:workflow-context/audit.resolve
  it("should route critical gaps back to the previous phase rather than fixing in-place", () => {
    expect(content).toMatch(/critical/i);
    expect(content).toMatch(/previous phase|prior phase|return to/i);
  });

  // @req FR:workflow-context/audit.boy-scout
  it("should require Boy Scout log entry before fixing pre-existing issues", () => {
    expect(content).toMatch(/Boy Scout/);
    expect(content).toMatch(/`- Boy Scout: \{what\} — \{why\}`/);
    expect(content).toMatch(/## Notes/);
  });

  // @req FR:workflow-context/audit.output
  it("should declare exit criteria covering identified gaps and Boy Scout entries", () => {
    expect(content).toMatch(/## Exit Criteria/);
  });
});
