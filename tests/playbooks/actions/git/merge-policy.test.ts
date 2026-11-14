import {
  DEFAULT_POLICY,
  catalystCheckResult,
  hasCatalyst,
  hasConsoleError,
  hasPlaywright,
  inactiveFor,
  installCommand,
  isExcluded,
  lastActivity,
  parseMergePolicy,
  playwrightCommand,
  repoMatches,
  requiredChecksNotPassing,
  waiverDays,
} from "@playbooks/actions/git/merge-policy";

const DAY = 24 * 60 * 60 * 1000;

describe("parseMergePolicy", () => {
  // @req FR:playbook-actions-git/github-pr-gates.config.default
  it("defaults to no exclusions, no waivers, and a lenient check", () => {
    expect(parseMergePolicy(undefined)).toEqual(DEFAULT_POLICY);
    expect(parseMergePolicy("")).toEqual(DEFAULT_POLICY);
    expect(parseMergePolicy("{}")).toEqual(DEFAULT_POLICY);
    expect(parseMergePolicy('{"labels":{}}')).toEqual(DEFAULT_POLICY);
    expect(DEFAULT_POLICY.strictCheck).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-gates.config.keys
  it("reads never, approval-waiver-days, and strictCheck", () => {
    const text = JSON.stringify({
      "pull-requests": {
        merge: {
          never: ["*/finops-hubs", "Org/*"],
          "approval-waiver-days": { "*/printer": 7 },
          strictCheck: true,
        },
      },
    });
    expect(parseMergePolicy(text)).toEqual({
      never: ["*/finops-hubs", "Org/*"],
      approvalWaiverDays: { "*/printer": 7 },
      strictCheck: true,
    });
  });

  // @req FR:playbook-actions-git/github-pr-gates.config.keys
  it("ignores values of the wrong type, and counts only a true strictCheck", () => {
    const merge = {
      never: "x",
      "approval-waiver-days": { a: "seven", b: -1 },
      strictCheck: "yes",
    };
    expect(
      parseMergePolicy(JSON.stringify({ "pull-requests": { merge } })),
    ).toEqual(DEFAULT_POLICY);
  });

  // @req FR:playbook-actions-git/github-pr-gates.config.invalid
  it("throws on JSON it cannot read, so the gates fail closed", () => {
    expect(() => parseMergePolicy("{ nope")).toThrow(
      expect.objectContaining({ code: "MergeConfigInvalid" }),
    );
  });
});

describe("repository matching", () => {
  // @req FR:playbook-actions-git/github-pr-gates.config.match
  it.each([
    ["allytehq/finops-hubs", "*/finops-hubs", true],
    ["AllyteHQ/FinOps-Hubs", "*/finops-hubs", true],
    [
      "FinOps-Open-Cost-And-Usage-Spec/FOCUS-Spec",
      "FinOps-Open-Cost-And-Usage-Spec/*",
      true,
    ],
    ["xerilium/printer", "xerilium/printer", true],
    ["xerilium/printer", "*/*", true],
    ["xerilium/prime", "*/printer", false],
    ["other/printer", "xerilium/printer", false],
    ["xerilium/printer", "printer", false],
  ])("%s against %s is %s", (repo, pattern, expected) => {
    expect(repoMatches(repo, pattern)).toBe(expected);
  });

  // @req FR:playbook-actions-git/github-pr-gates.excluded
  it("excludes a repository on the never-merge list", () => {
    const policy = { ...DEFAULT_POLICY, never: ["*/finops-hubs"] };
    expect(isExcluded("a/finops-hubs", policy)).toBe(true);
    expect(isExcluded("a/other", policy)).toBe(false);
    expect(isExcluded("a/finops-hubs", DEFAULT_POLICY)).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-gates.waiver
  it("finds the waiver days for a listed repository", () => {
    const policy = {
      ...DEFAULT_POLICY,
      approvalWaiverDays: { "*/printer": 7 },
    };
    expect(waiverDays("xerilium/printer", policy)).toBe(7);
    expect(waiverDays("xerilium/prime", policy)).toBeUndefined();
  });
});

describe("inactivity", () => {
  const now = Date.parse("2026-11-10T00:00:00Z");
  const ago = (n: number) => new Date(now - n * DAY).toISOString();

  // @req FR:playbook-actions-git/github-pr-gates.waiver.activity
  it("takes the latest commit, review, or comment by a person", () => {
    expect(
      lastActivity({
        createdAt: ago(20),
        commits: [{ committedDate: ago(10) }],
        reviews: [
          { author: { login: "rev" }, submittedAt: ago(5) },
          { author: { login: "copilot[bot]" }, submittedAt: ago(1) },
        ],
        comments: [
          { author: { login: "github-actions[bot]" }, createdAt: ago(0) },
        ],
      }),
    ).toBe(now - 5 * DAY);
  });

  // @req FR:playbook-actions-git/github-pr-gates.waiver.activity
  it("knows nothing when nothing is dated", () => {
    expect(lastActivity({})).toBeUndefined();
  });

  // @req FR:playbook-actions-git/github-pr-gates.waiver
  it("is inactive from the listed day on, and never when activity is unknown", () => {
    expect(inactiveFor(now - 7 * DAY, now, 7)).toBe(true);
    expect(inactiveFor(now - 6.9 * DAY, now, 7)).toBe(false);
    expect(inactiveFor(undefined, now, 7)).toBe(false);
  });
});

describe("what a repository runs", () => {
  // @req FR:playbook-actions-git/github-pr-gates.playwright.detect
  it("has Playwright tests with a config file or the dependency", () => {
    expect(hasPlaywright(["playwright.config.ts"], undefined)).toBe(true);
    expect(hasPlaywright(["playwright.config.mjs"], {})).toBe(true);
    expect(
      hasPlaywright(["a.ts"], { devDependencies: { "@playwright/test": "1" } }),
    ).toBe(true);
    expect(
      hasPlaywright(["playwright.config.md"], {
        dependencies: { playwright: "1" },
      }),
    ).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-gates.catalyst-check.detect
  it("has Catalyst when it is a dependency", () => {
    expect(
      hasCatalyst({ devDependencies: { "@xerilium/catalyst": "1" } }),
    ).toBe(true);
    expect(hasCatalyst({ dependencies: { "@xerilium/catalyst": "1" } })).toBe(
      true,
    );
    expect(hasCatalyst({ dependencies: { other: "1" } })).toBe(false);
    expect(hasCatalyst(undefined)).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-gates.playwright.command
  it("runs the e2e script, else npx playwright test", () => {
    expect(
      playwrightCommand({ scripts: { "test:e2e": "x", playwright: "y" } }),
    ).toEqual({ file: "npm", args: ["run", "test:e2e"] });
    expect(playwrightCommand({ scripts: { playwright: "y" } })).toEqual({
      file: "npm",
      args: ["run", "playwright"],
    });
    expect(playwrightCommand({ scripts: { test: "jest" } })).toEqual({
      file: "npx",
      args: ["playwright", "test"],
    });
    expect(playwrightCommand(undefined)).toEqual({
      file: "npx",
      args: ["playwright", "test"],
    });
  });

  // @req FR:playbook-actions-git/github-pr-gates.tests.worktree
  it("installs with the lockfile the repository has", () => {
    expect(installCommand(["pnpm-lock.yaml"]).file).toBe("pnpm");
    expect(installCommand(["yarn.lock"]).file).toBe("yarn");
    expect(installCommand(["package-lock.json"])).toEqual({
      file: "npm",
      args: ["ci"],
    });
    expect(installCommand([])).toEqual({ file: "npm", args: ["install"] });
  });

  // @req FR:playbook-actions-git/github-pr-gates.playwright.console
  it.each([
    ["console.error: boom", true],
    ["[pageerror] TypeError: x is undefined", true],
    ["Uncaught TypeError: x", true],
    ["12 passed (4s)", false],
    ["console.log: hello", false],
  ])("reads %j as console error: %s", (output, expected) => {
    expect(hasConsoleError(output)).toBe(expected);
  });
});

describe("catalystCheckResult", () => {
  const out = (errors: number, warnings: number) =>
    JSON.stringify({ findings: [], summary: { errors, warnings } });

  // @req FR:playbook-actions-git/github-pr-gates.catalyst-check
  it("fails on an error and passes on a warning", () => {
    expect(catalystCheckResult(out(0, 0), false).ok).toBe(true);
    expect(catalystCheckResult(out(0, 9), false).ok).toBe(true);
    expect(catalystCheckResult(out(2, 0), false)).toEqual({
      ok: false,
      errors: 2,
      warnings: 0,
    });
  });

  // @req FR:playbook-actions-git/github-pr-gates.catalyst-check.strict
  it("fails on a warning when strict", () => {
    expect(catalystCheckResult(out(0, 1), true).ok).toBe(false);
    expect(catalystCheckResult(out(0, 0), true).ok).toBe(true);
  });

  // @req FR:playbook-actions-git/github-pr-gates.catalyst-check
  it("reads JSON after any text printed first, and fails on output it cannot read", () => {
    expect(
      catalystCheckResult(`Feedback injected.\n${out(0, 0)}`, true).ok,
    ).toBe(true);
    expect(catalystCheckResult("boom", false).ok).toBe(false);
    expect(catalystCheckResult("", false).ok).toBe(false);
  });
});

describe("requiredChecksNotPassing", () => {
  // @req FR:playbook-actions-git/github-pr-gates.required-checks
  it("lists every required check that did not pass", () => {
    const checks = ["pass", "pending", "fail", "cancel", "skipping"].map(
      (bucket) => ({ name: bucket, bucket }),
    );
    expect(requiredChecksNotPassing(checks).map((c) => c.name)).toEqual([
      "pending",
      "fail",
      "cancel",
      "skipping",
    ]);
    expect(requiredChecksNotPassing([])).toEqual([]);
  });
});

describe("github-pr-gates action", () => {
  // @req FR:playbook-actions-git/github-pr-gates.input
  it("rejects a bad PR number or a non-boolean Tests", async () => {
    const { GitHubPRGatesAction } =
      await import("@playbooks/actions/git/pr-gates-action");
    expect((await new GitHubPRGatesAction().execute({ pr: 0 })).code).toBe(
      "GitHubPRGatesConfigInvalid",
    );
    expect(
      (
        await new GitHubPRGatesAction().execute({
          pr: 5,
          tests: "yes" as unknown as boolean,
        })
      ).code,
    ).toBe("GitHubPRGatesConfigInvalid");
  });

  // @req FR:playbook-actions-git/github-pr-gates.tests.no-shell
  it("reports how a command ended instead of throwing", async () => {
    const { run } = await import("@playbooks/actions/git/pr-gates-action");
    expect(run("node", ["-e", "process.exit(3)"]).status).toBe(3);
    expect(run("node", ["-e", 'console.log("hi")']).stdout.trim()).toBe("hi");
    expect(run("definitely-not-a-command-xyz", []).status).not.toBe(0);
  });
});
