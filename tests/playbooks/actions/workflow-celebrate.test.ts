/**
 * Validation tests for the shared workflow-celebrate action.
 *
 * @req FR:workflow-context/celebrate
 */

import * as fs from "fs";
import * as path from "path";

describe("workflow-celebrate action", () => {
  const actionPath = path.join(
    __dirname,
    "../../../src/resources/playbooks/actions/workflow-celebrate.md",
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(actionPath, "utf-8");
  });

  // @req FR:workflow-context/celebrate.action
  it("should exist at the expected location", () => {
    expect(fs.existsSync(actionPath)).toBe(true);
  });

  // @req FR:workflow-context/celebrate.action
  it("should reference Distilled Excellence before Instructions", () => {
    const refIdx = content.search(/Distilled Excellence/);
    const instructionsIdx = content.search(/## Instructions/);
    expect(refIdx).toBeGreaterThan(-1);
    expect(instructionsIdx).toBeGreaterThan(-1);
    expect(refIdx).toBeLessThan(instructionsIdx);
  });

  // @req FR:workflow-context/celebrate.input
  it("should ground tone in immediate session/workflow context (no formal input parameters)", () => {
    expect(content).toMatch(/session|workflow|context/i);
  });

  // @req FR:workflow-context/celebrate.message
  it("should require an enthusiastic message with at least one emoji", () => {
    expect(content).toMatch(/emoji/i);
    expect(content).toMatch(/enthusiastic|congratulatory|celebrat/i);
  });

  // @req FR:workflow-context/celebrate.message
  it("should call out AI anti-patterns to avoid", () => {
    expect(content).toMatch(/anti.pattern/i);
    expect(content).toMatch(/en dash|—/);
  });

  // @req FR:workflow-context/celebrate.format
  it("should require a horizontal rule before the message", () => {
    expect(content).toMatch(/horizontal rule|---/);
  });
});
