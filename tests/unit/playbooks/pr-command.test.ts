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
const TRIAGE = "Needs: Triage 🔍";
const LIVE_TEST = "Needs: Live test 🔬";
const WONT_FIX = "Resolution: Won't fix";
const PRIORITY = "Release: Priority ⭐";
const ALL = [AUTOPILOT, BLOCKED, FINALIZED, PAUSED, READY, WIP, ATTENTION, LIVE_TEST, REVIEW, TRIAGE, WONT_FIX, PRIORITY];
const HEAD = "abc1234def5678";

interface Fake {
  author: string;
  viewer: string;
  isDraft: boolean;
  state?: string;
  labels: string[];
  assignees: string[];
  reviews: { login: string; state: string; commit?: string }[];
  checks: string[];
  threads: { resolved: boolean; comments: { login: string; body: string }[] }[];
  /** Top-level comments as [login, body, time] */
  comments: [string, string, string?][];
  /** Inline review comments and thread replies as [login, body, time] */
  inline?: [string, string, string?][];
  /** When each label was last removed, by label name */
  removed?: Record<string, string>;
  /** When the Autopilot label was last removed */
  autopilotRemoved?: string;
  /** When Needs Attention was last removed */
  attentionRemoved?: string;
  /** When the PR was last marked ready for review */
  readyAt?: string;
  codeowners: string | null;
  /** The PR's changed files; defaults to `src/a.ts` */
  files?: string[];
  mergeStateStatus: string;
  repoLabels: string[];
  mergeError?: string;
  /** git can't list the head commit's files */
  treeFails?: boolean;
  /** gh can't read the PR's fork and activity fields */
  viewFails?: boolean;
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
  /** The base branch no longer exists */
  baseGone?: boolean;
  /** The repository's default branch; defaults to main */
  defaultBranch?: string;
  /** The PR's head and base branches; default b and main */
  head?: string;
  base?: string;
  /** The checked-out branch has no PR */
  noCurrentPr?: boolean;
  /** Open PRs as [number, head, base]; `pr view` fails for numbers in FailPrs */
  prs?: [number, string, string][];
  failPrs?: number[];
  /** Check runs already on the head commit */
  checkRuns?: { id: number; name: string; conclusion: string; output: { summary: string }; app?: { slug: string } }[];
  /** PR numbers whose base can't be changed */
  failEdits?: number[];
  /** A step of the reconcile fails: the review threads can't be read */
  threadsFail?: boolean;
  /** Failed jobs' step counts by job id */
  jobSteps?: Record<string, number>;
  /** Check rollup entries to use instead of the plain ones */
  rollup?: object[];
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
    if (args[0] === "ls-tree") { return fake.treeFails ? outcome(128, "") : fake.tree.join("\n"); }
    if (args[0] === "show") { return fake.packageJson; }
    return "";
  }
  if (file === "npx" && args[0] === "catalyst") { return fake.catalystCheck; }
  if (file === "npm" && args[0] === "run") { return outcome(fake.playwright.status, fake.playwright.out); }
  if (file === "npx" && args[0] === "playwright") { return outcome(fake.playwright.status, fake.playwright.out); }
  if (file !== "gh") { return ""; }
  if (a.startsWith("pr checks")) { return JSON.stringify(fake.required); }
  if (a.startsWith("pr view") && a.includes("headRefName,baseRefName,state")) {
    if (fake.noCurrentPr) { throw new Error('no pull requests found for branch "x"'); }
    return JSON.stringify({ number: 5, title: "T", headRefName: "b", baseRefName: "main", state: "OPEN" });
  }
  const viewed = /^pr view (\d+) /.exec(a);
  if (viewed && fake.failPrs?.includes(Number(viewed[1]))) { throw new Error("Command failed: gh pr view"); }
  if (a.startsWith("api repos/o/r/branches/")) {
    if (fake.baseGone) { throw new Error("HTTP 404: Branch not found"); }
    return "main";
  }
  if (a === "api repos/o/r --jq .default_branch") { return fake.defaultBranch ?? "main"; }
  const job = /^api repos\/o\/r\/actions\/jobs\/(\d+) /.exec(a);
  if (job) { return String(fake.jobSteps?.[job[1]] ?? 3); }
  if (a.includes("/check-runs?check_name=")) { return JSON.stringify({ check_runs: fake.checkRuns ?? [] }); }
  if (a.includes("-X POST repos/o/r/check-runs") || a.includes("-X PATCH repos/o/r/check-runs")) { return ""; }
  if (a.startsWith("api repos/o/r/pulls?")) {
    return JSON.stringify([(fake.prs ?? []).map(([number, head, base]) => ({ number, title: `PR ${number}`, state: "open", head: { ref: head }, base: { ref: base } }))]);
  }
  if (a.startsWith("pr view") && a.includes("isCrossRepository")) {
    if (fake.viewFails) { throw new Error("Command failed: gh pr view"); }
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
      number: 5, title: "T", url: "https://github.com/o/r/pull/5", author: { login: fake.author }, isDraft: fake.isDraft, state: fake.state ?? "OPEN",
      labels: fake.labels.map((name) => ({ name })), assignees: fake.assignees.map((login) => ({ login })),
      headRefOid: HEAD, headRefName: fake.head ?? "b", baseRefName: fake.base ?? "main",
      headRepository: { name: "r" }, headRepositoryOwner: { login: fake.crossRepository ? "fork" : "o" }, mergeable: "MERGEABLE", mergeStateStatus: fake.mergeStateStatus, reviewDecision: fake.reviewDecision ?? "",
      latestReviews: fake.reviews.map((r) => ({ author: { login: r.login }, state: r.state, commit: { oid: r.commit ?? HEAD } })),
      statusCheckRollup: fake.rollup ?? fake.checks.map((c, i) => ({ name: `c${i}`, status: c === "PENDING" ? "IN_PROGRESS" : "COMPLETED", conclusion: c === "PENDING" ? "" : c })),
    });
  }
  if (a.startsWith("pr edit")) {
    if (fake.failEdits?.includes(Number(args[2]))) { throw new Error("HTTP 422: Base branch can't be changed"); }
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
    if (fake.threadsFail) { throw new Error("Command failed: gh api graphql"); }
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
  if (a.includes("/files")) { return JSON.stringify([(fake.files ?? ["src/a.ts"]).map((filename) => ({ filename }))]); }
  if (a.includes("contents/")) {
    if (fake.codeowners === null) { throw new Error("HTTP 404"); }
    return fake.codeowners;
  }
  if (/pulls\/\d+\/comments/.test(a)) {
    return JSON.stringify([(fake.inline ?? []).map(([login, body, at = "2026-01-02T00:00:00Z"], i) => ({
      user: { login, type: "User" }, body, html_url: `https://github.com/o/r/pull/5#discussion_r${i}`, created_at: at,
    }))]);
  }
  if (/issues\/\d+\/comments/.test(a)) {
    return JSON.stringify([fake.comments.map(([login, body, at = "2026-01-02T00:00:00Z"], i) => ({
      user: { login, type: "User" }, body, html_url: `https://github.com/o/r/pull/5#issuecomment-${i}`, created_at: at,
    }))]);
  }
  if (/pulls\/\d+\/reviews/.test(a)) { return "[[]]"; }
  if (/issues\/\d+\/events/.test(a)) {
    const removed = [[AUTOPILOT, fake.autopilotRemoved], [ATTENTION, fake.attentionRemoved], ...Object.entries(fake.removed ?? {})]
      .filter(([, at]) => at)
      .map(([name, at]) => ({ event: "unlabeled", label: { name }, created_at: at }));
    const ready = fake.readyAt ? [{ event: "ready_for_review", created_at: fake.readyAt }] : [];
    return JSON.stringify([[...removed, ...ready]]);
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
  it("is the pr command, taking an optional pr-number and running the reconcile-pull-request-batch playbook", () => {
    const text = fs.readFileSync(PR_COMMAND, "utf8");
    expect(text).toMatch(/^name: pr$/m);
    expect(text).toMatch(/inputs:\n\s+- number: pr-number\n\s+description: .*\n\s+required: false\n/);
    expect(text).toMatch(/- playbook: reconcile-pull-request-batch/);
  });

  // @req FR:pull-request-workflow/reconcile.@playbook
  // @req FR:pull-request-workflow/reconcile.input
  // @req FR:pull-request-workflow/autopilot.@playbook
  // @req FR:pull-request-workflow/autopilot.input
  it.each([
    ["reconcile-pull-request", RECONCILE],
    ["autopilot-pull-request", AUTOPILOT_PLAYBOOK],
  ])("has the %s playbook, taking a required pr-number", (name, file) => {
    const text = fs.readFileSync(file, "utf8");
    expect(text).toMatch(new RegExp(`^name: ${name}$`, "m"));
    expect(text).toMatch(/inputs:\n\s+- number: pr-number\n\s+description: .*\n\s+required: true\n/);
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
    // @req FR:pull-request-workflow/labels.missing
    it("skips a label the repository doesn't have", async () => {
      expect((await reconcile({ repoLabels: [] })).labels).toEqual([]);
    });

    // @req FR:pull-request-workflow/labels.config
    // @req FR:pull-request-workflow/labels.@playbook
    it("uses the configured label names", async () => {
      fs.mkdirSync(path.join(runsDir, ".xe/config"), { recursive: true });
      fs.writeFileSync(path.join(runsDir, ".xe/config/catalyst.json"), JSON.stringify({ labels: { style: "simple", names: { "needs-review": "PTAL" } } }));
      expect((await reconcile({ repoLabels: ["PTAL", "ready"] })).labels).toEqual(["PTAL"]);
    });

    // @req FR:pull-request-workflow/labels.style
    // @req FR:pull-request-workflow/labels.style.standard
    it.each(["key-value", "custom", "unknown"])("uses the standard names for style %s", async (style) => {
      fs.mkdirSync(path.join(runsDir, ".xe/config"), { recursive: true });
      fs.writeFileSync(path.join(runsDir, ".xe/config/catalyst.json"), JSON.stringify({ labels: { style } }));
      expect((await reconcile()).labels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/reconcile.open
    it.each(["MERGED", "CLOSED"])("changes nothing on a %s PR, returning why", async (state) => {
      github({ state, labels: [AUTOPILOT, FINALIZED], reviews: [approval] });
      const result = await run(RECONCILE);
      expect(JSON.stringify(result)).toContain("PullRequestNotOpen");
      expect(edits()).toEqual([]);
      expect(merged()).toEqual([]);
    });

    // @req FR:pull-request-workflow/reconcile.autopilot
    // @req FR:pull-request-workflow/autopilot.merge.hold
    it("still runs Autopilot on an open PR without the label, which says why it holds", async () => {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      await reconcile();
      const said = log.mock.calls.map((c) => String(c[0]));
      log.mockRestore();
      expect(said).toContain("PR 5 isn't merging. PR doesn't have Autopilot enabled.");
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

    // @req FR:pull-request-workflow/reconcile.sync.ready.approver
    // @req FR:pull-request-workflow/reconcile.sync.ready.approver.fallback
    it("needs a code owner's approval when code owners are configured, and any human's when none are", async () => {
      expect((await reconcile({ codeowners: "* @owner", reviews: [{ login: "rev", state: "APPROVED" }] })).labels).toEqual([REVIEW]);
      expect((await reconcile({ codeowners: "* @owner", reviews: [approval] })).labels).toEqual([READY]);
      expect((await reconcile({ codeowners: null, reviews: [{ login: "rev", state: "APPROVED" }] })).labels).toEqual([READY]);
    });

    // @req FR:pull-request-workflow/reconcile.sync.ready.coexist
    // @req FR:pull-request-workflow/reconcile.sync.ready.changes
    it("is ready alongside Needs Attention, but never with changes requested", async () => {
      expect((await reconcile({ reviews: [approval], threads: [unresolved("rev")] })).labels.sort()).toEqual([ATTENTION, READY].sort());
      expect((await reconcile({ reviews: [approval, { login: "x", state: "CHANGES_REQUESTED" }] })).labels).not.toContain(READY);
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
    // @req FR:pull-request-workflow/autopilot.gates.needs-live-test
    // @req FR:pull-request-workflow/autopilot.gates.approval
    it.each([
      ["without the Autopilot label", { labels: [FINALIZED] }],
      ["that is a draft", { isDraft: true }],
      ["that is Blocked", { labels: [AUTOPILOT, FINALIZED, BLOCKED] }],
      ["that needs a live test", { labels: [AUTOPILOT, FINALIZED, LIVE_TEST] }],
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

  describe("live test", () => {
    // @req FR:pull-request-workflow/reconcile.sync.ready.live-test
    // @req FR:pull-request-workflow/reconcile.sync.needs-review.live-test
    it("holds Ready and Needs Review off an approved PR that needs a live test", async () => {
      expect((await reconcile({ labels: [LIVE_TEST, READY, REVIEW], reviews: [approval] })).labels).toEqual([LIVE_TEST]);
    });

    // @req FR:pull-request-workflow/reconcile.sync.needs-review
    // @req FR:pull-request-workflow/reconcile.sync.ready.live-test
    it("still asks for review on an unapproved PR that needs a live test", async () => {
      expect((await reconcile({ labels: [LIVE_TEST] })).labels).toEqual([LIVE_TEST, REVIEW]);
    });

    // @req FR:pull-request-workflow/reconcile.assignment.live-test
    it("assigns the author and pending code owners", async () => {
      expect((await reconcile({ labels: [LIVE_TEST], codeowners: "* @owner", assignees: ["someone"] })).assignees).toEqual(["me", "owner"]);
      expect((await reconcile({ labels: [LIVE_TEST], codeowners: "* @owner", reviews: [approval] })).assignees).toEqual(["me"]);
    });

    // @req FR:pull-request-workflow/reconcile.assignment.author
    // @req FR:pull-request-workflow/reconcile.assignment.blocked
    it("defers to attention, draft, and blocked rules", async () => {
      expect((await reconcile({ labels: [LIVE_TEST], codeowners: "* @owner", threads: [unresolved("rev")] })).assignees).toEqual(["me"]);
      expect((await reconcile({ labels: [LIVE_TEST, BLOCKED], codeowners: "* @owner", assignees: ["someone"] })).assignees).toEqual(["someone"]);
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

    // @req FR:pull-request-workflow/reconcile.autopilot
    // @req FR:pull-request-workflow/reconcile.autopilot.finalized
    it("runs Autopilot on every open PR but merges only an Autopilot one, and removes Finalized from any other", async () => {
      const pr = await reconcile({ ...ready, labels: [FINALIZED] });
      expect(pr.labels).not.toContain(FINALIZED);
      expect(merged()).toEqual([]);
      // Autopilot reads the label names again; reconcile alone reads them once
      expect(gh.filter((c) => c.includes("labels("))).toHaveLength(2);
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

    // @req FR:pull-request-workflow/autopilot.result
    // @req FR:pull-request-workflow/autopilot.gates.checks.named
    it.each([
      ["PR doesn't have Autopilot enabled.", { labels: [] }],
      ["PR is paused.", { labels: [AUTOPILOT, PAUSED] }],
      ["PR is blocked.", { labels: [AUTOPILOT, BLOCKED] }],
      ["PR is still a draft.", { isDraft: true }],
      ["PR needs more approvals.", { reviewDecision: "REVIEW_REQUIRED" }],
      ["PR is still being worked on.", { labels: [AUTOPILOT, WIP] }],
      ["PR can't merge yet (merge state: behind).", { mergeStateStatus: "BEHIND" }],
      ["PR has a failed or running check: c0 (running).", { checks: ["PENDING"] }],
      ["PR has a failed or running check: c1 (failed).", { checks: ["SUCCESS", "FAILURE"] }],
      ["PR has a failed or running check: w0.yml (no check reported yet).", { checks: [], workflows: 1 }],
      ["PR has requested changes.", { reviews: [approval, { login: "rev", state: "CHANGES_REQUESTED" }] }],
      ["PR needs a code owner's approval.", { codeowners: "* @someone" }],
      ["PR has 2 unresolved review threads.", { threads: [unresolved("rev", "me"), unresolved("rev", "me")] }],
      ["PR is waiting on its author (me).", { labels: [AUTOPILOT, ATTENTION] }],
    ])("says %s", async (message, over) => {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      github({ ...ready, ...over } as Partial<Fake>);
      const result = await run(AUTOPILOT_PLAYBOOK);
      log.mockRestore();
      expect(result.outputs).toMatchObject({ message });
    });

    // @req FR:pull-request-workflow/autopilot.gates.order
    // @req FR:pull-request-workflow/autopilot.merge.hold
    it("names the first gate the PR fails", async () => {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      await reconcile({ ...ready, labels: [AUTOPILOT, BLOCKED], isDraft: false, threads: [unresolved("rev", "me")] });
      expect(log).toHaveBeenCalledWith("PR 5 isn't merging. PR is blocked.");
      await reconcile({ ...ready, labels: [AUTOPILOT, LIVE_TEST, WIP] });
      expect(log).toHaveBeenCalledWith("PR 5 isn't merging. PR needs manual verification by a human.");
      await reconcile({ ...ready, threads: [unresolved("rev", "me")] });
      expect(log).toHaveBeenCalledWith("PR 5 isn't merging. PR has 1 unresolved review thread.");
      log.mockRestore();
    });

    // @req FR:pull-request-workflow/autopilot.merge.hold
    it("says whose PR it is when someone else opened it", async () => {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      await reconcile({ ...ready, author: "other" });
      expect(log).toHaveBeenCalledWith("PR 5 isn't merging. Autopilot merges only PRs you opened. other opened this one; you're signed in as me.");
      log.mockRestore();
    });

    // @req FR:pull-request-workflow/autopilot.result
    // @req FR:pull-request-workflow/autopilot.gates.order
    // @req FR:pull-request-workflow/autopilot.gates.needs-live-test
    // @req FR:pull-request-workflow/autopilot.gates.needs-attention
    it.each([
      ["PullRequestNotAutopilot", { labels: [] }],
      ["PullRequestPaused", { labels: [AUTOPILOT, PAUSED] }],
      ["PullRequestBlocked", { labels: [AUTOPILOT, BLOCKED] }],
      ["PullRequestNeedsLiveTest", { labels: [AUTOPILOT, LIVE_TEST, WIP] }],
      ["PullRequestBusy", { labels: [AUTOPILOT, WIP] }],
      ["PullRequestNotPublished", { isDraft: true }],
      ["PullRequestNotMergeable", { mergeStateStatus: "BEHIND" }],
      ["PullRequestChecksNotPassing", { checks: ["PENDING"] }],
      ["PullRequestChangesRequested", { reviews: [approval, { login: "rev", state: "CHANGES_REQUESTED" }] }],
      ["PullRequestNotApproved", { reviewDecision: "REVIEW_REQUIRED" }],
      ["PullRequestNotCodeOwnerApproved", { codeowners: "* @someone" }],
      ["PullRequestHasUnresolvedThreads", { threads: [unresolved("rev", "me")] }],
      ["PullRequestNeedsAttention", { labels: [AUTOPILOT, ATTENTION] }],
      ["NotPullRequestAuthor", { author: "other" }],
      ["PullRequestMerged", {}],
    ])("returns %s", async (code, over) => {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      github({ ...ready, ...over } as Partial<Fake>);
      const result = await run(AUTOPILOT_PLAYBOOK);
      log.mockRestore();
      expect(result.status).toBe("completed");
      expect(result.outputs).toMatchObject({ code, message: expect.any(String) });
      expect(merged()).toHaveLength(code === "PullRequestMerged" ? 1 : 0);
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
    // @req FR:pull-request-workflow/reconcile.hash-commands.report
    it("applies Autopilot when the author asks, shows the comment, and merges in the same run", async () => {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      const pr = await reconcile(asked);
      expect(pr.labels).toContain(AUTOPILOT);
      expect(log).toHaveBeenCalledWith("PR 5: Turned on Autopilot, as asked in https://github.com/o/r/pull/5#issuecomment-0.");
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

    describe("#needs-info", () => {
      const asks = (tag: string, at = "2026-01-02T00:00:00Z") => [["rev", `Please explain.\n#${tag}`, at]] as Fake["comments"];

      // @req FR:pull-request-workflow/reconcile.hash-commands.needs-info
      // @req FR:pull-request-workflow/reconcile.hash-commands.needs-info.triage
      // @req FR:pull-request-workflow/reconcile.sync.needs-attention.info
      // @req FR:pull-request-workflow/reconcile.sync.needs-attention
      // @req FR:pull-request-workflow/reconcile.hash-commands.report
      it.each(["needs-info", "Needs-Attn", "needs-attention"])("asks the author for information when a reviewer writes #%s", async (tag) => {
        const log = jest.spyOn(console, "log").mockImplementation(() => {});
        const pr = await reconcile({ labels: [REVIEW, TRIAGE], comments: asks(tag) });
        expect(pr.labels).toEqual([ATTENTION]);
        expect(pr.assignees).toEqual(["me"]);
        expect(log).toHaveBeenCalledWith("PR 5: Added the Needs Attention label, as asked in https://github.com/o/r/pull/5#issuecomment-0.");
        log.mockRestore();
      });

      // @req FR:pull-request-workflow/autopilot.gates.needs-attention
      it("holds an Autopilot PR while a request for information is open", async () => {
        await reconcile({ labels: [AUTOPILOT], reviews: [approval], comments: asks("needs-info") });
        expect(merged()).toEqual([]);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.needs-info
      // @req FR:pull-request-workflow/reconcile.hash-commands.needs-info.answer
      it("stops asking once the author comments", async () => {
        const answered = [...asks("needs-info"), ["me", "🤖 [AI] Explained above.", "2026-01-03T00:00:00Z"]] as Fake["comments"];
        expect((await reconcile({ labels: [ATTENTION], comments: answered })).labels).toEqual([REVIEW]);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.needs-info
      it("ignores the author's own request", async () => {
        expect((await reconcile({ comments: [["me", "#needs-info"]] })).labels).toEqual([REVIEW]);
      });

      // @req FR:pull-request-workflow/reconcile.sync.needs-attention.info
      it("keeps the request open on a draft, so publishing it doesn't lose it", async () => {
        const draft = await reconcile({ isDraft: true, comments: asks("needs-info") });
        expect(draft.labels).toEqual([ATTENTION]);
        expect((await reconcile({ ...draft, isDraft: false })).labels).toEqual([ATTENTION]);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.revert
      it("doesn't ask again after someone removes Needs Attention", async () => {
        expect((await reconcile({ comments: asks("needs-info"), attentionRemoved: "2026-01-03T00:00:00Z" })).labels).toEqual([REVIEW]);
      });
    });

    describe("label hashtags", () => {
      const said = (body: string, login = "rev", at = "2026-01-02T00:00:00Z") => [[login, body, at]] as Fake["comments"];
      const url = "https://github.com/o/r/pull/5#issuecomment-0";

      // @req FR:pull-request-workflow/reconcile.hash-commands.standard
      // @req FR:pull-request-workflow/labels.hashtags
      // @req FR:pull-request-workflow/reconcile.hash-commands.report
      it("adds the label for #needs-live-test from anyone and shows the comment", async () => {
        const log = jest.spyOn(console, "log").mockImplementation(() => {});
        const pr = await reconcile({ comments: said("Needs a real run.\n#Needs-Live-Test") });
        expect(pr.labels).toContain(LIVE_TEST);
        expect(log).toHaveBeenCalledWith(`PR 5: Added ${LIVE_TEST}, as asked in ${url}.`);
        log.mockRestore();
      });

      // @req FR:pull-request-workflow/labels.hashtags
      it.each([
        ["#wont-fix", WONT_FIX],
        ["#release-priority", PRIORITY],
        ["#blocked", BLOCKED],
        ["#wip", WIP],
        ["#needs-triage", TRIAGE],
      ])("adds the label for %s", async (tag, label) => {
        expect((await reconcile({ comments: said(tag) })).labels).toContain(label);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.standard
      it("adds several labels from one comment", async () => {
        const pr = await reconcile({ comments: said("#needs-live-test #release-priority") });
        expect(pr.labels).toEqual(expect.arrayContaining([LIVE_TEST, PRIORITY]));
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.standard
      it("uses the repository's label config for the name", async () => {
        fs.mkdirSync(path.join(runsDir, ".xe/config"), { recursive: true });
        fs.writeFileSync(path.join(runsDir, ".xe/config/catalyst.json"), JSON.stringify({ labels: { style: "simple", names: { "needs-live-test": "live test" } } }));
        const pr = await reconcile({ repoLabels: ["live test", "needs review", "wontfix"], comments: said("#needs-live-test #wont-fix") });
        expect(pr.labels).toEqual(expect.arrayContaining(["live test", "wontfix"]));
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands
      it("acts on a hashtag in an inline review comment or a thread reply", async () => {
        expect((await reconcile({ inline: [["rev", "#release-priority"]] })).labels).toContain(PRIORITY);
        expect((await reconcile({ inline: [["me", "Reply\n#wont-fix"]] })).labels).toContain(WONT_FIX);
      });

      // @req FR:playbook-actions-git/github-pr-get.hash-commands.top-level
      it("takes #autopilot only from the author at the top level", async () => {
        const approved = { reviews: [approval] };
        expect((await reconcile({ ...approved, inline: [["me", "#autopilot"]] })).labels).not.toContain(AUTOPILOT);
        expect((await reconcile({ ...approved, comments: [["me", "#autopilot"]] })).labels).toContain(AUTOPILOT);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.needs-info
      it("takes #needs-info from an inline review comment", async () => {
        expect((await reconcile({ inline: [["rev", "#needs-info"]] })).labels).toContain(ATTENTION);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.unsupported
      it.each(["#ready", "#finalized", "#needs-review", "#autopilot"])("ignores %s from someone else", async (tag) => {
        const pr = await reconcile({ labels: [], comments: said(tag) });
        expect(pr.labels).not.toContain(READY);
        expect(pr.labels).not.toContain(FINALIZED);
        expect(pr.labels).not.toContain(AUTOPILOT);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.unsupported
      it("doesn't let someone else's #needs-review put an approved PR back in review", async () => {
        const pr = await reconcile({ reviews: [approval], comments: said("#needs-review") });
        expect(pr.labels).not.toContain(REVIEW);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.unsupported
      it("adds no label from the author's #needs-attention through the standard path", async () => {
        const pr = await reconcile({ labels: [], comments: said("#needs-attention", "me") });
        expect(pr.labels).not.toContain(ATTENTION);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.needs-info.triage
      // @req FR:pull-request-workflow/reconcile.hash-commands.standard
      it("doesn't add Needs Triage while a request for information is open", async () => {
        const pr = await reconcile({ labels: [REVIEW], comments: said("#needs-triage #needs-info") });
        expect(pr.labels).toEqual([ATTENTION]);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.unsupported
      it("doesn't let the author's #ready or #finalized mark an unapproved PR", async () => {
        const pr = await reconcile({ comments: said("#ready #finalized", "me") });
        expect(pr.labels).toEqual([REVIEW]);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.standard
      it.each([
        ["the repository has no such label", { repoLabels: [REVIEW] } as Partial<Fake>],
        ["the PR already has it", { labels: [REVIEW, LIVE_TEST], assignees: ["me"] } as Partial<Fake>],
      ])("makes no label change for #needs-live-test when %s", async (_, over) => {
        gh.length = 0;
        const pr = await reconcile({ comments: said("#needs-live-test"), ...over } as Partial<Fake>);
        expect(pr.labels).toEqual((over as Partial<Fake>).labels ?? [REVIEW]);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.standard
      it("ignores a hashtag no label matches", async () => {
        expect((await reconcile({ comments: said("#lgtm #nope") })).labels).toEqual([REVIEW]);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.revert
      it("doesn't add a label again after someone removed it", async () => {
        const removed = { removed: { [LIVE_TEST]: "2026-01-03T00:00:00Z" } };
        expect((await reconcile({ comments: said("#needs-live-test"), ...removed })).labels).not.toContain(LIVE_TEST);
        expect((await reconcile({ comments: said("#needs-live-test", "rev", "2026-01-04T00:00:00Z"), ...removed })).labels).toContain(LIVE_TEST);
      });

      // @req FR:pull-request-workflow/reconcile.sync.ready.live-test
      it("holds an approved PR from Ready in the same run that adds Needs Live Test", async () => {
        const pr = await reconcile({ reviews: [approval], codeowners: "* @owner", comments: said("#needs-live-test") });
        expect(pr.labels).toContain(LIVE_TEST);
        expect(pr.labels).not.toContain(READY);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.paused
      it("adds Paused for #paused and changes nothing else", async () => {
        const pr = await reconcile({ comments: said("#paused") });
        expect(pr.labels).toEqual([PAUSED]);
        expect(pr.assignees).toEqual([]);
      });

      // @req FR:pull-request-workflow/reconcile.hash-commands.paused
      it("adds the labels hashtags ask for on a paused PR, and nothing else", async () => {
        const pr = await reconcile({ labels: [PAUSED], comments: said("#needs-live-test\n#wip") });
        expect(pr.labels).toEqual(expect.arrayContaining([PAUSED, LIVE_TEST, WIP]));
        expect(pr.labels).not.toContain(REVIEW);
      });
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
        return { pr, said: log.mock.calls.map((c) => String(c[0])).find((m) => m.includes("isn't merging")) };
      } finally {
        log.mockRestore();
      }
    };

    // @req FR:pull-request-workflow/autopilot.gates.policy
    // @req FR:playbook-actions-git/github-pr-gates.input.snapshot
    it("checks the policy gates on the PR the playbook already read", async () => {
      await reconcile(ready);
      expect(merged()).toHaveLength(1);
      // Reconcile, Autopilot, and the merge each read the PR; the policy gates reuse Autopilot's read
      expect(gh.filter((c) => c.startsWith("pr view") && c.includes("latestReviews"))).toHaveLength(5);
    });

    // @req FR:pull-request-workflow/autopilot.gates.policy.excluded
    it("never merges or finalizes in a repository on the never-merge list", async () => {
      const { pr, said } = await hold({ config: config({ never: ["other/*", "*/r"] }) });
      expect(merged()).toEqual([]);
      expect(pr.labels).not.toContain(FINALIZED);
      expect(said).toContain("never merges");
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
      expect(said).toContain("config is not valid JSON");
    });

    // @req FR:pull-request-workflow/autopilot.gates.policy.code-owner
    // @req FR:playbook-actions-git/github-pr-gates.code-owners
    // @req FR:playbook-actions-git/github-pr-get.owned-by-others
    it.each([
      ["only author-owned files change", "* @me\ndocs/ @bob", ["src/a.ts"], [], 1],
      ["only unowned files change", "docs/ @bob", ["src/a.ts"], [], 1],
      ["a docs file changes without bob", "* @me\ndocs/ @bob", ["src/a.ts", "docs/x.md"], [], 0],
      ["a docs file changes with someone else's approval", "* @me\ndocs/ @bob", ["docs/x.md"], [approval], 0],
      ["a docs file changes with bob's approval", "* @me\ndocs/ @bob", ["docs/x.md"], [{ login: "bob", state: "APPROVED" }], 1],
    ] as [string, string, string[], Fake["reviews"], number][])(
      "gates on owners of changed files only: %s",
      async (_case, codeowners, files, reviews, merges) => {
        const { said } = await hold({ labels: [AUTOPILOT], codeowners, files, reviews });
        expect(merged()).toHaveLength(merges);
        if (!merges) { expect(said).toContain("code owner"); }
      },
    );

    // @req FR:pull-request-workflow/autopilot.gates.policy.code-owner.author
    // @req FR:playbook-actions-git/github-pr-gates.code-owners.author
    it.each(["* @me", "* @Me\n# solo repo\n", "* @me\ndocs/ @me"])("skips the approval gate when the author is the only code owner (%j)", async (codeowners) => {
      await reconcile({ labels: [AUTOPILOT], reviews: [], codeowners, files: ["src/a.ts", "docs/x.md"] });
      expect(merged()).toHaveLength(1);
    });

    // @req FR:pull-request-workflow/autopilot.gates.policy.code-owner
    // @req FR:playbook-actions-git/github-pr-gates.code-owners
    it.each(["* @me @org/team", "* @me owner@example.com"])(
      "needs a human approval when a changed file has a team or email owner (%j)",
      async (codeowners) => {
        const { said } = await hold({ labels: [AUTOPILOT], reviews: [], codeowners });
        expect(merged()).toEqual([]);
        expect(said).toContain("A code owner other than the author owns a changed file");
        await reconcile({ labels: [AUTOPILOT], reviews: [approval], codeowners });
        expect(merged()).toHaveLength(1);
      },
    );

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
        expect(said).toContain("PR needs a code owner's approval.");
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.waiver
      // @req FR:playbook-actions-git/github-pr-gates.waiver.activity.ready
      it("counts time as a draft as active, from when the PR was marked ready", async () => {
        await reconcile({ ...owned, createdAt: daysAgo(30), readyAt: daysAgo(2) });
        expect(merged()).toEqual([]);
        await reconcile({ ...owned, createdAt: daysAgo(30), readyAt: daysAgo(8) });
        expect(merged()).toHaveLength(1);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.waiver
      // @req FR:playbook-actions-git/github-pr-gates.waiver.unread
      it("never waives when it can't read the PR's activity", async () => {
        await reconcile({ ...owned, createdAt: daysAgo(30), readyAt: daysAgo(30), viewFails: true });
        expect(merged()).toEqual([]);
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
      // @req FR:playbook-actions-git/github-pr-gates.tests.worktree
      // @req FR:playbook-actions-git/github-pr-gates.tests.worktree.cleanup
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
        expect(said).toContain("Playwright tests failed");
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
        expect(said).toContain("catalyst check found 1 error");
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.catalyst-check.strict
      it("merges past a catalyst check warning unless strict-check is true", async () => {
        await reconcile({ ...withCatalyst, catalystCheck: summary(0, 4) });
        expect(merged()).toHaveLength(1);
        gh.length = 0;
        await reconcile({ ...withCatalyst, catalystCheck: summary(0, 4), config: config({ "strict-check": true }) });
        expect(merged()).toEqual([]);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.verified
      it("runs no tests for a PR the signed-in user did not author, and never merges it", async () => {
        await reconcile({ ...e2e, author: "other" });
        expect(commands()).toEqual([]);
        expect(merged()).toEqual([]);
      });

      // @req FR:pull-request-workflow/autopilot.finalized.unverified
      it("leaves Finalized as is on someone else's PR whose tests it didn't run", async () => {
        expect((await reconcile({ ...e2e, author: "other" })).labels).not.toContain(FINALIZED);
        expect((await reconcile({ ...e2e, author: "other", labels: [AUTOPILOT, FINALIZED] })).labels).toContain(FINALIZED);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.verified
      it("runs no tests for a PR that has not met the other gates", async () => {
        await reconcile({ ...e2e, threads: [unresolved("rev", "me")] });
        expect(commands()).toEqual([]);
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.verified
      // @req FR:playbook-actions-git/github-pr-gates.tests.after-code-owners
      it("runs no tests until a code owner approves", async () => {
        const { said } = await hold({ ...e2e, reviews: [], codeowners: "* @owner" });
        expect(commands()).toEqual([]);
        expect(merged()).toEqual([]);
        expect(said).toContain("code owner");
      });

      // @req FR:pull-request-workflow/autopilot.gates.policy.verified
      // @req FR:playbook-actions-git/github-pr-gates.tests.after-code-owners
      it("runs the tests once the approval waiver applies", async () => {
        await reconcile({
          ...e2e,
          reviews: [],
          codeowners: "* @owner",
          config: config({ "approval-waiver-days": { "*/r": 7 } }),
          createdAt: daysAgo(8),
        });
        expect(commands()).toEqual(["npm ci", "npx playwright test"]);
        expect(merged()).toHaveLength(1);
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
        expect(said).toContain("comes from a fork");
      });

      // @req FR:playbook-actions-git/github-pr-gates.verified
      // @req FR:playbook-actions-git/github-pr-gates.verified.unrun
      it("holds as not verified when the head commit's files can't be listed", async () => {
        const { said } = await hold({ ...e2e, treeFails: true });
        expect(commands()).toEqual([]);
        expect(merged()).toEqual([]);
        expect(said).toContain("Couldn't list PR 5's files");
      });

      // @req FR:playbook-actions-git/github-pr-gates.verified
      // @req FR:playbook-actions-git/github-pr-gates.verified.unrun
      it("holds as not verified, not as a fork, when the PR can't be read", async () => {
        const { said } = await hold({ ...e2e, viewFails: true });
        expect(commands()).toEqual([]);
        expect(merged()).toEqual([]);
        expect(said).toContain("Couldn't read PR 5");
        expect(said).not.toContain("comes from a fork");
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
    expect(result.outputs).toEqual({ code: "PullRequestMerged", message: "Merged PR 5." });
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
    expect(result.outputs).toMatchObject({ code: "PullRequestChecksNotPassing" });
    expect(merged()).toEqual([]);
    expect(gh.some((c) => c.includes("pr comment"))).toBe(false);
  });

  // @req FR:pull-request-workflow/merge.no-fail
  // @req FR:pull-request-workflow/merge.no-fail.comment
  it("comments with the reason and code when GitHub rejects the merge", async () => {
    github({ mergeError: "Base branch was modified" });
    expect((await run(MERGE, { "pr-number": 5, "retry-delay-seconds": 0 })).status).toBe("completed");
    expect(merged()).toHaveLength(3);
    const comment = gh.find((c) => c.includes("pr comment")) ?? "";
    expect(comment).toContain("Base branch was modified");
    expect(comment).toContain("PullRequestMergeFailed");
  });
});

const said = (log: jest.SpyInstance) => log.mock.calls.map((c) => String(c[0]));
const checkWrites = () => gh.filter((c) => /-X (POST|PATCH) repos\/o\/r\/check-runs/.test(c));
const prLog = () => fs.readFileSync(path.join(runsDir, ".xe/runs/pr-5.md"), "utf8");
const reconcileWith = async (inputs: Record<string, unknown>, over: Partial<Fake> = {}) => {
  github(over);
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  const result = await run(PR_COMMAND, inputs);
  const out = said(log);
  log.mockRestore();
  return { result, out };
};

describe("pr command: finops-hubs parity", () => {
  describe("dead base", () => {
    // @req FR:pull-request-workflow/reconcile.sync.needs-attention.dead-base
    it("needs attention when the base branch is gone and isn't long-lived", async () => {
      expect((await reconcile({ baseGone: true, base: "stack-1", defaultBranch: "main" })).labels).toEqual([ATTENTION]);
    });

    // @req FR:pull-request-workflow/reconcile.sync.needs-attention.dead-base
    it("doesn't need attention when the gone base is the default branch or a configured long-lived branch", async () => {
      expect((await reconcile({ baseGone: true, base: "main" })).labels).toEqual([REVIEW]);
      expect((await reconcile({ baseGone: true, base: "release", config: JSON.stringify({ "pull-requests": { "long-lived-branches": ["release"] } }) })).labels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/reconcile.sync.needs-attention.dead-base
    it("leaves a draft with a gone base alone", async () => {
      expect((await reconcile({ baseGone: true, base: "stack-1", isDraft: true })).labels).toEqual([]);
    });
  });

  describe("check runs", () => {
    // @req FR:pull-request-workflow/reconcile.check-runs
    // @req FR:pull-request-workflow/reconcile.check-runs.threads
    // @req FR:pull-request-workflow/reconcile.check-runs.codeowner
    it("passes both check runs on the head commit when threads are resolved and no code owner is waiting", async () => {
      await reconcile({ reviews: [approval], threads: [{ resolved: true, comments: [{ login: "rev", body: "x" }] }] });
      const writes = checkWrites();
      expect(writes).toHaveLength(2);
      expect(writes[0]).toContain("name=Threads resolved");
      expect(writes[0]).toContain(`head_sha=${HEAD}`);
      expect(writes[0]).toContain("conclusion=success");
      expect(writes[1]).toContain("name=Codeowner approved");
      expect(writes[1]).toContain("conclusion=success");
    });

    // @req FR:pull-request-workflow/reconcile.check-runs.threads
    it("fails Threads resolved while a review thread is open", async () => {
      await reconcile({ threads: [unresolved("rev")] });
      expect(checkWrites()[0]).toContain("conclusion=failure");
      expect(checkWrites()[0]).toContain("1 unresolved review thread");
    });

    // @req FR:pull-request-workflow/reconcile.check-runs.codeowner
    it("fails Codeowner approved until a code owner approves, and names who is pending", async () => {
      await reconcile({ codeowners: "* @bob" });
      const write = checkWrites()[1];
      expect(write).toContain("name=Codeowner approved");
      expect(write).toContain("conclusion=failure");
      expect(write).toContain("Waiting on bob");
      await reconcile({ codeowners: "* @bob", reviews: [{ login: "bob", state: "APPROVED" }] });
      expect(checkWrites()[checkWrites().length - 1]).toContain("conclusion=success");
    });

    // @req FR:playbook-actions-git/github-check-run.idempotent
    it("writes nothing when the check runs already say the same", async () => {
      await reconcile({
        checkRuns: [
          { id: 1, name: "Threads resolved", conclusion: "success", output: { summary: "All review threads are resolved" }, app: { slug: "github-actions" } },
          { id: 2, name: "Codeowner approved", conclusion: "success", output: { summary: "No code owner reviews this PR" }, app: { slug: "github-actions" } },
        ],
      });
      expect(checkWrites()).toEqual([]);
    });

    // @req FR:pull-request-workflow/reconcile.check-runs
    it("never fails the run when the check runs can't be written", async () => {
      github();
      const inner = ghFile.getMockImplementation() as (...a: unknown[]) => string;
      ghFile.mockImplementation(((file: string, args: string[]) => {
        if (args.join(" ").includes("repos/o/r/check-runs")) { throw new Error("HTTP 403: Resource not accessible by integration"); }
        return inner(file, args);
      }) as never);
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      const result = await run(PR_COMMAND);
      const out = said(log);
      log.mockRestore();
      expect(result.status).toBe("completed");
      expect(out.some((l) => l.includes("Couldn't write the check runs"))).toBe(true);
      expect(edits().length).toBeGreaterThan(0);
    });

    // @req FR:pull-request-workflow/reconcile.own-checks.check-runs
    it("doesn't let its own check runs hold the PR", async () => {
      const own = [
        { name: "Threads resolved", status: "COMPLETED", conclusion: "FAILURE" },
        { name: "Codeowner approved", status: "COMPLETED", conclusion: "FAILURE" },
      ];
      expect((await reconcile({ rollup: own })).labels).toEqual([REVIEW]);
    });
  });

  describe("skip checks", () => {
    const flaky = [{ name: "ci", status: "COMPLETED", conclusion: "SUCCESS" }, { name: "flaky", status: "COMPLETED", conclusion: "FAILURE" }];

    // @req FR:pull-request-workflow/reconcile.skip-checks
    it("ignores a failed check named in the skip-checks input", async () => {
      expect((await reconcile({ rollup: flaky })).labels).toEqual([ATTENTION]);
      github({ rollup: flaky });
      await run(PR_COMMAND, { "pr-number": 5, "skip-checks": "other, Flaky" });
      expect(fake.labels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/reconcile.skip-checks
    it("ignores a failed check named in the repository's skip-checks setting", async () => {
      const config = JSON.stringify({ "pull-requests": { reconcile: { "skip-checks": ["flaky"] } } });
      expect((await reconcile({ rollup: flaky, config })).labels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/autopilot.skip-checks
    // @req FR:pull-request-workflow/merge.skip-checks
    it("merges an Autopilot PR whose only failed check is skipped", async () => {
      github({ rollup: flaky, labels: [AUTOPILOT], reviews: [approval] });
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      const result = await run(PR_COMMAND, { "pr-number": 5, "skip-checks": "flaky" });
      log.mockRestore();
      expect(result.status).toBe("completed");
      expect(merged()).toHaveLength(1);
    });

    // @req FR:pull-request-workflow/reconcile.diagnostics
    it("names the skipped checks in the diagnostics log", async () => {
      github({ rollup: flaky });
      await run(PR_COMMAND, { "pr-number": 5, "skip-checks": "flaky" });
      expect(prLog()).toContain("checks skipped: flaky");
    });

    // @req FR:playbook-actions-git/github-pr-get.skip-checks.no-steps
    it("ignores a failed job that ran no steps", async () => {
      const jobs = [{ name: "build", workflowName: "CI", status: "COMPLETED", conclusion: "FAILURE", detailsUrl: "https://github.com/o/r/actions/runs/1/job/42" }];
      expect((await reconcile({ rollup: jobs, jobSteps: { "42": 0 } })).labels).toEqual([REVIEW]);
      expect((await reconcile({ rollup: jobs, jobSteps: { "42": 5 } })).labels).toEqual([ATTENTION]);
    });
  });

  describe("dry run", () => {
    // @req FR:pull-request-workflow/reconcile.dry-run
    // @req FR:pull-request-workflow/reconcile.dry-run.unchanged
    it("reports the label, assignee, check-run, and merge decisions and makes none", async () => {
      const ready = { labels: [AUTOPILOT], reviews: [approval], assignees: [] as string[] };
      const { result, out } = await reconcileWith({ "pr-number": 5, "dry-run": true }, ready);
      expect(result.status).toBe("completed");
      expect(edits()).toEqual([]);
      expect(merged()).toEqual([]);
      expect(checkWrites()).toEqual([]);
      expect(out.some((l) => l.startsWith("PR 5: Would add labels"))).toBe(true);
      expect(out.some((l) => l.includes("Would write the check runs Threads resolved (success) and Codeowner approved (success)"))).toBe(true);
      expect(out.some((l) => l.includes("Would squash-merge PR 5"))).toBe(true);
      expect(fake.labels).toEqual([AUTOPILOT]);
    });

    // @req FR:pull-request-workflow/reconcile.dry-run.unchanged
    // @req FR:pull-request-workflow/autopilot.dry-run
    it("makes no label edit for hash commands or Finalized either", async () => {
      const { out } = await reconcileWith({ "pr-number": 5, "dry-run": true }, {
        labels: [AUTOPILOT, FINALIZED], reviews: [approval], comments: [["rev", "#needs-live-test"]], isDraft: true,
      });
      expect(edits()).toEqual([]);
      expect(out.some((l) => l.includes("Would"))).toBe(true);
    });

    // @req FR:pull-request-workflow/reconcile.dry-run.autopilot
    // @req FR:pull-request-workflow/autopilot.dry-run.labels
    it("decides the merge from the labels it would set, so a new hold label holds it", async () => {
      const { out } = await reconcileWith({ "pr-number": 5, "dry-run": true }, {
        labels: [AUTOPILOT], reviews: [approval], comments: [["rev", "#needs-live-test"]],
      });
      expect(out.some((l) => l.includes("Would squash-merge PR 5"))).toBe(false);
      expect(out.some((l) => l.includes("PR needs manual verification by a human."))).toBe(true);
      expect(edits()).toEqual([]);
    });

    // @req FR:pull-request-workflow/merge.dry-run
    it("says whether the merge playbook would merge, and merges nothing", async () => {
      github({ reviews: [approval] });
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      const result = await run(MERGE, { "pr-number": 5, "dry-run": true });
      const out = said(log);
      log.mockRestore();
      expect(result.outputs).toMatchObject({ code: "PullRequestWouldMerge" });
      expect(out.some((l) => l.includes("Would squash-merge PR 5"))).toBe(true);
      expect(merged()).toEqual([]);
    });
  });

  describe("merge", () => {
    // @req FR:pull-request-workflow/merge.hold
    it("holds the merge while the PR is paused or WIP", async () => {
      github({ labels: [PAUSED] });
      const result = await run(MERGE, { "pr-number": 5, "retry-delay-seconds": 0 });
      expect(result.outputs).toMatchObject({ code: "PullRequestHeld" });
      expect(merged()).toEqual([]);
    });

    // @req FR:pull-request-workflow/merge.retry
    it("retries a 5xx and merges", async () => {
      github();
      let failed = false;
      const inner = ghFile.getMockImplementation() as (...a: unknown[]) => string;
      ghFile.mockImplementation(((file: string, args: string[]) => {
        if (args[0] === "pr" && args[1] === "merge" && !failed) { failed = true; gh.push(args.join(" ")); throw new Error("Command failed: gh pr merge\nHTTP 502: Bad Gateway"); }
        return inner(file, args);
      }) as never);
      const result = await run(MERGE, { "pr-number": 5, "retry-delay-seconds": 0 });
      expect(result.outputs).toMatchObject({ code: "PullRequestMerged" });
      expect(merged()).toHaveLength(2);
    });

    // @req FR:pull-request-workflow/merge.already-merged
    it("reports an already merged PR as merged", async () => {
      github({ state: "MERGED" });
      const result = await run(MERGE, { "pr-number": 5, "retry-delay-seconds": 0 });
      expect(result.outputs).toMatchObject({ code: "PullRequestMerged" });
      expect(merged()).toEqual([]);
    });
  });

  describe("diagnostics", () => {
    // @req FR:pull-request-workflow/reconcile.diagnostics
    // @req FR:pull-request-workflow/reconcile.diagnostics.path
    it("writes the inputs, rule values, the rule that fired, the changes, and the merge outcome", async () => {
      await reconcile({ threads: [unresolved("rev")], labels: [AUTOPILOT] });
      const log = prLog();
      expect(log).toContain("# Reconcile PR 5");
      expect(log).toContain("## Inputs");
      expect(log).toContain("dry run: false");
      expect(log).toContain("## Rules");
      expect(log).toContain("needs attention: true (rule: thread waiting on the author");
      expect(log).toContain("## Changes");
      expect(log).toMatch(/labels: Status: 🤖 Autopilot -> .*Needs: Attention/);
      expect(log).toContain("## Merge");
      expect(log).toContain("PullRequestHasUnresolvedThreads");
    });

    // @req FR:pull-request-workflow/reconcile.diagnostics.partial
    it("writes the log even when a step fails", async () => {
      github({ threadsFail: true });
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      const result = await run(PR_COMMAND);
      log.mockRestore();
      expect(result.status).toBe("failed");
      expect(prLog()).toContain("# Reconcile PR 5");
    });

    // @req FR:pull-request-workflow/reconcile.diagnostics
    it("writes the log for a closed PR too", async () => {
      await reconcile({ state: "CLOSED" }).catch(() => undefined);
      expect(prLog()).toContain("# Reconcile PR 5");
    });
  });

  describe("reconcile-pull-request-batch", () => {
    // @req FR:pull-request-workflow/reconcile.batch.@playbook
    // @req FR:pull-request-workflow/reconcile.batch.input
    it("is the reconcile-pull-request-batch playbook, taking an optional pr-number, all, dry-run, and skip-checks", () => {
      const text = fs.readFileSync(path.join(ROOT, "src/resources/playbooks/reconcile-pull-request-batch.yaml"), "utf8");
      expect(text).toMatch(/^name: reconcile-pull-request-batch$/m);
      for (const input of ["number: pr-number", "boolean: all", "boolean: dry-run", "string: skip-checks"]) {
        expect(text).toContain(`- ${input}`);
      }
    });

    // @req FR:pull-request-workflow/reconcile.batch.default
    it("reconciles the PR for the checked-out branch when given no number", async () => {
      github();
      const result = await run(PR_COMMAND, {});
      expect(result.status).toBe("completed");
      expect(gh.some((c) => c.startsWith("pr view --json number,title,headRefName,baseRefName,state"))).toBe(true);
      expect(fake.labels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/reconcile.batch.default.none
    it("says the branch has no PR, and fails nothing, when it has none", async () => {
      const { result, out } = await reconcileWith({}, { noCurrentPr: true });
      expect(result.status).toBe("completed");
      expect(out).toContain("The checked-out branch has no open PR, so nothing changed.");
      expect(edits()).toEqual([]);
    });

    // @req FR:pull-request-workflow/reconcile.batch.number
    it("reconciles only the given PR, ignoring the checked-out branch", async () => {
      await reconcile();
      expect(gh.some((c) => c.includes("headRefName,baseRefName,state"))).toBe(false);
    });

    // @req FR:pull-request-workflow/reconcile.batch.all
    // @req FR:pull-request-workflow/reconcile.batch.all.rows
    // @req FR:pull-request-workflow/reconcile.batch.all.summary
    it("reconciles every open PR, one row each, then a summary", async () => {
      const { result, out } = await reconcileWith({ all: true }, { prs: [[5, "b", "main"]] });
      expect(result.status).toBe("completed");
      expect(out).toContain("PR 5: Reconciled.");
      expect(out).toContain("Reconciled 1 of 1 open PRs; 0 failed.");
      expect(fake.labels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/reconcile.batch.all.continue
    // @req FR:pull-request-workflow/reconcile.batch.all.rows
    // @req FR:pull-request-workflow/reconcile.batch.all.summary
    // @req FR:pull-request-workflow/reconcile.batch.all.fail
    it("keeps going when a PR fails, reports it, and fails after the summary", async () => {
      const { result, out } = await reconcileWith({ all: true }, { prs: [[9, "x", "main"], [5, "b", "main"]], failPrs: [9] });
      expect(out.some((l) => l.startsWith("PR 9: Failed."))).toBe(true);
      expect(out).toContain("PR 5: Reconciled.");
      expect(out).toContain("Reconciled 1 of 2 open PRs; 1 failed.");
      expect(result.status).toBe("failed");
      expect(fake.labels).toEqual([REVIEW]);
    });
  });
});

describe("pr-retarget command", () => {
  const RETARGET = path.join(ROOT, "src/resources/cli-commands/pr-retarget.yaml");
  const retarget = async (over: Partial<Fake>, inputs: Record<string, unknown> = { "pr-number": 5 }) => {
    github(over);
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const result = await run(RETARGET, inputs);
    const out = said(log);
    log.mockRestore();
    return { result, out };
  };
  const baseEdits = () => edits().filter((c) => c.includes("--base"));
  const comments = () => gh.filter((c) => c.includes("pr comment"));
  const stacked = { state: "CLOSED", head: "feature", base: "main", prs: [[7, "child", "feature"], [8, "other", "feature"]] as [number, string, string][] };

  // @req FR:cli-engine/pr.retarget
  // @req FR:pull-request-workflow/retarget.@playbook
  it("is the pr-retarget command, running the retarget playbook", () => {
    const text = fs.readFileSync(RETARGET, "utf8");
    expect(text).toMatch(/^name: pr-retarget$/m);
    expect(text).toMatch(/- playbook: retarget-pull-requests/);
  });

  // @req FR:pull-request-workflow/retarget.move
  // @req FR:pull-request-workflow/retarget.move.comment
  it("moves each PR stacked on a closed PR onto its base, with one comment each", async () => {
    const { result } = await retarget(stacked);
    expect(result.status).toBe("completed");
    expect(baseEdits()).toHaveLength(2);
    expect(baseEdits()[0]).toContain("pr edit 7 -R o/r --base main");
    expect(baseEdits()[1]).toContain("pr edit 8 -R o/r --base main");
    expect(comments()).toHaveLength(2);
    expect(comments()[0]).toContain("pr comment 7");
    expect(comments()[0]).toContain("feature");
    expect(comments()[0]).toContain("main");
  });

  // @req FR:pull-request-workflow/retarget.move
  it("looks only at open PRs whose base is the closed PR's head", async () => {
    await retarget(stacked);
    expect(gh.some((c) => c.includes("pulls?state=open") && c.includes("base=feature"))).toBe(true);
  });

  // @req FR:pull-request-workflow/retarget.unmerged
  it.each(["MERGED", "OPEN"])("does nothing for a %s PR", async (state) => {
    const { result } = await retarget({ ...stacked, state });
    expect(result.status).toBe("completed");
    expect(baseEdits()).toEqual([]);
    expect(comments()).toEqual([]);
  });

  // @req FR:pull-request-workflow/retarget.same-repository
  it("never retargets for a PR from a fork, even one named like a stacked base", async () => {
    const { result, out } = await retarget({ ...stacked, crossRepository: true });
    expect(result.status).toBe("completed");
    expect(out).toContain("PR 5 came from a fork, so nothing changed.");
    expect(gh.some((c) => c.startsWith("api repos/o/r/pulls?"))).toBe(false);
    expect(baseEdits()).toEqual([]);
    expect(comments()).toEqual([]);
  });

  // @req FR:pull-request-workflow/retarget.move.continue
  // @req FR:pull-request-workflow/retarget.move.fail
  it("keeps going when one stacked PR fails, then fails", async () => {
    const { result, out } = await retarget({ ...stacked, failEdits: [7] });
    expect(out.some((l) => l.startsWith("PR 7: Couldn't retarget."))).toBe(true);
    expect(out).toContain("PR 8: Moved onto main.");
    expect(baseEdits().some((c) => c.startsWith("pr edit 8"))).toBe(true);
    expect(result.status).toBe("failed");
  });

  // @req FR:pull-request-workflow/retarget.long-lived
  it("never retargets PRs stacked on a long-lived head", async () => {
    await retarget({ ...stacked, head: "main", base: "release" });
    expect(baseEdits()).toEqual([]);
    const config = JSON.stringify({ "pull-requests": { "long-lived-branches": ["feature"] } });
    await retarget({ ...stacked, config });
    expect(baseEdits()).toEqual([]);
  });

  // @req FR:pull-request-workflow/retarget.input
  it("reports what it would do, and does it not, on a dry run", async () => {
    const { out } = await retarget(stacked, { "pr-number": 5, "dry-run": true });
    expect(baseEdits()).toEqual([]);
    expect(comments()).toEqual([]);
    expect(out).toContain("PR 7: Would move onto main (was feature).");
    expect(out).toContain("PR 8: Would move onto main (was feature).");
  });
});
