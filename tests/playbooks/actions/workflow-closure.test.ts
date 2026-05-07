/**
 * Validation tests for the shared workflow-closure action.
 *
 * @req FR:workflow-context/closure
 */

import * as fs from "fs";
import * as path from "path";

describe("workflow-closure action", () => {
  const actionPath = path.join(
    __dirname,
    "../../../src/resources/playbooks/actions/workflow-closure.md",
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(actionPath, "utf-8");
  });

  // @req FR:workflow-context/closure.action
  it("should exist at the expected location", () => {
    expect(fs.existsSync(actionPath)).toBe(true);
  });

  // @req FR:workflow-context/closure.action
  it("should reference Distilled Excellence before Instructions", () => {
    const refIdx = content.search(/Distilled Excellence/);
    const instructionsIdx = content.search(/## Instructions/);
    expect(refIdx).toBeGreaterThan(-1);
    expect(instructionsIdx).toBeGreaterThan(-1);
    expect(refIdx).toBeLessThan(instructionsIdx);
  });

  // @req FR:workflow-context/closure.input
  it("should declare rollout-id, execution-mode, and pr-type inputs", () => {
    expect(content).toMatch(/## Inputs/);
    expect(content).toMatch(/rollout-id/);
    expect(content).toMatch(/execution-mode/);
    expect(content).toMatch(/pr-type/);
  });

  // @req FR:workflow-context/closure.save
  it("should offer commit, pull request, or skip via AUQ", () => {
    expect(content).toMatch(/Execute @[^\s]*auq\.md/);
    expect(content).toMatch(/Commit/i);
    expect(content).toMatch(/pull request/i);
    expect(content).toMatch(/Skip/i);
  });

  // @req FR:workflow-context/closure.external-issues
  it("should route external issues to GitHub, feedback, rollout, or skip", () => {
    expect(content).toMatch(/external issues?/i);
    expect(content).toMatch(/GitHub issue/i);
    expect(content).toMatch(/feedback/i);
  });

  // @req FR:workflow-context/closure.follow-on
  it("should identify follow-on work with start/now/defer/stop options", () => {
    expect(content).toMatch(/follow.on|next run/i);
    expect(content).toMatch(/Defer|GitHub issue/i);
    expect(content).toMatch(/Stop here/i);
  });

  // @req FR:workflow-context/closure.cleanup
  it("should clean up temporary files only and not delete outside the repository", () => {
    expect(content).toMatch(/temporary files?|temp files?/i);
    expect(content).toMatch(/rollout plan/i);
    expect(content).toMatch(/(?:not delete|never delete|MUST NOT delete).*(?:outside|repo)/i);
  });

  // @req FR:workflow-context/closure.commit
  it("should commit to current branch when requested", () => {
    expect(content).toMatch(/commit.*current branch|current branch.*commit/i);
  });

  // @req FR:workflow-context/commit.action
  it("should delegate commit to workflow-commit action", () => {
    expect(content).toMatch(
      /Execute @[^\s]*playbooks\/actions\/workflow-commit\.md/,
    );
  });

  // @req FR:workflow-context/closure.pr
  it("should specify PR title format with caller-supplied pr-type", () => {
    expect(content).toMatch(/\[Catalyst\]\[\{pr-type\}\] \{[^}]+\}/);
  });

  // @req FR:workflow-context/closure.pr
  it("should generate PR body from review summary structure", () => {
    expect(content).toMatch(/Completed.*Remaining.*Findings|Completed\/Remaining\/Findings/s);
  });

  // @req FR:workflow-context/closure.output
  it("should declare exit criteria for closure", () => {
    expect(content).toMatch(/## Exit Criteria/);
  });
});
