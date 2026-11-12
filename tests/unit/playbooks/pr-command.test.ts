/**
 * The `catalyst pr` command and the reconcile, Autopilot, and merge playbooks,
 * run through the real engine against a fake GitHub
 */

import { execFileSync, execSync } from "child_process";
import * as fs from "fs";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";
import { Engine } from "../../../src/playbooks/engine/engine";
import { PlaybookProvider } from "../../../src/playbooks/registry/playbook-provider";
import { StatePersistence } from "../../../src/playbooks/persistence/state-persistence";

jest.mock("child_process", () => ({ ...jest.requireActual("child_process"), execSync: jest.fn(), execFileSync: jest.fn() }));
const ghFile = execFileSync as jest.MockedFunction<typeof execFileSync>;
const ghShell = execSync as jest.MockedFunction<typeof execSync>;

const ROOT = path.join(__dirname, "../../..");
const PR_COMMAND = path.join(ROOT, "src/resources/cli-commands/pr.yaml");
const RECONCILE = path.join(ROOT, "src/resources/playbooks/reconcile-pull-request.yaml");
const AUTOPILOT_PLAYBOOK = path.join(ROOT, "src/resources/playbooks/autopilot-pull-request.yaml");
const MERGE = path.join(ROOT, "src/resources/playbooks/merge-pull-request.yaml");

const AUTOPILOT = "Status: 🤖 Autopilot";
const BLOCKED = "Status: ⛔ Blocked";
const FINALIZED = "Status: ☑️ Finalized";
const PAUSED = "Status: ⏸️ Paused";
const READY = "Status: ✅ Ready";
const WIP = "Status: 🚧 WIP";
const ATTENTION = "Needs: Attention 👋";
const REVIEW = "Needs: Review 👀";
const ALL = [AUTOPILOT, BLOCKED, FINALIZED, PAUSED, READY, WIP, ATTENTION, REVIEW];
const HEAD = "abc1234def5678";

interface Fake {
  author: string;
  viewer: string;
  isDraft: boolean;
  labels: string[];
  assignees: string[];
  reviews: { login: string; state: string; commit?: string }[];
  checks: string[];
  threads: { resolved: boolean; comments: { login: string; body: string }[] }[];
  /** Top-level comments as [login, body, time] */
  comments: [string, string, string?][];
  /** When the Autopilot label was last removed */
  autopilotRemoved?: string;
  codeowners: string | null;
  mergeStateStatus: string;
  repoLabels: string[];
  mergeError?: string;
  reviewDecision?: string;
  workflows?: number;
  /** `.xe/config/catalyst.json` on the base branch; null for none */
  config: string | null;
  /** Required checks, as `gh pr checks --required --json name,bucket` lists them */
  required: { name: string; bucket: string }[];
  /** When the PR was opened */
  createdAt: string;
  crossRepository: boolean;
  /** The head commit's files and `package.json`, as git shows them */
  tree: string[];
  packageJson: string;
  /** Commands the test gates run, by what they run: a thrown error is a failed run */
  playwright: { status: number; out: string };
  catalystCheck: string;
}

let fake: Fake;
const gh: string[] = [];

const github = (over: Partial<Fake> = {}) => {
  fake = {
    author: "me",
    viewer: "me",
    isDraft: false,
    labels: [],
    assignees: [],
    reviews: [],
    checks: ["SUCCESS"],
    threads: [],
    comments: [],
    codeowners: null,
    mergeStateStatus: "CLEAN",
    repoLabels: ALL,
    config: null,
    required: [],
    createdAt: new Date().toISOString(),
    crossRepository: false,
    tree: [],
    packageJson: "",
    playwright: { status: 0, out: "" },
    catalystCheck: JSON.stringify({ findings: [], summary: { errors: 0, warnings: 0 } }),
    ...over,
  };
};

const outcome = (status: number, out: string): string => {
  if (status !== 0) { throw Object.assign(new Error("Command failed"), { status, stdout: out, stderr: "" }); }
  return out;
};

