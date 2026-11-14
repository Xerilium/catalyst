/**
 * GitHub pull request merge policy action
 * @module playbooks/actions/git/pr-gates-action
 */

import { execFileSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { GitHubActionBase } from "./base";
import { readPullRequest } from "./pr-get-action";
import {
  type ActivityView,
  type PackageJson,
  type RequiredCheck,
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
  requiredChecksNotPassing,
  waiverDays,
} from "./merge-policy";
import type { GitHubPRGatesConfig, PRGatesResult, PRSnapshot } from "./types";
import { CatalystError } from "@core/errors";

/** Test runs install dependencies and drive a browser; give them 20 minutes */
const TEST_TIMEOUT = 20 * 60 * 1000;

/** What a command did, without throwing */
interface Ran {
  status: number;
  stdout: string;
  stderr: string;
}

const text = (v: unknown) => (v === undefined || v === null ? "" : String(v));

/**
 * Run a command with an argument list and report how it ended, never throwing.
 * `gh` and `git` run without a shell; package managers need one on Windows.
 */
// @req FR:playbook-actions-git/github-pr-gates.tests.no-shell
export function run(
  file: string,
  args: string[],
  cwd?: string,
  timeout = 60_000,
): Ran {
  const shell = process.platform === "win32" && !["gh", "git"].includes(file);
  try {
    const stdout = execFileSync(file, args, {
      encoding: "utf-8",
      cwd,
      timeout,
      shell,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
    return { status: 0, stdout: text(stdout), stderr: "" };
  } catch (error: unknown) {
    const e = error as {
      status?: number;
      stdout?: unknown;
      stderr?: unknown;
      message?: string;
    };
    return {
      status: e.status ?? 1,
      stdout: text(e.stdout),
      stderr: text(e.stderr) || text(e.message),
    };
  }
}

const fail = (
  gate: string,
  code: string,
  message: string,
  waived = false,
): PRGatesResult => ({
  pass: false,
  gate,
  code,
  message,
  waived,
});

/**
 * Action to check the Autopilot merge policy: the gates beyond the standard
 * GitHub merge rules
 */
// @req FR:playbook-actions-git/github-pr-gates.@action
// @req FR:playbook-actions-git/github-pr-gates.output
export class GitHubPRGatesAction extends GitHubActionBase<
  GitHubPRGatesConfig,
  PRGatesResult
> {
  static readonly actionType = "github-pr-gates";

  static readonly primaryProperty = "pr";

  // @req FR:playbook-actions-git/github-pr-gates.input
  // @req FR:playbook-actions-git/common.validation
  protected validateConfig(config: GitHubPRGatesConfig): void {
    if (!config?.pr || typeof config.pr !== "number" || config.pr <= 0) {
      throw new CatalystError(
        "PR number is required and must be a positive integer",
        "GitHubPRGatesConfigInvalid",
        "Provide a valid pull request number",
      );
    }
    if (config.tests !== undefined && typeof config.tests !== "boolean") {
      throw new CatalystError(
        "Tests must be true or false",
        "GitHubPRGatesConfigInvalid",
        "Pass a boolean, or omit it",
      );
    }
  }

  // @req FR:playbook-actions-git/github-pr-gates.order
  // @req FR:playbook-actions-git/github-pr-gates.refused
  protected async executeGitHubOperation(
    config: GitHubPRGatesConfig,
  ): Promise<PRGatesResult> {
    const repository = config.repository || (await this.getCurrentRepository());
    const gh = (args: string[]) => this.executeGh(args);
    const snap = readPullRequest(gh, repository, config.pr);

    let policy;
    try {
      policy = parseMergePolicy(this.readConfig(repository, snap.baseRef));
    } catch (error) {
      if (error instanceof CatalystError) {
        return fail("config", error.code, error.message);
      }
      throw error;
    }

    if (isExcluded(repository, policy)) {
      return fail(
        "excluded",
        "RepositoryExcluded",
        `${repository} never merges; a person merges its PRs.`,
      );
    }

    const days = waiverDays(repository, policy);
    const needsView = days !== undefined || config.tests;
    const view = needsView ? this.readView(repository, config.pr) : undefined;
    const waived =
      !snap.isDraft &&
      days !== undefined &&
      inactiveFor(lastActivity(view ?? {}), Date.now(), days);

    if (!waived) {
      const refusal = this.codeOwnerRefusal(snap);
      if (refusal) {
        return fail("code-owners", "CodeOwnerApprovalMissing", refusal);
      }
    }

    const checks = this.requiredChecks(repository, config.pr);
    if (typeof checks === "string") {
      return fail("required-checks", "RequiredCheckNotPassing", checks, waived);
    }
    const notPassing = requiredChecksNotPassing(checks);
    if (notPassing.length) {
      return fail(
        "required-checks",
        "RequiredCheckNotPassing",
        `Required checks aren't passing: ${notPassing.map((c) => `${c.name} (${c.bucket})`).join(", ")}.`,
        waived,
      );
    }

    const tests = this.runTests(
      repository,
      snap,
      config.tests === true,
      view?.isCrossRepository,
      policy.strictCheck,
    );
    return tests ? { ...tests, waived } : { pass: true, waived };
  }

  /** Why code-owner sign-off is missing, or nothing when it isn't */
  // @req FR:playbook-actions-git/github-pr-gates.code-owners
  // @req FR:playbook-actions-git/github-pr-gates.code-owners.file
  private codeOwnerRefusal(snap: PRSnapshot): string | undefined {
    if (snap.codeOwnersConfigured && !snap.approved) {
      return `This repository has code owners, and no human reviewer has approved PR ${snap.number}.`;
    }
    if (!snap.codeOwnerApproved) {
      return `A code owner hasn't approved yet (${snap.codeOwners.join(", ")}).`;
    }
    return undefined;
  }

  /** The config text on the base branch; none when the file isn't there */
  private readConfig(repository: string, baseRef: string): string | undefined {
    try {
      return this.executeGh([
        "api",
        `repos/${repository}/contents/.xe/config/catalyst.json?ref=${baseRef}`,
        "-H",
        "Accept: application/vnd.github.raw",
      ]);
    } catch (error) {
      if (
        !/404|not found/i.test(
          error instanceof Error ? error.message : String(error),
        )
      ) {
        throw error;
      }
      return undefined;
    }
  }

  private readView(
    repository: string,
    pr: number,
  ): ActivityView & { isCrossRepository?: boolean } {
    const ran = run("gh", [
      "pr",
      "view",
      String(pr),
      "-R",
      repository,
      "--json",
      "isCrossRepository,createdAt,commits,reviews,comments",
    ]);
    try {
      return JSON.parse(ran.stdout) as ActivityView & {
        isCrossRepository?: boolean;
      };
    } catch {
      return {};
    }
  }

  /** The required checks, or why they can't be read */
  // @req FR:playbook-actions-git/github-pr-gates.required-checks.source
  // @req FR:playbook-actions-git/github-pr-gates.required-checks.optional
  private requiredChecks(
    repository: string,
    pr: number,
  ): RequiredCheck[] | string {
    // gh exits non-zero while checks are pending or failing, but still prints the list
    const ran = run("gh", [
      "pr",
      "checks",
      String(pr),
      "-R",
      repository,
      "--required",
      "--json",
      "name,bucket",
    ]);
    try {
      return JSON.parse(ran.stdout) as RequiredCheck[];
    } catch {
      if (/no (required )?checks reported/i.test(ran.stderr)) {
        return [];
      }
      return `Couldn't read the required checks for PR ${pr}.`;
    }
  }

  /** Playwright, then Catalyst check, in a fresh worktree of the head commit; nothing when both pass or neither applies */
  // @req FR:playbook-actions-git/github-pr-gates.tests
  // @req FR:playbook-actions-git/github-pr-gates.verified
  private runTests(
    repository: string,
    snap: PRSnapshot,
    allowed: boolean,
    crossRepository: boolean | undefined,
    strict: boolean,
  ): PRGatesResult | undefined {
    // Detecting what to run needs a fetch; without permission to run, a PR is simply not verified
    if (!allowed) {
      return fail(
        "verified",
        "NotVerified",
        `PR ${snap.number}'s tests weren't run.`,
      );
    }
    const sha = snap.headSha;
    const fetched = run("git", [
      "fetch",
      "--quiet",
      "origin",
      `refs/pull/${snap.number}/head`,
    ]);
    if (fetched.status !== 0) {
      return fail(
        "verified",
        "NotVerified",
        `Couldn't fetch PR ${snap.number} to check it.`,
      );
    }
    const rootFiles = run("git", ["ls-tree", "--name-only", sha])
      .stdout.split("\n")
      .filter(Boolean);
    let pkg: PackageJson | undefined;
    try {
      pkg = JSON.parse(
        run("git", ["show", `${sha}:package.json`]).stdout,
      ) as PackageJson;
    } catch {
      pkg = undefined;
    }
    const playwright = hasPlaywright(rootFiles, pkg);
    const catalyst = hasCatalyst(pkg);
    if (!playwright && !catalyst) {
      return undefined;
    }
    // @req FR:playbook-actions-git/github-pr-gates.tests.fork
    if (crossRepository !== false) {
      return fail(
        "verified",
        "ForkNotRun",
        `PR ${snap.number} comes from a fork, so its code isn't run here.`,
      );
    }

    const dir = mkdtempSync(join(tmpdir(), "catalyst-pr-gates-"));
    const tree = join(dir, "tree");
    try {
      // @req FR:playbook-actions-git/github-pr-gates.tests.worktree
      const added = run("git", ["worktree", "add", "--detach", tree, sha]);
      if (added.status !== 0) {
        return fail(
          "verified",
          "NotVerified",
          `Couldn't check out PR ${snap.number}: ${added.stderr.trim()}`,
        );
      }
      const install = installCommand(rootFiles);
      const installed = run(install.file, install.args, tree, TEST_TIMEOUT);
      if (installed.status !== 0) {
        return fail(
          "verified",
          "NotVerified",
          `Couldn't install PR ${snap.number}'s dependencies.`,
        );
      }
      if (playwright) {
        const cmd = playwrightCommand(pkg);
        const ran = run(cmd.file, cmd.args, tree, TEST_TIMEOUT);
        if (ran.status !== 0) {
          return fail(
            "playwright",
            "PlaywrightFailed",
            `Playwright tests failed on PR ${snap.number}.`,
          );
        }
        if (hasConsoleError(ran.stdout + ran.stderr)) {
          return fail(
            "playwright",
            "PlaywrightFailed",
            `Playwright tests logged a console error on PR ${snap.number}.`,
          );
        }
      }
      if (catalyst) {
        const ran = run(
          "npx",
          ["catalyst", "check", "--json"],
          tree,
          TEST_TIMEOUT,
        );
        const result = catalystCheckResult(ran.stdout, strict);
        if (!result.ok) {
          return fail(
            "catalyst-check",
            "CatalystCheckFailed",
            `catalyst check found ${result.errors} error${result.errors === 1 ? "" : "s"} and ${result.warnings} warning${result.warnings === 1 ? "" : "s"} on PR ${snap.number}.`,
          );
        }
      }
      return undefined;
    } finally {
      run("git", ["worktree", "remove", "--force", tree]);
      rmSync(dir, { recursive: true, force: true });
    }
  }

  protected getSuccessMessage(data: PRGatesResult): string {
    return data.pass
      ? "Merge policy gates pass"
      : `${data.message} (Code: ${data.code})`;
  }
}
