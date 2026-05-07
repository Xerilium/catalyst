/**
 * Validation tests for the shared workflow-commit action.
 *
 * @req FR:workflow-context/commit
 */

import * as fs from "fs";
import * as path from "path";

describe("workflow-commit action", () => {
  const actionPath = path.join(
    __dirname,
    "../../../src/resources/playbooks/actions/workflow-commit.md",
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(actionPath, "utf-8");
  });

  // @req FR:workflow-context/commit.action
  it("should exist at the expected location", () => {
    expect(fs.existsSync(actionPath)).toBe(true);
  });

  // @req FR:workflow-context/commit.input
  it("should declare the four documented inputs including extra-trailers", () => {
    expect(content).toMatch(/`feature-id`/);
    expect(content).toMatch(/`files`/);
    expect(content).toMatch(/`description`/);
    expect(content).toMatch(/`extra-trailers`/);
  });

  // @req FR:workflow-context/commit.derive
  it("should derive type and subject inside the action, not from caller", () => {
    expect(content).toMatch(/feat|fix|chore|docs|refactor|test/);
    expect(content).toMatch(/(?:Sentence case|imperative)/i);
    expect(content).toMatch(/72/);
  });

  // @req FR:workflow-context/commit.format
  it("should specify Conventional Commits subject format with feature-id as scope and a no-scope fallback", () => {
    expect(content).toMatch(/\{type\}\(\{feature-id\}\):\s*\{subject\}/);
    expect(content).toMatch(/\{type\}:\s*\{subject\}/);
    expect(content).toMatch(/(?:omit|drop).*paren/i);
  });

  // @req FR:workflow-context/commit.trailer
  it("should require Catalyst AI co-author trailer on every commit and place extra-trailers after it", () => {
    expect(content).toMatch(
      /Co-authored-by:\s*Catalyst AI\s*<catalyst-noreply@xerilium\.com>/,
    );
    expect(content).toMatch(/extra-trailers/);
    expect(content).toMatch(/after the Catalyst trailer|under the Catalyst trailer/i);
  });

  // @req FR:workflow-context/commit.staging
  it("should restrict staging to caller-supplied files and AUQ on overlap", () => {
    expect(content).toMatch(/overlap/i);
    expect(content).toMatch(/AUQ|AskUserQuestion/);
    expect(content).toMatch(/never\s*(?:run\s*)?`?git add -A`?|never\s*`?git add \.`?/i);
    expect(content).toMatch(/outside.only|outside the workflow/i);
  });

  // @req FR:workflow-context/commit.output
  it("should declare exit criteria for commit", () => {
    expect(content).toMatch(/## Exit Criteria/);
    expect(content).toMatch(/Co-authored-by/);
    expect(content).toMatch(/staged/i);
  });
});