const answer = (args: string[], file = "gh"): string => {
  const a = args.join(" ");
  gh.push(file === "gh" ? a : `${file} ${a}`);
  if (file === "git") {
    if (args[0] === "ls-tree") { return fake.tree.join("\n"); }
    if (args[0] === "show") { return fake.packageJson; }
    return "";
  }
  if (file === "npx" && args[0] === "catalyst") { return fake.catalystCheck; }
  if (file === "npm" && args[0] === "run") { return outcome(fake.playwright.status, fake.playwright.out); }
  if (file === "npx" && args[0] === "playwright") { return outcome(fake.playwright.status, fake.playwright.out); }
  if (file !== "gh") { return ""; }
  if (a.startsWith("pr checks")) { return JSON.stringify(fake.required); }
  if (a.startsWith("pr view") && a.includes("isCrossRepository")) {
    return JSON.stringify({ isCrossRepository: fake.crossRepository, createdAt: fake.createdAt, commits: [], reviews: [], comments: [] });
  }
  if (a.includes("contents/.xe/config/catalyst.json")) {
    if (fake.config === null) { throw new Error("HTTP 404"); }
    return fake.config;
  }
  if (a === "api user --jq .login") { return `${fake.viewer}\n`; }
  if (a.includes("actions/workflows")) { return Array.from({ length: fake.workflows ?? 0 }, (_, i) => `.github/workflows/w${i}.yml`).join("\n"); }
  if (a.includes("contents/.github/workflows/")) { return "on: [pull_request]\n"; }
  if (a.startsWith("pr view") && a.includes("--json labels,assignees")) {
    return JSON.stringify({ labels: fake.labels.map((name) => ({ name })), assignees: fake.assignees.map((login) => ({ login })) });
  }
  if (a.startsWith("pr view") && a.includes("--json commits")) {
    return JSON.stringify({ commits: [{ messageHeadline: "feat: Thing", messageBody: "", authors: [{ name: "Me", email: "me@x.com" }] }] });
  }
  if (a.startsWith("pr view")) {
    return JSON.stringify({
      number: 5, title: "T", url: "u", author: { login: fake.author }, isDraft: fake.isDraft, state: "OPEN",
      labels: fake.labels.map((name) => ({ name })), assignees: fake.assignees.map((login) => ({ login })),
      headRefOid: HEAD, headRefName: "b", baseRefName: "main", mergeable: "MERGEABLE", mergeStateStatus: fake.mergeStateStatus, reviewDecision: fake.reviewDecision ?? "",
      latestReviews: fake.reviews.map((r) => ({ author: { login: r.login }, state: r.state, commit: { oid: r.commit ?? HEAD } })),
      statusCheckRollup: fake.checks.map((c, i) => ({ name: `c${i}`, status: c === "PENDING" ? "IN_PROGRESS" : "COMPLETED", conclusion: c === "PENDING" ? "" : c })),
    });
  }
  if (a.startsWith("pr edit")) {
    const flag = (f: string) => { const i = args.indexOf(f); return i < 0 ? [] : args[i + 1].split(","); };
    fake.labels = [...fake.labels.filter((l) => !flag("--remove-label").includes(l)), ...flag("--add-label")];
    fake.assignees = [...fake.assignees.filter((l) => !flag("--remove-assignee").includes(l)), ...flag("--add-assignee")];
    return "";
  }
  if (a.startsWith("pr merge")) {
    if (fake.mergeError) { throw new Error(`Command failed: gh pr merge\n${fake.mergeError}`); }
    return "";
  }
  if (a.includes("reviewThreads")) {
    return JSON.stringify({ data: { repository: { pullRequest: { reviewThreads: {
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: fake.threads.map((t) => ({ isResolved: t.resolved, comments: { nodes: t.comments.map((c) => ({ author: { login: c.login }, body: c.body })) } })),
    } } } } });
  }
  if (a.includes("labels(")) {
    return JSON.stringify({ data: { repository: { labels: {
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: fake.repoLabels.map((name) => ({ name, color: "000000", description: "", issues: { totalCount: 0 }, pullRequests: { totalCount: 0 } })),
    } } } });
  }
  if (a.includes("/files")) { return JSON.stringify([[{ filename: "src/a.ts" }]]); }
  if (a.includes("contents/")) {
    if (fake.codeowners === null) { throw new Error("HTTP 404"); }
    return fake.codeowners;
  }
  if (a.includes("issues/5/comments")) {
    return JSON.stringify([fake.comments.map(([login, body, at = "2026-01-02T00:00:00Z"], i) => ({
      user: { login, type: "User" }, body, html_url: `https://github.com/o/r/pull/5#issuecomment-${i}`, created_at: at,
    }))]);
  }
  if (a.includes("pulls/5/reviews")) { return "[[]]"; }
  if (a.includes("issues/5/events")) {
    const removed = fake.autopilotRemoved ? [{ event: "unlabeled", label: { name: AUTOPILOT }, created_at: fake.autopilotRemoved }] : [];
    return JSON.stringify([removed]);
  }
  return "";
};

let runsDir: string;
let cwd: string;

beforeEach(() => {
  PlaybookProvider.resetInstance();
  gh.length = 0;
  github();
  ghFile.mockReset().mockImplementation(((file: string, args: string[]) => answer(args, file)) as any);
  ghShell.mockReset().mockImplementation(((command: string) => {
    gh.push(command);
    if (command.includes("repo view")) { return JSON.stringify({ nameWithOwner: "o/r" }); }
    if (command.includes("pr comment")) { return "https://github.com/o/r/pull/5#issuecomment-1"; }
    return "{}";
  }) as any);
  runsDir = mkdtempSync(path.join(tmpdir(), "pr-command-"));
  // Nested playbooks resolve from the installed package; no label config, so the standard names apply
  fs.mkdirSync(path.join(runsDir, "node_modules/@xerilium/catalyst"), { recursive: true });
  fs.symlinkSync(path.join(ROOT, "src/resources/playbooks"), path.join(runsDir, "node_modules/@xerilium/catalyst/playbooks"));
  cwd = process.cwd();
  process.chdir(runsDir);
});

afterEach(() => {
  process.chdir(cwd);
  rmSync(runsDir, { recursive: true, force: true });
});

