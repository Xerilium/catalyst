/**
 * Autopilot merge policy: the gates beyond the standard GitHub merge rules.
 * Pure functions; the `github-pr-gates` action supplies the data and runs the commands.
 * @module playbooks/actions/git/merge-policy
 */

import { CatalystError } from "@core/errors";
import { createConfig, type CatalystConfig } from "@core/config";

/** `pull-requests.merge` in `.xe/config/catalyst.json` */
// @req FR:playbook-actions-git/github-pr-gates.config.keys
export interface MergePolicy {
  /** Repositories (`owner/repo`, `*` wildcards) that never merge */
  never: string[];
  /** Repositories whose inactive published PRs merge without code-owner sign-off, with the days of inactivity */
  approvalWaiverDays: Record<string, number>;
  /** Fail the Catalyst check gate on a warning, not only on an error */
  strictCheck: boolean;
}

/** The policy when nothing is set: the catalog defaults */
export const DEFAULT_POLICY: MergePolicy = parseMergePolicy(undefined);

/**
 * Read the merge policy from the text of `.xe/config/catalyst.json`. Missing text
 * or a missing key gives the catalog default; a config that is not a JSON object
 * throws, so the gates fail closed.
 */
// @req FR:playbook-actions-git/github-pr-gates.config
// @req FR:playbook-actions-git/github-pr-gates.config.default
// @req FR:playbook-actions-git/github-pr-gates.config.invalid
export function parseMergePolicy(text: string | undefined): MergePolicy {
  let config: CatalystConfig;
  try {
    config = createConfig(text);
  } catch {
    throw new CatalystError(
      "The Catalyst config is not a JSON object",
      "MergeConfigInvalid",
      "Fix `.xe/config/catalyst.json` on the base branch",
    );
  }
  const waivers: Record<string, number> = {};
  const raw = config["pull-requests"].merge["approval-waiver-days"];
  for (const [repo, days] of Object.entries(raw)) {
    if (typeof days === "number" && days >= 0) {
      waivers[repo] = days;
    }
  }
  return {
    never: config["pull-requests"].merge.never,
    approvalWaiverDays: waivers,
    strictCheck: config["pull-requests"].merge["strict-check"],
  };
}

/** Whether `owner/repo` matches a pattern, where `*` stands for any owner or any repository */
// @req FR:playbook-actions-git/github-pr-gates.config.match
export function repoMatches(repository: string, pattern: string): boolean {
  const [owner, repo] = repository.toLowerCase().split("/");
  const [pOwner, pRepo] = pattern.toLowerCase().split("/");
  if (!pRepo) {
    return false;
  }
  return (
    (pOwner === "*" || pOwner === owner) && (pRepo === "*" || pRepo === repo)
  );
}

// @req FR:playbook-actions-git/github-pr-gates.excluded
export function isExcluded(repository: string, policy: MergePolicy): boolean {
  return policy.never.some((p) => repoMatches(repository, p));
}

/** Days of inactivity after which `repository` waives code-owner sign-off, if it is listed */
export function waiverDays(
  repository: string,
  policy: MergePolicy,
): number | undefined {
  const entry = Object.entries(policy.approvalWaiverDays).find(([p]) =>
    repoMatches(repository, p),
  );
  return entry?.[1];
}

const BOT = /\[bot\]$|^copilot/i;

/** The parts of `gh pr view --json createdAt,commits,reviews,comments` the waiver reads */
export interface ActivityView {
  createdAt?: string;
  commits?: { committedDate?: string }[];
  reviews?: { author?: { login?: string }; submittedAt?: string }[];
  comments?: { author?: { login?: string }; createdAt?: string }[];
  /** When the PR was last marked ready for review */
  readyAt?: string;
}

/**
 * When a person last touched a PR: its creation, marking it ready for review,
 * a commit, a review, or a comment by anyone but a bot. Undefined when nothing
 * is dated.
 */
// @req FR:playbook-actions-git/github-pr-gates.waiver.activity
export function lastActivity(view: ActivityView): number | undefined {
  const times = [
    view.createdAt,
    // Time as a draft isn't inactivity: owners aren't asked to review a draft
    // @req FR:playbook-actions-git/github-pr-gates.waiver.activity.ready
    view.readyAt,
    ...(view.commits ?? []).map((c) => c.committedDate),
    ...(view.reviews ?? [])
      .filter((r) => !BOT.test(r.author?.login ?? ""))
      .map((r) => r.submittedAt),
    ...(view.comments ?? [])
      .filter((c) => !BOT.test(c.author?.login ?? ""))
      .map((c) => c.createdAt),
  ]
    .map((t) => (t ? Date.parse(t) : NaN))
    .filter((t) => !Number.isNaN(t));
  return times.length ? Math.max(...times) : undefined;
}

const DAY = 24 * 60 * 60 * 1000;

/** Whether the last activity is at least `days` old; unknown activity is never inactive */
export function inactiveFor(
  last: number | undefined,
  now: number,
  days: number,
): boolean {
  return last !== undefined && now - last >= days * DAY;
}

