/**
 * Tests for the reconcile-pull-request playbook: what it sets, from what state
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
const READY = "Status: ✅ Ready";
const ATTENTION = "Needs: Attention 👋";
const REVIEW = "Needs: Review 👀";
const ALL = [AUTOPILOT, FINALIZED, READY, ATTENTION, REVIEW, "Status: ⏸️ Paused", "Status: ⛔ Blocked", "Status: 🚧 WIP"];

const labelNames = async (config?: unknown) => runScript("resolve-pull-request-labels.yaml", "result", { config });

const pr = (over: Record<string, unknown> = {}) => ({
  number: 5,
  author: "me",
  isDraft: false,
  state: "OPEN",
  headSha: "abc1234def",
  labels: [] as string[],
  assignees: [] as string[],
  reviews: [] as { author: string; state: string; bot: boolean }[],
  checks: [{ name: "ci", state: "pass" }],
  threads: [] as any[],
  comments: [] as { author: string; body: string }[],
  codeOwners: [] as string[],
  codeOwned: false,
  ...over,
});
const thread = (...authors: string[]) => ({
  resolved: false,
  comments: authors.map((author) => ({ author, body: "x" })),
});
const approved = { author: "owner", state: "APPROVED", bot: false };

/** Plan for a PR, given the labels the repository has */
async function plan(over: Record<string, unknown> = {}, present: string[] = ALL, config?: unknown) {
  return runScript("reconcile-pull-request.yaml", "plan", {
    pr: pr(over),
    labels: await labelNames(config),
    "repo-labels": present.map((name) => ({ name })),
  });
}