const run = async (file: string, inputs: Record<string, unknown> = { "pr-number": 5 }) => {
  const playbook = await PlaybookProvider.getInstance().loadPlaybook(file);
  return new Engine(undefined, new StatePersistence(runsDir)).run(playbook, inputs);
};
const reconcile = async (over: Partial<Fake> = {}) => {
  github(over);
  const result = await run(PR_COMMAND);
  if (result.status !== "completed") { throw new Error(JSON.stringify(result.error ?? result)); }
  return fake;
};
const merged = () => gh.filter((c) => c.startsWith("pr merge"));
const edits = () => gh.filter((c) => c.startsWith("pr edit"));

const unresolved = (...logins: string[]) => ({ resolved: false, comments: logins.map((login) => ({ login, body: "x" })) });
const approval = { login: "owner", state: "APPROVED" };

describe("pr command (reconcile)", () => {
  // @req FR:cli-engine/pr.@cli
  // @req FR:cli-engine/pr.@playbook
  it("is the pr command, taking only a required pr-number and running the reconcile playbook", () => {
    const text = fs.readFileSync(PR_COMMAND, "utf8");
    expect(text).toMatch(/^name: pr$/m);
    expect(text).toMatch(/inputs:\n\s+- number: pr-number\n\s+description: .*\n\s+required: true\n\nsteps:/);
    expect(text).toMatch(/- playbook: reconcile-pull-request/);
  });

  // @req FR:pull-request-workflow/reconcile.@playbook
  // @req FR:pull-request-workflow/reconcile.@playbook.reconcile
  // @req FR:pull-request-workflow/reconcile.input
  // @req FR:pull-request-workflow/autopilot.@playbook
  // @req FR:pull-request-workflow/autopilot.input
  it.each([
    ["reconcile-pull-request", RECONCILE],
    ["autopilot-pull-request", AUTOPILOT_PLAYBOOK],
  ])("has the %s playbook, taking only a required pr-number", (name, file) => {
    const text = fs.readFileSync(file, "utf8");
    expect(text).toMatch(new RegExp(`^name: ${name}$`, "m"));
    expect(text).toMatch(/inputs:\n\s+- number: pr-number\n\s+description: .*\n\s+required: true\n\nsteps:/);
  });

  // @req FR:pull-request-workflow/reconcile.yaml
  // @req FR:pull-request-workflow/autopilot.yaml
  it("decides in YAML, with no script and no AI step", () => {
    for (const file of [PR_COMMAND, RECONCILE, AUTOPILOT_PLAYBOOK, MERGE]) {
      expect(fs.readFileSync(file, "utf8")).not.toMatch(/^\s*-?\s*(script|ai-prompt|prompt):/m);
    }
  });

  describe("labels", () => {
    // @req FR:pull-request-workflow/reconcile.sync.needs-review
    // @req FR:pull-request-workflow/reconcile.assignment.review
    it("marks an open PR with no review as needing review", async () => {
      expect((await reconcile()).labels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/reconcile.labels
    it("skips a label the repository doesn't have", async () => {
      expect((await reconcile({ repoLabels: [] })).labels).toEqual([]);
    });

    // @req FR:pull-request-workflow/reconcile.labels
    // @req FR:pull-request-workflow/reconcile.@playbook.labels
    it("uses the configured label names", async () => {
      fs.mkdirSync(path.join(runsDir, ".xe/config"), { recursive: true });
      fs.writeFileSync(path.join(runsDir, ".xe/config/catalyst.json"), JSON.stringify({ labels: { style: "simple", names: { "needs-review": "PTAL" } } }));
      expect((await reconcile({ repoLabels: ["PTAL", "ready"] })).labels).toEqual(["PTAL"]);
    });

    // @req FR:pull-request-workflow/reconcile.labels.autopilot-variant
    it("accepts the older Autopilot label name when the repository has it", async () => {
      const variant = "Status: Autopilot 🤖";
      const repoLabels = [...ALL.filter((l) => l !== AUTOPILOT), variant];
      await reconcile({ labels: [variant], repoLabels, reviews: [approval] });
      expect(merged()).toHaveLength(1);
    });

    // @req FR:pull-request-workflow/reconcile.paused
    it("changes nothing on a paused PR, returning why", async () => {
      github({ labels: [PAUSED, READY, AUTOPILOT], threads: [unresolved("rev")] });
      const result = await run(RECONCILE);
      expect(result.status).toBe("completed");
      expect(JSON.stringify(result)).toContain("PullRequestPaused");
      expect(edits()).toEqual([]);
      expect(merged()).toEqual([]);
    });

    // @req FR:pull-request-workflow/reconcile.sync
    // @req FR:pull-request-workflow/reconcile.assignment.author
    // @req FR:pull-request-workflow/autopilot.finalized
    it("clears the review labels and Finalized from a draft", async () => {
      const pr = await reconcile({ isDraft: true, labels: [REVIEW, ATTENTION, READY, FINALIZED, "other"] });
      expect(pr.labels).toEqual(["other"]);
      expect(pr.assignees).toEqual(["me"]);
    });

    // @req FR:pull-request-workflow/reconcile.sync.needs-attention
    // @req FR:pull-request-workflow/reconcile.assignment.author
    it.each([
      ["a reviewer spoke last", { threads: [unresolved("me", "rev")] }],
      ["only the author spoke", { threads: [unresolved("me")] }],
      ["the author asked for a decision", { threads: [{ resolved: false, comments: [{ login: "rev", body: "?" }, { login: "me", body: "🧭 pick one" }] }] }],
      ["a check failed", { checks: ["SUCCESS", "FAILURE"] }],
    ])("needs attention when %s", async (_, over) => {
      const pr = await reconcile({ labels: [REVIEW], ...over } as Partial<Fake>);
      expect(pr.labels).toEqual([ATTENTION]);
      expect(pr.assignees).toEqual(["me"]);
    });

    // @req FR:pull-request-workflow/reconcile.sync.needs-attention.no-conflict
    it("doesn't need attention for a merge conflict or a thread the author answered", async () => {
      expect((await reconcile({ mergeStateStatus: "DIRTY", threads: [unresolved("rev", "me"), { resolved: true, comments: [] }] })).labels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/reconcile.sync.ready
    it("is ready when a human approves and no one requests changes", async () => {
      expect((await reconcile({ reviews: [approval] })).labels).toEqual([READY]);
      expect((await reconcile({ reviews: [approval, { login: "x", state: "CHANGES_REQUESTED" }] })).labels).toEqual([REVIEW]);
      expect((await reconcile({ reviews: [{ login: "copilot-pull-request-reviewer", state: "APPROVED" }] })).labels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/reconcile.sync.ready
    it("is ready only once the approvals the repository requires are in", async () => {
      expect((await reconcile({ reviews: [approval], reviewDecision: "REVIEW_REQUIRED" })).labels).toEqual([REVIEW]);
      expect((await reconcile({ reviews: [approval, { login: "boss", state: "APPROVED" }], reviewDecision: "APPROVED" })).labels).toEqual([READY]);
    });

    // @req FR:pull-request-workflow/reconcile.sync.ready
    it("counts an approval given on an older commit", async () => {
      expect((await reconcile({ reviews: [{ ...approval, commit: "0000000" }] })).labels).toEqual([READY]);
    });

    // @req FR:pull-request-workflow/autopilot.finalized
    // @req FR:pull-request-workflow/autopilot.gates
    // @req FR:pull-request-workflow/autopilot.gates.code-owner
    it("adds Finalized to an Autopilot PR that meets every merge gate", async () => {
      expect((await reconcile({ labels: [AUTOPILOT] })).labels).toContain(FINALIZED);
      expect((await reconcile({ labels: [AUTOPILOT], codeowners: "* @owner", reviews: [approval] })).labels).toContain(FINALIZED);
    });

    // @req FR:pull-request-workflow/autopilot.gates.checks
    it("passes a PR with no checks when the repository has no workflow, and waits for them otherwise", async () => {
      expect((await reconcile({ labels: [AUTOPILOT], checks: [] })).labels).toContain(FINALIZED);
      expect(merged()).toHaveLength(1);
      expect((await reconcile({ labels: [AUTOPILOT], checks: [], workflows: 1 })).labels).not.toContain(FINALIZED);
      expect(merged()).toHaveLength(1);
    });

    // @req FR:pull-request-workflow/autopilot.finalized
    // @req FR:pull-request-workflow/autopilot.gates.draft
    // @req FR:pull-request-workflow/autopilot.gates.code-owner
    // @req FR:pull-request-workflow/autopilot.gates.threads
    // @req FR:pull-request-workflow/autopilot.gates.checks
    // @req FR:pull-request-workflow/autopilot.gates.merge-state
    // @req FR:pull-request-workflow/autopilot.gates.blocked
    // @req FR:pull-request-workflow/autopilot.gates.changes-requested
    // @req FR:pull-request-workflow/autopilot.gates.autopilot
    // @req FR:pull-request-workflow/autopilot.gates.paused
    // @req FR:pull-request-workflow/autopilot.gates.wip
    // @req FR:pull-request-workflow/autopilot.gates.approval
    it.each([
      ["without the Autopilot label", { labels: [FINALIZED] }],
      ["that is a draft", { isDraft: true }],
      ["that is Blocked", { labels: [AUTOPILOT, FINALIZED, BLOCKED] }],
      ["that is a work in progress", { labels: [AUTOPILOT, FINALIZED, WIP] }],
      ["short of the approvals the repository requires", { reviews: [approval], reviewDecision: "REVIEW_REQUIRED" }],
      ["with a cancelled check", { checks: ["CANCELLED"] }],
      ["needing attention", { threads: [unresolved("rev")] }],
      ["code-owned and approved only by someone else", { codeowners: "* @owner", reviews: [{ login: "rev", state: "APPROVED" }] }],
      ["with a thread the author answered but didn't resolve", { threads: [unresolved("rev", "me")] }],
      ["with changes requested", { reviews: [approval, { login: "x", state: "CHANGES_REQUESTED" }] }],
      ["with a check still running", { checks: ["SUCCESS", "PENDING"] }],
      ["behind its base", { mergeStateStatus: "BEHIND" }],
    ])("removes Finalized from a PR %s", async (_, over) => {
      expect((await reconcile({ labels: [AUTOPILOT, FINALIZED], ...over } as Partial<Fake>)).labels).not.toContain(FINALIZED);
    });

    // @req FR:pull-request-workflow/reconcile.idempotent
    it("makes no edit when run again on an unchanged PR", async () => {
      await reconcile({ reviews: [approval], codeowners: "* @owner @boss" });
      const after = { ...fake };
      gh.length = 0;
      await reconcile({ ...after });
      expect(edits()).toEqual([]);
    });
  });

  describe("assignment", () => {
    // @req FR:pull-request-workflow/reconcile.assignment.review
    // @req FR:pull-request-workflow/reconcile.assignment.ready
    it("assigns code owners who haven't approved, plus the author once ready", async () => {
      expect((await reconcile({ codeowners: "* @owner @boss", assignees: ["someone"] })).assignees).toEqual(["owner", "boss"]);
      expect((await reconcile({ codeowners: "* @owner @boss", reviews: [approval] })).assignees).toEqual(["me", "boss"]);
    });

    // @req FR:pull-request-workflow/reconcile.assignment.blocked
    it.each([
      ["needing review", {}],
      ["that is a draft", { isDraft: true }],
      ["needing attention", { threads: [unresolved("rev")] }],
      ["that is ready", { reviews: [approval] }],
    ])("leaves a blocked PR's assignees as they are when %s", async (_, over) => {
      const pr = await reconcile({ labels: [BLOCKED], codeowners: "* @owner", assignees: ["someone"], ...over } as Partial<Fake>);
      expect(pr.assignees).toEqual(["someone"]);
    });

    // @req FR:pull-request-workflow/reconcile.assignment.review
    // @req FR:pull-request-workflow/reconcile.assignment.ready
    it("never assigns the author to review their own PR as a code owner", async () => {
      expect((await reconcile({ codeowners: "* @me @owner @boss" })).assignees).toEqual(["owner", "boss"]);
      expect((await reconcile({ codeowners: "* @me @owner @boss", reviews: [approval] })).assignees).toEqual(["me", "boss"]);
    });
  });

  describe("autopilot", () => {
    const ready = { labels: [AUTOPILOT], reviews: [approval] };

    // @req FR:pull-request-workflow/reconcile.autopilot
    // @req FR:pull-request-workflow/autopilot.merge
    // @req FR:pull-request-workflow/autopilot.merge.head-sha
    it("finalizes and merges an Autopilot PR in one run, at the head it read", async () => {
      await reconcile(ready);
      expect(merged()).toHaveLength(1);
      expect(merged()[0]).toContain(`--squash --match-head-commit ${HEAD}`);
    });

    // @req FR:pull-request-workflow/autopilot.gates
    it("decides from the gates, never from the Finalized label", async () => {
      await reconcile({ ...ready, labels: [AUTOPILOT, FINALIZED], mergeStateStatus: "BEHIND" });
      expect(merged()).toEqual([]);
      await reconcile(ready);
      expect(merged()).toHaveLength(1);
    });

    // @req FR:pull-request-workflow/autopilot.merge
    it("never merges a PR without the Autopilot label", async () => {
      await reconcile({ ...ready, labels: [FINALIZED] });
      expect(merged()).toEqual([]);
    });

    // @req FR:pull-request-workflow/autopilot.gates
    // @req FR:pull-request-workflow/autopilot.gates.blocked
    // @req FR:pull-request-workflow/autopilot.merge.author
    it.each([
      ["has an unresolved thread", { threads: [unresolved("rev", "me")] }],
      ["has a failing check", { checks: ["FAILURE"] }],
      ["is behind its base", { mergeStateStatus: "BEHIND" }],
      ["is Blocked", { labels: [AUTOPILOT, BLOCKED] }],
      ["is a work in progress", { labels: [AUTOPILOT, WIP] }],
      ["lacks the approvals the repository requires", { reviewDecision: "REVIEW_REQUIRED" }],
      ["needs attention", { threads: [unresolved("rev")] }],
      ["was authored by someone other than the signed-in user", { author: "other" }],
    ])("holds off when the PR %s", async (_, over) => {
      await reconcile({ ...ready, ...over } as Partial<Fake>);
      expect(merged()).toEqual([]);
    });

    // @req FR:pull-request-workflow/autopilot.gates.paused
    it("holds a paused PR when Autopilot runs on its own", async () => {
      github({ ...ready, labels: [AUTOPILOT, PAUSED] });
      expect((await run(AUTOPILOT_PLAYBOOK)).status).toBe("completed");
      expect(merged()).toEqual([]);
      expect(fake.labels).not.toContain(FINALIZED);
    });

    // @req FR:pull-request-workflow/autopilot.gates.order
    // @req FR:pull-request-workflow/autopilot.merge.hold
    it("names the first gate the PR fails", async () => {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      await reconcile({ ...ready, labels: [AUTOPILOT, BLOCKED], isDraft: false, threads: [unresolved("rev", "me")] });
      expect(log).toHaveBeenCalledWith("PR 5: not merging; it has the Blocked label");
      await reconcile({ ...ready, threads: [unresolved("rev", "me")] });
      expect(log).toHaveBeenCalledWith("PR 5: not merging; 1 review thread is unresolved");
      log.mockRestore();
    });

    // @req FR:pull-request-workflow/autopilot.merge.hold
    it("says whose PR it is when someone else opened it", async () => {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      await reconcile({ ...ready, author: "other" });
      expect(log).toHaveBeenCalledWith("PR 5: not merging; it was opened by other, not the signed-in user me");
      log.mockRestore();
    });

    // @req FR:pull-request-workflow/autopilot.result
    // @req FR:pull-request-workflow/autopilot.gates.order
    it.each([
      ["AutopilotLabelMissing", { labels: [] }],
      ["PullRequestPaused", { labels: [AUTOPILOT, PAUSED] }],
      ["PullRequestBlocked", { labels: [AUTOPILOT, BLOCKED] }],
      ["PullRequestWip", { labels: [AUTOPILOT, WIP] }],
      ["PullRequestDraft", { isDraft: true }],
      ["MergeStateNotClean", { mergeStateStatus: "BEHIND" }],
      ["ChecksNotPassing", { checks: ["PENDING"] }],
      ["ChangesRequested", { reviews: [approval, { login: "rev", state: "CHANGES_REQUESTED" }] }],
      ["ApprovalMissing", { reviewDecision: "REVIEW_REQUIRED" }],
      ["CodeOwnerApprovalMissing", { codeowners: "* @someone" }],
      ["ThreadsUnresolved", { threads: [unresolved("rev", "me")] }],
      ["AuthorNotViewer", { author: "other" }],
      ["Merged", {}],
    ])("returns %s", async (code, over) => {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      github({ ...ready, ...over } as Partial<Fake>);
      const result = await run(AUTOPILOT_PLAYBOOK);
      log.mockRestore();
      expect(result.status).toBe("completed");
      expect(result.outputs).toMatchObject({ code, message: expect.any(String) });
      expect(merged()).toHaveLength(code === "Merged" ? 1 : 0);
    });

    // @req FR:pull-request-workflow/autopilot.merge.author
    it("merges when the signed-in user authored it, ignoring case", async () => {
      await reconcile({ ...ready, viewer: "Me" });
      expect(merged()).toHaveLength(1);
    });
  });

  describe("hash commands", () => {
    const asked = { reviews: [approval], comments: [["me", "LGTM\n#autopilot"]] as Fake["comments"] };

    // @req FR:pull-request-workflow/reconcile.hash-commands
    // @req FR:pull-request-workflow/reconcile.hash-commands.autopilot
    // @req FR:pull-request-workflow/reconcile.hash-commands.autopilot.report
    it("applies Autopilot when the author asks, shows the comment, and merges in the same run", async () => {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      const pr = await reconcile(asked);
      expect(pr.labels).toContain(AUTOPILOT);
      expect(log).toHaveBeenCalledWith("PR 5: Autopilot added for https://github.com/o/r/pull/5#issuecomment-0");
      expect(merged()).toHaveLength(1);
      log.mockRestore();
    });

    // @req FR:pull-request-workflow/reconcile.hash-commands.autopilot
    it.each([
      ["someone else asks", { comments: [["rev", "#autopilot"]] }],
      ["the author only mentions it in a sentence", { comments: [["me", "Turn on #autopilot later"]] }],
      ["the repository has no Autopilot label", { repoLabels: [REVIEW, READY] }],
      ["the PR is paused", { labels: [PAUSED] }],
    ])("doesn't apply Autopilot when %s", async (_, over) => {
      github({ ...asked, ...over } as Partial<Fake>);
      await run(PR_COMMAND);
      expect(fake.labels).not.toContain(AUTOPILOT);
      expect(merged()).toEqual([]);
    });

    // @req FR:pull-request-workflow/reconcile.hash-commands.revert
    it("doesn't apply Autopilot again for a request made before someone removed it", async () => {
      expect((await reconcile({ ...asked, autopilotRemoved: "2026-01-03T00:00:00Z" })).labels).not.toContain(AUTOPILOT);
      const again = { ...asked, comments: [...asked.comments, ["me", "#autopilot", "2026-01-04T00:00:00Z"]] as Fake["comments"] };
      expect((await reconcile({ ...again, autopilotRemoved: "2026-01-03T00:00:00Z" })).labels).toContain(AUTOPILOT);
    });

    // @req FR:pull-request-workflow/reconcile.idempotent
    it("makes no label edit when the PR already has Autopilot", async () => {
      await reconcile({ ...asked, labels: [AUTOPILOT, READY], assignees: ["me"] });
      expect(edits().some((e) => e.includes(`--add-label ${AUTOPILOT}`))).toBe(false);
    });
  });

  describe("policy gates", () => {
    const ready = { labels: [AUTOPILOT], reviews: [approval] };
    const config = (merge: object) => JSON.stringify({ "pull-requests": { merge } });
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
    const pkg = (deps: object) => JSON.stringify({ devDependencies: deps });
    const commands = () => gh.filter((c) => /^(npm|npx|pnpm|yarn) /.test(c));
    const hold = async (over: Partial<Fake>) => {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      try {
        const pr = await reconcile({ ...ready, ...over });
        return { pr, said: log.mock.calls.map((c) => String(c[0])).find((m) => m.includes("not merging")) };
      } finally {
        log.mockRestore();
      }
    };

    // @req FR:pull-request-workflow/autopilot.gates.policy.excluded
    it("never merges or finalizes in a repository on the never-merge list", async () => {
      const { pr, said } = await hold({ config: config({ never: ["other/*", "*/r"] }) });
      expect(merged()).toEqual([]);
      expect(pr.labels).not.toContain(FINALIZED);
      expect(said).toContain("RepositoryExcluded");
    });

    // @req FR:pull-request-workflow/autopilot.gates.policy.excluded
    it("merges when the never-merge list names other repositories", async () => {
      await reconcile({ ...ready, config: config({ never: ["o/other", "other/*"] }) });
      expect(merged()).toHaveLength(1);
    });

    // @req FR:pull-request-workflow/autopilot.gates.policy
    it("fails the gates, not the run, when the config is not valid JSON", async () => {
      const { said } = await hold({ config: "{ nope" });
      expect(merged()).toEqual([]);
      expect(said).toContain("MergeConfigInvalid");
    });

    // @req FR:pull-request-workflow/reconcile.labels.autopilot-variant
    it("treats Status: Autopilot 🤖 as the Autopilot label", async () => {
      const variant = "Status: Autopilot 🤖";
      const pr = await reconcile({ labels: [variant], reviews: [approval], repoLabels: ALL.filter((l) => l !== AUTOPILOT).concat(variant) });
      expect(merged()).toHaveLength(1);
      expect(pr.labels).toContain(FINALIZED);
    });

    // @req FR:pull-request-workflow/autopilot.gates.policy.code-owner
    it("needs a human approval whenever the repository has code owners, even for files no owner covers", async () => {
      await reconcile({ labels: [AUTOPILOT], codeowners: "docs/ @owner" });
      expect(merged()).toEqual([]);
      await reconcile({ labels: [AUTOPILOT], codeowners: "docs/ @owner", reviews: [approval] });
      expect(merged()).toHaveLength(1);
    });

    // @req FR:pull-request-workflow/autopilot.gates.policy.code-owner
    it("needs no approval when CODEOWNERS has only comments", async () => {
      await reconcile({ labels: [AUTOPILOT], codeowners: "# nobody yet\n" });
      expect(merged()).toHaveLength(1);
    });

    describe("approval waiver", () => {
      const waiver = config({ "approval-waiver-days": { "*/r": 7 } });
      const owned = { labels: [AUTOPILOT], codeowners: "* @owner", config: waiver };

      // @req FR:pull-request-workflow/autopilot.gates.policy.waiver
      // @req FR:pull-request-workflow/autopilot.merge.waiver
      it("merges an inactive published PR without code-owner approval, telling the merge to skip that rule", async () => {
        await reconcile({ ...owned, createdAt: daysAgo(8) });
        expect(merged()).toHaveLength(1);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.waiver
      it("holds a PR that was active within the window", async () => {
        const { said } = await hold({ ...owned, labels: [AUTOPILOT], reviews: [], createdAt: daysAgo(3) });
        expect(merged()).toEqual([]);
        expect(said).toContain("CodeOwnerApprovalMissing");
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.waiver
      it("never waives a draft", async () => {
        await reconcile({ ...owned, isDraft: true, createdAt: daysAgo(30) });
        expect(merged()).toEqual([]);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.waiver
      it("waives nothing for a repository the list does not name", async () => {
        await reconcile({ ...owned, config: config({ "approval-waiver-days": { "o/other": 7 } }), createdAt: daysAgo(30) });
        expect(merged()).toEqual([]);
      });
    });

    describe("required checks", () => {
      // @req FR:pull-request-workflow/autopilot.gates.policy.checks
      it.each(["pending", "fail", "cancel", "skipping"])("holds on a required check that is %s", async (bucket) => {
        await reconcile({ ...ready, required: [{ name: "build", bucket }] });
        expect(merged()).toEqual([]);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.checks
      it("merges when every required check passed", async () => {
        await reconcile({ ...ready, required: [{ name: "build", bucket: "pass" }] });
        expect(merged()).toHaveLength(1);
      });
    });

    describe("tests", () => {
      const e2e = { ...ready, tree: ["playwright.config.ts", "package-lock.json"], packageJson: "{}" };
      const withCatalyst = { ...ready, tree: ["package.json"], packageJson: pkg({ "@xerilium/catalyst": "^0.3.0" }) };
      const summary = (errors: number, warnings: number) => JSON.stringify({ findings: [], summary: { errors, warnings } });

      // @req FR:pull-request-workflow/autopilot.gates.policy.playwright
      it("runs the repo's Playwright tests in a fresh worktree of the head commit, then removes it", async () => {
        await reconcile(e2e);
        expect(merged()).toHaveLength(1);
        const log = gh.join("\n");
        expect(log).toMatch(new RegExp(`git worktree add --detach .* ${HEAD}`));
        expect(commands()).toEqual(["npm ci", "npx playwright test"]);
        expect(log).toContain("git worktree remove --force");
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.playwright
      it("runs the repo's e2e script when it has one", async () => {
        await reconcile({ ...e2e, packageJson: JSON.stringify({ scripts: { "test:e2e": "playwright test" } }) });
        expect(commands()).toEqual(["npm ci", "npm run test:e2e"]);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.playwright
      it("holds when a Playwright test fails", async () => {
        const { said } = await hold({ ...e2e, playwright: { status: 1, out: "1 failed" } });
        expect(merged()).toEqual([]);
        expect(said).toContain("PlaywrightFailed");
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.playwright
      it("holds when the run logs a console error, even though every test passed", async () => {
        await reconcile({ ...e2e, playwright: { status: 0, out: "3 passed\nconsole.error: Failed to load resource" } });
        expect(merged()).toEqual([]);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.verified
      it("runs no tests when the repo has none", async () => {
        await reconcile({ ...ready, tree: ["package.json"], packageJson: "{}" });
        expect(commands()).toEqual([]);
        expect(merged()).toHaveLength(1);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.catalyst-check
      it("merges when catalyst check finds nothing, running it where Catalyst is installed", async () => {
        await reconcile(withCatalyst);
        expect(commands()).toEqual(["npm install", "npx catalyst check --json"]);
        expect(merged()).toHaveLength(1);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.catalyst-check
      it("holds when catalyst check returns an error", async () => {
        const { said } = await hold({ ...withCatalyst, catalystCheck: summary(1, 0) });
        expect(merged()).toEqual([]);
        expect(said).toContain("CatalystCheckFailed");
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.catalyst-check.strict
      it("merges past a catalyst check warning unless strictCheck is true", async () => {
        await reconcile({ ...withCatalyst, catalystCheck: summary(0, 4) });
        expect(merged()).toHaveLength(1);
        gh.length = 0;
        await reconcile({ ...withCatalyst, catalystCheck: summary(0, 4), config: config({ strictCheck: true }) });
        expect(merged()).toEqual([]);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.verified
      it("runs no tests for a PR the signed-in user did not author, and never merges it", async () => {
        await reconcile({ ...e2e, author: "other" });
        expect(commands()).toEqual([]);
        expect(merged()).toEqual([]);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.verified
      it("runs no tests for a PR that has not met the other gates", async () => {
        await reconcile({ ...e2e, threads: [unresolved("rev", "me")] });
        expect(commands()).toEqual([]);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.verified
      it("runs no tests for a PR without the Autopilot label", async () => {
        await reconcile({ ...e2e, labels: [] });
        expect(commands()).toEqual([]);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.verified
      it("does not run a fork's code", async () => {
        const { said } = await hold({ ...e2e, crossRepository: true });
        expect(commands()).toEqual([]);
        expect(merged()).toEqual([]);
        expect(said).toContain("ForkNotRun");
      });
    });
  });
});

describe("merge-pull-request", () => {
  // @req FR:pull-request-workflow/merge.@playbook
  // @req FR:pull-request-workflow/merge.input
  // @req FR:pull-request-workflow/merge.result
  it("needs only the PR number", async () => {
    const result = await run(MERGE);
    expect(result.status).toBe("completed");
    expect(result.outputs).toEqual({ code: "Merged", message: "Merged PR 5" });
    expect(merged()).toHaveLength(1);
  });

  // @req FR:pull-request-workflow/merge.squash
  it("squash-merges with Catalyst as a co-author, whatever the labels", async () => {
    await run(MERGE);
    const call = ghFile.mock.calls.map((c) => c[1] as string[]).find((a) => a[0] === "pr" && a[1] === "merge")!;
    expect(call).toContain("--squash");
    expect(call[call.indexOf("--body") + 1]).toBe(
      "Co-authored-by: Me <me@x.com>\nCo-authored-by: Catalyst AI <catalyst-noreply@xerilium.com>",
    );
  });

  // @req FR:pull-request-workflow/merge.input
  it("refuses a PR that moved past the head the caller checked", async () => {
    await run(MERGE, { "pr-number": 5, sha: "0000000" });
    expect(merged()).toEqual([]);
  });

  // @req FR:pull-request-workflow/merge.no-fail
  // @req FR:pull-request-workflow/merge.result
  it("completes without a comment when a merge rule isn't met", async () => {
    github({ checks: ["FAILURE"] });
    const result = await run(MERGE);
    expect(result.status).toBe("completed");
    expect(result.outputs).toMatchObject({ code: "ChecksNotPassing" });
    expect(merged()).toEqual([]);
    expect(gh.some((c) => c.includes("pr comment"))).toBe(false);
  });

  // @req FR:pull-request-workflow/merge.no-fail
  // @req FR:pull-request-workflow/merge.no-fail.comment
  it("comments with the reason and code when GitHub rejects the merge", async () => {
    github({ mergeError: "Base branch was modified" });
    expect((await run(MERGE)).status).toBe("completed");
    const comment = gh.find((c) => c.includes("pr comment")) ?? "";
    expect(comment).toContain("Base branch was modified");
    expect(comment).toContain("MergeFailed");
  });
});
