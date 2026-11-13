/**
 * Validation tests for the shared workflow-scope action.
 *
 * @req FR:workflow-context/scope
 */

import * as fs from "fs";
import * as path from "path";

describe("workflow-scope action", () => {
  const actionPath = path.join(
    __dirname,
    "../../../src/resources/playbooks/actions/workflow-scope.md",
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(actionPath, "utf-8");
  });

  // @req FR:workflow-context/scope.action
  it("should exist at the expected location", () => {
    expect(fs.existsSync(actionPath)).toBe(true);
  });

  // @req FR:workflow-context/scope.action
  it("should reference Plain Language before Instructions", () => {
    const refIdx = content.search(/Plain Language/);
    const instructionsIdx = content.search(/## Instructions/);
    expect(refIdx).toBeGreaterThan(-1);
    expect(instructionsIdx).toBeGreaterThan(-1);
    expect(refIdx).toBeLessThan(instructionsIdx);
  });

  // @req FR:workflow-context/scope.input
  it("should declare optional issue and context-files inputs", () => {
    expect(content).toMatch(/## Inputs/);
    expect(content).toMatch(/issue/);
    expect(content).toMatch(/context-files/);
  });

  // @req FR:workflow-context/scope.gather
  it("should describe context gathering from inline description, issue, files, blueprint, product vision", () => {
    expect(content).toMatch(/inline description/i);
    expect(content).toMatch(/gh issue view/);
    expect(content).toMatch(/blueprint/i);
    expect(content).toMatch(/product\.md|product vision/i);
  });

  // @req FR:workflow-context/scope.gather
  it("should defer clarifying-question gathering to AUQ when critical context is missing", () => {
    expect(content).toMatch(/Execute @[^\s]*auq\.md/);
    expect(content).toMatch(/critical context/i);
  });

  // @req FR:workflow-context/scope.convention-check
  it("should require a convention check for new artifact types", () => {
    expect(content).toMatch(/Convention Check/i);
    expect(content).toMatch(/new artifact types?/i);
  });

  // @req FR:workflow-context/scope.approve
  it("should present scope approval AUQ with effort overview, impacted scope, and execution mode", () => {
    expect(content).toMatch(/Effort overview/i);
    expect(content).toMatch(/Execution mode/i);
    expect(content).toMatch(/interactive/);
    expect(content).toMatch(/checkpoint-review/);
    expect(content).toMatch(/spec-review/);
    expect(content).toMatch(/final-review/);
    expect(content).toMatch(/autonomous/);
  });

  // @req FR:workflow-context/scope.approve
  it("should require recommendation guidance on AUQ options", () => {
    expect(content).toMatch(/Recommend/i);
  });

  // @req FR:workflow-context/scope.setup.fresh-base
  // @req FR:workflow-context/scope.setup.fresh-base.resume
  it("should start or reset the autonomous branch to fresh origin default branch", () => {
    expect(content).toMatch(/git fetch origin/);
    expect(content).toMatch(/create `xe\/\{rollout-id\}` from `origin\/\{default-branch\}`/);
    expect(content).toMatch(/Reset the branch to `origin\/\{default-branch\}`/);
    expect(content).toMatch(/Resumed rollout.*Never reset it/);
    expect(content).toMatch(/defaultBranchRef/);
  });

  // @req FR:workflow-context/scope.setup.fresh-base
  it("should keep feature-scope setup in sync with workflow-scope", () => {
    const featureScope = fs.readFileSync(
      path.join(__dirname, "../../../src/resources/playbooks/actions/feature-scope.md"),
      "utf-8",
    );
    const step = content.match(/^2\. Set up the branch:\n(?: {3}.*\n)+/m)?.[0];
    expect(step).toBeDefined();
    expect(featureScope).toContain(step);
  });

  // @req FR:workflow-context/scope.setup
  it("should describe rollout-id determination, branch creation rules, and rollout plan creation", () => {
    expect(content).toMatch(/rollout.id/i);
    expect(content).toMatch(/kebab.case/i);
    expect(content).toMatch(/`xe\/\{rollout-id\}`/);
    expect(content).toMatch(/autonomous/);
    expect(content).toMatch(/template/);
  });

  // @req FR:workflow-context/commit.action
  it("should delegate autonomous rollout commit to workflow-commit action", () => {
    expect(content).toMatch(
      /Execute @[^\s]*playbooks\/actions\/workflow-commit\.md/,
    );
  });

  // @req FR:feature-context/rollout.ephemeral
  it("should commit the placeholder rollout only for the tracked blueprint rollout", () => {
    expect(content).toMatch(/If `autonomous` and `artifacts` = `blueprint`, commit and push placeholder rollout/);
    expect(content).not.toMatch(/`files` = `\[\.xe\/rollouts\/rollout-\{rollout-id\}\.md\]`/);
  });

  // @req FR:workflow-context/scope.output
  it("should declare exit criteria covering scope approval, rollout plan, and conditional branch creation", () => {
    expect(content).toMatch(/## Exit Criteria/);
    expect(content).toMatch(/[Ss]cope/);
    expect(content).toMatch(/Rollout plan/i);
    expect(content).toMatch(/branch/i);
  });
});

describe("rollout plan gitignore", () => {
  const root = path.join(__dirname, "../../..");

  // @req FR:feature-context/rollout.ephemeral
  it("should ignore rollout plans except the blueprint rollout", () => {
    const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf-8");
    expect(gitignore).toMatch(/^\.xe\/rollouts\/rollout-\*\.md$/m);
    expect(gitignore).toMatch(/^!\.xe\/rollouts\/rollout-blueprint\.md$/m);
  });

  // @req FR:feature-context/rollout.ephemeral
  it("should not commit a placeholder rollout in feature-scope", () => {
    const content = fs.readFileSync(
      path.join(root, "src/resources/playbooks/actions/feature-scope.md"),
      "utf-8",
    );
    expect(content).not.toMatch(/commit and push placeholder/i);
  });
});
