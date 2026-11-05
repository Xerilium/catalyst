/**
 * Tests for the merge-pull-request playbook: Catalyst's merge rules, on top of
 * the standard GitHub rules that github-pr-merge enforces
 */

import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";
import * as yaml from "js-yaml";

type Step = Record<string, any>;

const PLAYBOOKS = path.join(__dirname, "../../../src/resources/playbooks");

/** Load a bundled playbook by file name */
function loadPlaybook(file: string): { steps: Step[] } & Record<string, any> {
  return yaml.load(fs.readFileSync(path.join(PLAYBOOKS, file), "utf8")) as any;
}

/** Every step in the playbook, nested ones included */
function allSteps(steps: Step[]): Step[] {
  return steps.flatMap((s) => [
    s,
    ...allSteps([...(s.then ?? []), ...(s.else ?? []), ...(s.try ?? []), ...((s.catch ?? []).flatMap((c: Step) => c.steps ?? []))]),
  ]);
}

/** Run the named `script:` step with `get(name)` answering from `vars` */
async function runScript(file: string, stepName: string, vars: Record<string, unknown>): Promise<any> {
  const step = allSteps(loadPlaybook(file).steps).find((s) => s.name === stepName);
  if (!step?.script) {
    throw new Error(`No script step "${stepName}" in ${file}`);
  }
  const context = vm.createContext({ get: (k: string) => vars[k] });
  return vm.runInContext(`(async () => { ${step.script} })()`, context);
}

const AUTOPILOT = "Status: 🤖 Autopilot";
const FINALIZED = "Status: ☑️ Finalized";
const REVIEW = "Needs: Review 👀";

const pr = (over: Record<string, unknown> = {}) => ({
  number: 5,
  headSha: "abc1234def",
  labels: [AUTOPILOT, FINALIZED, REVIEW],
  comments: [{ author: "me", body: "☑️ Finalized at abc1234" }],
  ...over,
});

async function gate(over: Record<string, unknown> = {}) {
  const labels = await runScript("resolve-pull-request-labels.yaml", "result", {});
  return runScript("merge-pull-request.yaml", "gate", { pr: pr(over), labels });
}

describe("merge-pull-request playbook", () => {
  const playbook = loadPlaybook("merge-pull-request.yaml");
  const steps = allSteps(playbook.steps);
  const merge = steps.find((s) => "github-pr-merge" in s)!;

  // @req FR:pull-request-workflow/lifecycle.@merge-playbook
  // @req FR:pull-request-workflow/lifecycle.input
  it("takes only a required pr-number", () => {
    expect(playbook.inputs).toEqual([
      { number: "pr-number", description: expect.any(String), required: true },
    ]);
  });

  // @req FR:pull-request-workflow/lifecycle.independent
  it("reads its own state and never reconciles", () => {
    const text = JSON.stringify(playbook);
    expect(text).toContain("github-pr-get");
    expect(text).not.toContain("github-pr-edit");
    expect(text).not.toContain("github-pr-plan");
  });

  // @req FR:pull-request-workflow/lifecycle.autopilot-merge
  it("squash-merges", () => {
    expect(merge.method).toBe("squash");
  });

  // @req FR:pull-request-workflow/lifecycle.autopilot-merge.recheck
  it("reads the PR right before deciding", () => {
    const read = steps.findIndex((s) => "github-pr-get" in s);
    expect(read).toBeGreaterThan(-1);
    expect(read).toBeLessThan(steps.findIndex((s) => s.name === "gate"));
  });

  // @req FR:pull-request-workflow/lifecycle.autopilot-merge.head-sha
  it("merges only the head it just read", () => {
    expect(merge.sha).toBe("{{pr.headSha}}");
  });

  // @req FR:pull-request-workflow/lifecycle.autopilot-merge.no-bypass
  it("never overrides a standard merge rule", () => {
    expect(merge).not.toHaveProperty("override");
    expect(JSON.stringify(playbook)).not.toMatch(/--admin|admin:/);
  });

  // @req FR:pull-request-workflow/lifecycle.autopilot-merge.no-fail
  // @req FR:pull-request-workflow/lifecycle.autopilot-merge.no-fail.comment
  it("comments on a merge GitHub rejects and never fails the caller", () => {
    const tried = steps.find((s) => s.try && JSON.stringify(s.try).includes("github-pr-merge"))!;
    expect(tried.catch).toEqual([{ code: "*", steps: [expect.objectContaining({ display: expect.any(String) })] }]);
    const rejected = steps.find((s) => typeof s.if === "string" && s.if.includes("MergeFailed"))!;
    expect(JSON.stringify(rejected.then)).toMatch(/github-pr-comment[\s\S]*\(Code: \{\{merge\.code\}\}\)/);
  });

  // @req FR:pull-request-workflow/lifecycle.autopilot-merge.checks
  // @req FR:pull-request-workflow/lifecycle.autopilot-merge.code-owner
  // @req FR:pull-request-workflow/lifecycle.autopilot-merge.code-owner.optional
  // @req FR:pull-request-workflow/lifecycle.autopilot-merge.threads
  it("leaves the standard rules to github-pr-merge", () => {
    const gateScript = String(steps.find((s) => s.name === "gate")!.script);
    expect(gateScript).not.toMatch(/checks|threads|codeOwn/);
  });

  describe("gate", () => {
    // @req FR:pull-request-workflow/lifecycle.autopilot-merge
    it("passes a Finalized Autopilot PR at its certified head", async () => {
      expect(await gate()).toEqual({ ok: true });
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot-merge.label
    // @req FR:pull-request-workflow/sweep.autopilot.variants
    it("merges only an Autopilot PR, matching the label variant", async () => {
      expect(await gate({ labels: [FINALIZED, REVIEW] })).toMatchObject({ ok: false, code: "NotAutopilot" });
      expect(await gate({ labels: ["Status: Autopilot 🤖", FINALIZED, REVIEW] })).toEqual({ ok: true });
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot-merge.finalized
    it("requires Finalized at the certified head", async () => {
      expect(await gate({ labels: [AUTOPILOT, REVIEW] })).toMatchObject({ code: "NotFinalized" });
      expect(await gate({ headSha: "def5678abc" })).toMatchObject({ code: "FinalizedHeadChanged" });
      expect(await gate({ comments: [] })).toMatchObject({ code: "FinalizedHeadChanged" });
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot-merge.not-in-flight
    it.each(["Status: 🚧 WIP", "Status: ⏸️ Paused", "Status: ⛔ Blocked", "Needs: Attention 👋"])(
      "never merges a PR carrying %s",
      async (label) => {
        expect(await gate({ labels: [AUTOPILOT, FINALIZED, label] })).toMatchObject({ ok: false, code: "InFlight" });
      },
    );

    // @req FR:pull-request-workflow/lifecycle.labels
    it("follows the configured label names", async () => {
      const labels = await runScript("resolve-pull-request-labels.yaml", "result", {
        config: { labels: { style: "simple" } },
      });
      const simple = (over: Record<string, unknown>) =>
        runScript("merge-pull-request.yaml", "gate", { pr: pr(over), labels });
      expect(await simple({ labels: ["autopilot", "finalized"] })).toEqual({ ok: true });
      expect(await simple({ labels: [AUTOPILOT, FINALIZED] })).toMatchObject({ code: "NotAutopilot" });
    });
  });
});
