/**
 * Integration tests for the release → npm publish → marketplace chain.
 *
 * A release created with `GITHUB_TOKEN` never emits a `release` event, so the
 * publish workflow can't rely on that trigger alone — the release workflow has
 * to call it. These tests pin that chain and its ordering.
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const WORKFLOWS = path.join(__dirname, "../../../.github/workflows");
const PUBLISH_PATH = "./.github/workflows/publish.yml";

interface Step {
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
}

interface Job {
  needs?: string | string[];
  uses?: string;
  secrets?: string | Record<string, unknown>;
  with?: Record<string, unknown>;
  steps?: Step[];
}

interface Workflow {
  on?: Record<string, unknown>;
  jobs?: Record<string, Job>;
}

function load(file: string): Workflow {
  return yaml.load(fs.readFileSync(path.join(WORKFLOWS, file), "utf8")) as Workflow;
}

const CREATE_JOB = "create-release";

const needsOf = (job: Job): string[] => (Array.isArray(job.needs) ? job.needs : job.needs ? [job.needs] : []);

function jobsUsing(workflow: Workflow, target: string): [string, Job][] {
  return Object.entries(workflow.jobs ?? {}).filter(([, job]) => job.uses === target);
}

describe("release pipeline", () => {
  const release = load("release.yml");
  const publish = load("publish.yml");

  /** @req FR:ai-plugin/plugin.npm */
  it("exposes the publish workflow as a reusable workflow", () => {
    expect(publish.on).toHaveProperty("workflow_call");
  });

  /** @req FR:ai-plugin/plugin.npm */
  it("publishes the built package from dist", () => {
    const steps = Object.values(publish.jobs ?? {}).flatMap((job) => job.steps ?? []);
    const runs = steps.map((step) => step.run ?? "");
    const build = runs.findIndex((run) => run.includes("npm run build"));
    const pack = runs.findIndex((run) => /\bnpm publish\b/.test(run));

    expect(build).toBeGreaterThanOrEqual(0);
    expect(pack).toBeGreaterThan(build);
    expect(runs[pack]).toMatch(/\bdist\b/);
  });

  /**
   * The `release: [released]` trigger never fires for a `GITHUB_TOKEN`-created
   * release, so the release workflow must call the publish workflow directly.
   *
   * @req FR:ai-plugin/plugin.npm
   */
  it("calls the publish workflow from the release workflow", () => {
    const callers = jobsUsing(release, PUBLISH_PATH);
    expect(callers).toHaveLength(1);

    const [, job] = callers[0];
    expect(needsOf(job).length).toBeGreaterThan(0);
    // npm trusted publishing (OIDC): the caller grants id-token, no stored npm secret
    expect((job as { permissions?: Record<string, string> }).permissions?.["id-token"]).toBe("write");
  });

  /** @req FR:ai-plugin/plugin.marketplace */
  it("publishes the marketplace listing only after the npm publish", () => {
    const [publishJobName] = jobsUsing(release, PUBLISH_PATH)[0];
    const marketplace = Object.entries(release.jobs ?? {}).find(([, job]) =>
      (job.steps ?? []).some((step) => (step.run ?? "").includes("--marketplace")),
    );

    expect(marketplace).toBeDefined();
    expect(needsOf(marketplace![1])).toContain(publishJobName);
  });
});

describe("release gate ordering", () => {
  const release = load("release.yml");
  const validate = Object.entries(release.jobs ?? {}).find(
    ([, job]) => job.uses === "./.github/workflows/validate-release.yml" && !job.with?.smoke,
  );

  /** @req FR:e2e-gate/gate.local-build */
  it("validates the packed tarball before the tag and release are created", () => {
    expect(validate).toBeDefined();
    const [name] = validate!;
    const creator = release.jobs?.[CREATE_JOB];
    expect(creator).toBeDefined();
    expect(needsOf(creator!)).toContain(name);
    expect(needsOf(validate![1])).not.toContain(CREATE_JOB);
  });

  /** @req FR:e2e-gate/gate.local-build */
  it("skips tag, release, and publish on a dry run", () => {
    const creator = release.jobs?.[CREATE_JOB] as Job & { if?: string };
    expect(creator).toBeDefined();
    expect(creator.if).toMatch(/dry_run/);
    expect(needsOf(jobsUsing(release, PUBLISH_PATH)[0][1])).toContain(CREATE_JOB);
  });

  /** @req FR:e2e-gate/gate.local-build */
  it("publishes only after the tag and release exist", () => {
    expect(release.jobs?.[CREATE_JOB]).toBeDefined();
    expect(needsOf(jobsUsing(release, PUBLISH_PATH)[0][1])).toContain(CREATE_JOB);
  });
});

describe("release rerun safety", () => {
  const text = fs.readFileSync(path.join(WORKFLOWS, "release.yml"), "utf8");

  /** @req FR:ai-plugin/plugin.npm */
  it("reuses an existing tag instead of failing on a rerun", () => {
    expect(text).toMatch(/git ls-remote --exit-code --tags origin/);
    expect(text).toMatch(/exists != 'true'/);
  });

  /** @req FR:ai-plugin/plugin.npm */
  it("accepts a short version such as 0.3", () => {
    expect(text).toMatch(/\^\[0-9\]\+\\\.\[0-9\]\+\$/);
  });
});

describe("publish verification", () => {
  const text = fs.readFileSync(path.join(WORKFLOWS, "publish.yml"), "utf8");

  /** @req FR:ai-plugin/plugin.npm.verified */
  it("fails the run when the package is absent from npm after publishing", () => {
    expect(text).toMatch(/npm view "@xerilium\/catalyst@\$VERSION"/);
    expect(text).toMatch(/exit 1/);
  });

  /** @req FR:ai-plugin/plugin.npm */
  it("publishes exactly one package", () => {
    expect(text.match(/npm publish/g)).toHaveLength(1);
  });
});