/** The parts of `package.json` the test gates read */
export interface PackageJson {
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const hasDep = (pkg: PackageJson | undefined, name: string) =>
  Boolean(pkg?.dependencies?.[name] || pkg?.devDependencies?.[name]);

// @req FR:playbook-actions-git/github-pr-gates.playwright.detect
export function hasPlaywright(
  rootFiles: string[],
  pkg: PackageJson | undefined,
): boolean {
  return (
    rootFiles.some((f) => /^playwright\.config\.[cm]?[jt]s$/.test(f)) ||
    hasDep(pkg, "@playwright/test")
  );
}

// @req FR:playbook-actions-git/github-pr-gates.catalyst-check.detect
export function hasCatalyst(pkg: PackageJson | undefined): boolean {
  return hasDep(pkg, "@xerilium/catalyst");
}

/**
 * The package manager's install command: the `packageManager` field, else the
 * lockfile, else `pnpm-workspace.yaml`, else npm. Never installs with a
 * different manager than the repo's, so no foreign lockfile is created.
 * @req FR:playbook-actions-git/github-pr-gates.tests.install
 */
export function installCommand(
  rootFiles: string[],
  pkg?: PackageJson,
): {
  file: string;
  args: string[];
} {
  const has = (f: string) => rootFiles.includes(f);
  const lockfiles: [string, string][] = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
  ];
  const manager =
    /^(pnpm|yarn|npm|bun)@/.exec(pkg?.packageManager ?? "")?.[1] ??
    lockfiles.find(([f]) => has(f))?.[1] ??
    (has("pnpm-workspace.yaml") ? "pnpm" : "npm");
  const locked = lockfiles.some(([f, m]) => m === manager && has(f));
  const berry =
    manager === "yarn" &&
    Number(/^yarn@(\d+)/.exec(pkg?.packageManager ?? "")?.[1] ?? 1) >= 2;
  if (berry) {
    // @req FR:playbook-actions-git/github-pr-gates.tests.install.yarn-berry
    return {
      file: "yarn",
      args: locked ? ["install", "--immutable"] : ["install"],
    };
  }
  if (manager === "pnpm" || manager === "yarn") {
    return {
      file: manager,
      args: locked ? ["install", "--frozen-lockfile"] : ["install"],
    };
  }
  if (manager === "bun") {
    return {
      file: "bun",
      args: locked ? ["install", "--frozen-lockfile"] : ["install"],
    };
  }
  return { file: "npm", args: locked ? ["ci"] : ["install"] };
}

/** The repo's own Playwright command */
// @req FR:playbook-actions-git/github-pr-gates.playwright.command
export function playwrightCommand(pkg: PackageJson | undefined): {
  file: string;
  args: string[];
} {
  const script = ["test:e2e", "e2e", "playwright"].find(
    (s) => pkg?.scripts?.[s],
  );
  return script
    ? { file: "npm", args: ["run", script] }
    : { file: "npx", args: ["playwright", "test"] };
}

const CONSOLE_ERROR =
  /\bconsole\.error\b|\[pageerror\]|\bpageerror\b|\bUncaught (?:\w*Error|Exception)\b/i;

/** Playwright joins a test's file and title with ` › ` */
const TEST_TITLE = / › /;

/**
 * Whether a test run's output shows a console error or an uncaught page error.
 * A line that names a test is skipped, so a title like "logs no console.error"
 * can't hold a passing run. Any other line counts.
 */
// @req FR:playbook-actions-git/github-pr-gates.playwright.console
// @req FR:playbook-actions-git/github-pr-gates.playwright.console.titles
export function hasConsoleError(output: string): boolean {
  return output
    .split("\n")
    .some((line) => !TEST_TITLE.test(line) && CONSOLE_ERROR.test(line));
}

/**
 * Judge `catalyst check --json` output. Errors always fail; warnings fail only
 * when `strict`. Unreadable output fails.
 */
// @req FR:playbook-actions-git/github-pr-gates.catalyst-check
// @req FR:playbook-actions-git/github-pr-gates.catalyst-check.strict
export function catalystCheckResult(
  stdout: string,
  strict: boolean,
): { ok: boolean; errors: number; warnings: number } {
  try {
    const { summary } = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
      summary: { errors: number; warnings: number };
    };
    const { errors, warnings } = summary;
    return {
      ok: errors === 0 && (!strict || warnings === 0),
      errors,
      warnings,
    };
  } catch {
    return { ok: false, errors: 1, warnings: 0 };
  }
}

/** One row of `gh pr checks --required --json name,bucket` */
export interface RequiredCheck {
  name: string;
  bucket: string;
}

/** Required checks that are pending, failed, cancelled, or skipped */
// @req FR:playbook-actions-git/github-pr-gates.required-checks
export function requiredChecksNotPassing(
  checks: RequiredCheck[],
): RequiredCheck[] {
  return checks.filter((c) => c.bucket !== "pass");
}
