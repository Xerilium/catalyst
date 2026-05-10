/**
 * Validation tests for the shared feedback-write action.
 *
 * @req FR:feedback-loop/playbook.routing.feature-file
 */

import * as fs from "fs";
import * as path from "path";

describe("feedback-write action", () => {
  const actionPath = path.join(
    __dirname,
    "../../../src/resources/playbooks/actions/feedback-write.md",
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(actionPath, "utf-8");
  });

  // @req FR:feedback-loop/playbook.routing.feature-file
  it("should exist at the expected location", () => {
    expect(fs.existsSync(actionPath)).toBe(true);
  });

  // @req FR:feedback-loop/playbook.routing.feature-file
  it("should reference the target feedback.md path", () => {
    expect(content).toMatch(/\.xe\/features\/\{feature-id\}\/feedback\.md/);
  });

  // @req FR:feedback-loop/playbook.routing.feature-file
  it("should reference the template source for creation", () => {
    expect(content).toMatch(/src\/resources\/templates\/specs\/feedback\.md/);
  });

  // @req FR:feedback-loop/playbook.routing.feature-file
  it("should specify H2 grouping discipline", () => {
    expect(content).toMatch(/H2/);
    expect(content).toMatch(/\b(group|related)\b/i);
  });

  // @req FR:feedback-loop/playbook.routing.feature-file
  it("should specify bullet format for entries", () => {
    expect(content).toMatch(/top-level bullet/i);
    expect(content).toMatch(/nested bullets?/i);
  });

  // @req FR:feedback-loop/playbook.routing.feature-file
  it("should include a quality gate that verifies the fix against the problem", () => {
    expect(content).toMatch(/verify/i);
    expect(content).toMatch(/(fix|prevent)/i);
    expect(content).toMatch(/problem|friction/i);
  });

  // @req FR:feature-context/feedback.format.reuse
  it("should require reusing existing H2s", () => {
    expect(content).toMatch(/reuse existing H2s/i);
    expect(content).toMatch(/themes, not items/i);
  });
});
