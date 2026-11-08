/**
 * The `catalyst pr` reconcile playbook and the merge playbook, run through the
 * real engine against a fake GitHub
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
  isDraft: boolean;
  labels: string[];
  assignees: string[];
  reviews: { login: string; state: string }[];
  checks: string[];
  threads: { resolved: boolean; comments: { login: string; body: string }[] }[];
  comments: string[];
  codeowners: string | null;
  mergeStateStatus: string;
  repoLabels: string[];
  mergeError?: string;
}

let fake: Fake;
const gh: string[] = [];

const github = (over: Partial<Fake> = {}) => {
  fake = {
    author: "me",
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
    ...over,
  };
};

const answer = (args: string[]): string => {
  const a = args.join(" ");
  gh.push(a);
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
      headRefOid: HEAD, headRefName: "b", baseRefName: "main", mergeable: "MERGEABLE", mergeStateStatus: fake.mergeStateStatus,
      latestReviews: fake.reviews.map((r) => ({ author: { login: r.login }, state: r.state })),
      statusCheckRollup: fake.checks.map((conclusion, i) => ({ name: `c${i}`, status: "COMPLETED", conclusion })),
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
  if (a.includes("/comments")) { return JSON.stringify([fake.comments.map((body) => ({ user: { login: "me" }, body }))]); }
  return "";
};

let runsDir: string;
let cwd: string;

beforeEach(() => {
  PlaybookProvider.resetInstance();
  gh.length = 0;
  github();
  ghFile.mockReset().mockImplementation(((_: string, args: string[]) => answer(args)) as any);
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
const certified = `☑️ Finalized at ${HEAD.slice(0, 7)}`;

describe("pr command (reconcile)", () => {
  // @req FR:pull-request-workflow/lifecycle.@playbook
  // @req FR:pull-request-workflow/lifecycle.@playbook.reconcile
  // @req FR:pull-request-workflow/lifecycle.input
  // @req FR:pull-request-workflow/lifecycle.independent
  it("is the pr command, taking only a required pr-number", () => {
    const text = fs.readFileSync(PR_COMMAND, "utf8");
    expect(text).toMatch(/^name: pr$/m);
    expect(text).toMatch(/inputs:\n\s+- number: pr-number\n\s+description: .*\n\s+required: true\n\nsteps:/);
  });

  // @req FR:pull-request-workflow/lifecycle.yaml
  it("decides in YAML, with no script and no AI step", () => {
    for (const file of [PR_COMMAND, MERGE]) {
      expect(fs.readFileSync(file, "utf8")).not.toMatch(/^\s*-?\s*(script|ai-prompt|prompt):/m);
    }
  });

  describe("labels", () => {
    // @req FR:pull-request-workflow/lifecycle.needs-review
    // @req FR:pull-request-workflow/lifecycle.assignment
    it("marks an open PR with no review as needing review", async () => {
      expect((await reconcile()).labels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.labels
    it("skips a label the repository doesn't have", async () => {
      expect((await reconcile({ repoLabels: [] })).labels).toEqual([]);
    });

    // @req FR:pull-request-workflow/lifecycle.labels
    // @req FR:pull-request-workflow/lifecycle.@playbook.labels
    it("uses the configured label names", async () => {
      fs.mkdirSync(path.join(runsDir, ".xe/config"), { recursive: true });
      fs.writeFileSync(path.join(runsDir, ".xe/config/catalyst.json"), JSON.stringify({ labels: { style: "simple", names: { "needs-review": "PTAL" } } }));
      expect((await reconcile({ repoLabels: ["PTAL", "ready"] })).labels).toEqual(["PTAL"]);
    });

    // @req FR:pull-request-workflow/lifecycle.paused
    it("changes nothing on a paused PR", async () => {
      await reconcile({ labels: [PAUSED, READY], threads: [unresolved("rev")] });
      expect(edits()).toEqual([]);
      expect(merged()).toEqual([]);
    });

    // @req FR:pull-request-workflow/lifecycle.draft
    it("clears the review labels from a draft", async () => {
      const pr = await reconcile({ isDraft: true, labels: [REVIEW, ATTENTION, READY, FINALIZED, "other"] });
      expect(pr.labels).toEqual(["other"]);
      expect(pr.assignees).toEqual(["me"]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-attention
    // @req FR:pull-request-workflow/lifecycle.needs-attention.threads
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

    // @req FR:pull-request-workflow/lifecycle.needs-attention.no-conflict
    it("doesn't need attention for a merge conflict or a thread the author answered", async () => {
      expect((await reconcile({ mergeStateStatus: "DIRTY", threads: [unresolved("rev", "me"), { resolved: true, comments: [] }] })).labels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.ready
    it("is ready when a human approves and no one requests changes", async () => {
      expect((await reconcile({ reviews: [approval] })).labels).toEqual([READY]);
      expect((await reconcile({ reviews: [approval, { login: "x", state: "CHANGES_REQUESTED" }] })).labels).toEqual([REVIEW]);
      expect((await reconcile({ reviews: [{ login: "copilot-pull-request-reviewer", state: "APPROVED" }] })).labels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.finalized-stale
    it.each([
      ["a draft", { isDraft: true }],
      ["needing attention", { threads: [unresolved("rev")] }],
      ["code-owned and not ready", { codeowners: "* @owner" }],
      ["moved past the certified head", { comments: ["☑️ Finalized at 0000000"] }],
      ["never certified", { comments: [] }],
    ])("drops a stale Finalized label from a PR %s", async (_, over) => {
      expect((await reconcile({ labels: [FINALIZED], comments: [certified], ...over } as Partial<Fake>)).labels).not.toContain(FINALIZED);
    });

    // @req FR:pull-request-workflow/lifecycle.finalized-stale
    it("keeps Finalized while it holds, and never adds it", async () => {
      expect((await reconcile({ labels: [FINALIZED], comments: [certified] })).labels).toContain(FINALIZED);
      expect((await reconcile({ comments: [certified], reviews: [approval] })).labels).not.toContain(FINALIZED);
    });

    // @req FR:pull-request-workflow/lifecycle.idempotent
    it("makes no edit when run again on an unchanged PR", async () => {
      await reconcile({ reviews: [approval], codeowners: "* @owner @boss" });
      const after = { ...fake };
      gh.length = 0;
      await reconcile({ ...after });
      expect(edits()).toEqual([]);
    });
  });

  describe("assignment", () => {
    // @req FR:pull-request-workflow/lifecycle.assignment
    it("assigns code owners who haven't approved, plus the author once ready", async () => {
      expect((await reconcile({ codeowners: "* @owner @boss", assignees: ["someone"] })).assignees).toEqual(["owner", "boss"]);
      expect((await reconcile({ codeowners: "* @owner @boss", reviews: [approval] })).assignees).toEqual(["me", "boss"]);
    });

    // @req FR:pull-request-workflow/lifecycle.assignment
    it("leaves a blocked PR's assignees as they are", async () => {
      expect((await reconcile({ labels: [BLOCKED], codeowners: "* @owner", assignees: ["someone"] })).assignees).toEqual(["someone"]);
    });
  });

  describe("autopilot", () => {
    const ready = { labels: [AUTOPILOT, FINALIZED], comments: [certified], reviews: [approval] };

    // @req FR:pull-request-workflow/lifecycle.autopilot
    // @req FR:pull-request-workflow/lifecycle.autopilot.head-sha
    it("merges an Autopilot PR Finalized at its head, at that head", async () => {
      await reconcile(ready);
      expect(merged()).toHaveLength(1);
      expect(merged()[0]).toContain(`--squash --match-head-commit ${HEAD}`);
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot
    it("never merges a PR without the Autopilot label", async () => {
      await reconcile({ ...ready, labels: [FINALIZED] });
      expect(merged()).toEqual([]);
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot.finalized
    // @req FR:pull-request-workflow/lifecycle.autopilot.wip
    // @req FR:pull-request-workflow/lifecycle.autopilot.blocked
    // @req FR:pull-request-workflow/lifecycle.autopilot.attention
    it.each([
      ["isn't Finalized", { labels: [AUTOPILOT] }],
      ["was Finalized at an older head", { comments: ["☑️ Finalized at 0000000"] }],
      ["is WIP", { labels: [AUTOPILOT, FINALIZED, WIP] }],
      ["is Blocked", { labels: [AUTOPILOT, FINALIZED, BLOCKED] }],
      ["needs attention", { threads: [unresolved("rev")] }],
    ])("holds off when the PR %s", async (_, over) => {
      await reconcile({ ...ready, ...over } as Partial<Fake>);
      expect(merged()).toEqual([]);
    });
  });
});

describe("merge-pull-request", () => {
  // @req FR:pull-request-workflow/merge.@playbook
  // @req FR:pull-request-workflow/merge.input
  it("needs only the PR number", async () => {
    const result = await run(MERGE);
    expect(result.status).toBe("completed");
    expect(merged()).toHaveLength(1);
  });

  // @req FR:pull-request-workflow/merge.squash
  // @req FR:pull-request-workflow/merge.trailer
  it("squash-merges with Catalyst as a co-author, whatever the labels", async () => {
    await run(MERGE);
    const call = ghFile.mock.calls.map((c) => c[1] as string[]).find((a) => a[0] === "pr" && a[1] === "merge")!;
    expect(call).toContain("--squash");
    expect(call[call.indexOf("--body") + 1]).toBe(
      "* feat: Thing\n\nCo-authored-by: Me <me@x.com>\nCo-authored-by: Catalyst AI <catalyst-noreply@xerilium.com>",
    );
  });

  // @req FR:pull-request-workflow/merge.input
  it("refuses a PR that moved past the head the caller checked", async () => {
    await run(MERGE, { "pr-number": 5, sha: "0000000" });
    expect(merged()).toEqual([]);
  });

  // @req FR:pull-request-workflow/merge.no-fail
  it("completes without a comment when a merge rule isn't met", async () => {
    github({ checks: ["FAILURE"] });
    expect((await run(MERGE)).status).toBe("completed");
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