describe("reconcile-pull-request playbook", () => {
  const playbook = loadPlaybook("reconcile-pull-request.yaml");

  // @req FR:pull-request-workflow/lifecycle.@playbook
  // @req FR:pull-request-workflow/lifecycle.input
  it("takes only a required pr-number", () => {
    expect(playbook.inputs).toEqual([
      { number: "pr-number", description: expect.any(String), required: true },
    ]);
  });

  // @req FR:pull-request-workflow/lifecycle.independent
  it("reads its own state with the base actions and never merges", () => {
    const text = JSON.stringify(playbook);
    expect(text).toContain("github-pr-get");
    expect(text).toContain("github-pr-edit");
    expect(text).not.toContain("github-pr-merge");
    expect(text).not.toContain("github-pr-plan");
  });

  // @req FR:pull-request-workflow/lifecycle.labels
  it("uses configured names and reads the repository's labels first", () => {
    const steps = allSteps(playbook.steps);
    expect(steps.some((s) => s.playbook === "resolve-pull-request-labels")).toBe(true);
    expect(steps.some((s) => "github-label-list" in s)).toBe(true);
  });

  describe("labels", () => {
    // @req FR:pull-request-workflow/lifecycle.labels
    it("uses config names, then the configured style", async () => {
      expect((await labelNames()).names.ready).toBe(READY);
      expect((await labelNames({ labels: { style: "simple" } })).names.ready).toBe("ready");
      expect((await labelNames({ labels: { style: "simple", names: { ready: "LGTM" } } })).names.ready).toBe("LGTM");
    });

    // @req FR:pull-request-workflow/lifecycle.labels
    it("skips adding a label missing from the repo", async () => {
      expect((await plan({}, [])).addLabels).toEqual([]);
      expect((await plan({}, [REVIEW])).addLabels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.labels
    it("follows the configured label names", async () => {
      const result = await plan({}, ["needs review"], { labels: { style: "simple" } });
      expect(result.addLabels).toEqual(["needs review"]);
    });

    // @req FR:pull-request-workflow/lifecycle.paused
    it("changes nothing on a paused PR", async () => {
      const result = await plan({ labels: ["Status: ⏸️ Paused"], isDraft: true, assignees: ["x"] });
      expect(result).toMatchObject({ addLabels: [], removeLabels: [], addAssignees: [], removeAssignees: [] });
    });

    // @req FR:pull-request-workflow/lifecycle.draft
    it("clears state labels on a draft", async () => {
      const result = await plan({ isDraft: true, labels: [REVIEW, ATTENTION, READY, FINALIZED, "bug"] });
      expect([...result.removeLabels].sort()).toEqual([ATTENTION, FINALIZED, READY, REVIEW].sort());
      expect(result.addLabels).toEqual([]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-attention
    it.each([
      ["a thread last answered by someone else", [thread("me", "rev")]],
      ["an unanswered self-note", [thread("me")]],
    ])("applies Needs Attention for %s", async (_, threads) => {
      expect((await plan({ threads })).addLabels).toEqual([ATTENTION]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-attention
    it("applies Needs Attention for a 🧭 last comment and a failed check", async () => {
      const compass = {
        resolved: false,
        comments: [{ author: "rev", body: "q" }, { author: "me", body: "🧭 your call" }],
      };
      expect((await plan({ threads: [compass] })).addLabels).toEqual([ATTENTION]);
      expect((await plan({ checks: [{ name: "ci", state: "fail" }] })).addLabels).toEqual([ATTENTION]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-attention
    it("ignores skipped and pending checks and resolved threads", async () => {
      const result = await plan({
        checks: [{ name: "a", state: "skip" }, { name: "b", state: "pending" }],
        threads: [{ resolved: true, comments: [{ author: "rev", body: "x" }] }],
      });
      expect(result.addLabels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-attention.no-conflict
    it("does not apply Needs Attention for a merge conflict alone", async () => {
      expect((await plan({ mergeable: "CONFLICTING" })).addLabels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-attention.threads
    it("looks at every thread given", async () => {
      const many = Array.from({ length: 150 }, () => ({ resolved: true, comments: [] as any[] }));
      expect((await plan({ threads: [...many, thread("rev")] })).addLabels).toEqual([ATTENTION]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-review
    it("applies Needs Review when neither Attention nor Ready applies", async () => {
      expect((await plan()).addLabels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.ready
    it("applies Ready on a human approval, not a bot approval or with changes requested", async () => {
      expect((await plan({ reviews: [approved] })).addLabels).toEqual([READY]);
      expect((await plan({ reviews: [{ ...approved, bot: true }] })).addLabels).toEqual([REVIEW]);
      const changes = await plan({ reviews: [approved, { author: "b", state: "CHANGES_REQUESTED", bot: false }] });
      expect(changes.addLabels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.idempotent
    it("plans nothing when the PR already matches", async () => {
      const state = { labels: [REVIEW] };
      expect(await plan(state)).toMatchObject({ addLabels: [], removeLabels: [], addAssignees: [], removeAssignees: [] });
      expect(await plan(state)).toEqual(await plan(state));
    });
  });

  describe("assignees", () => {
    // @req FR:pull-request-workflow/lifecycle.assignment
    it("assigns the author alone on a draft or when attention is needed", async () => {
      const draft = await plan({ isDraft: true, codeOwners: ["owner"], assignees: ["owner"] });
      expect(draft.addAssignees).toEqual(["me"]);
      expect(draft.removeAssignees).toEqual(["owner"]);
      expect((await plan({ threads: [thread("rev")], codeOwners: ["owner"] })).addAssignees).toEqual(["me"]);
    });

    // @req FR:pull-request-workflow/lifecycle.assignment
    it("assigns the author plus code owners who have not approved when Ready", async () => {
      const result = await plan({ reviews: [approved], codeOwners: ["owner", "other"] });
      expect(result.addAssignees).toEqual(["me", "other"]);
    });

    // @req FR:pull-request-workflow/lifecycle.assignment
    it("assigns unapproved code owners otherwise, and leaves a Blocked PR alone", async () => {
      expect((await plan({ codeOwners: ["owner"] })).addAssignees).toEqual(["owner"]);
      const blocked = await plan({ labels: ["Status: ⛔ Blocked"], codeOwners: ["owner"], assignees: ["x"] });
      expect(blocked.addAssignees).toEqual([]);
      expect(blocked.removeAssignees).toEqual([]);
    });
  });

  describe("finalized", () => {
    const clean = {
      labels: [AUTOPILOT, FINALIZED, REVIEW],
      comments: [{ author: "me", body: "☑️ Finalized at abc1234" }],
    };

    // @req FR:pull-request-workflow/lifecycle.finalized-stale
    it.each([
      ["a draft", { isDraft: true }],
      ["needs attention", { threads: [thread("rev")] }],
      ["lacks Ready while a code owner covers a file", { codeOwned: true }],
      ["its head differs from the certified commit", { headSha: "def5678abc" }],
      ["there is no certification comment", { comments: [] }],
    ])("removes Finalized when %s", async (_, over) => {
      expect((await plan({ ...clean, ...over })).removeLabels).toContain(FINALIZED);
    });

    // @req FR:pull-request-workflow/lifecycle.finalized-stale
    it("keeps Finalized when the head starts with the certified commit", async () => {
      expect((await plan(clean)).removeLabels).not.toContain(FINALIZED);
    });

    // @req FR:pull-request-workflow/lifecycle.finalized-stale.no-add
    it("never adds Finalized", async () => {
      const result = await plan({ labels: [AUTOPILOT, REVIEW], comments: clean.comments });
      expect(result.addLabels).not.toContain(FINALIZED);
    });

    // @req FR:pull-request-workflow/sweep.autopilot.variants
    it("matches the Autopilot label variant without touching it", async () => {
      const result = await plan({ ...clean, labels: ["Status: Autopilot 🤖", FINALIZED, REVIEW] });
      expect(result).toMatchObject({ addLabels: [], removeLabels: [] });
    });
  });
});
