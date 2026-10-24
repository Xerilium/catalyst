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
const VALIDATE_PATH = "./.github/workflows/validate-release.yml";
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
    // Either the validated tarball or dist/, both the one @xerilium/catalyst package
    expect(text).not.toMatch(/catalyst-plugin/);
    const publishes = text.match(/npm publish [^\n]*/g) ?? [];
    expect(publishes.length).toBeGreaterThan(0);
    for (const p of publishes) {
      expect(p).toMatch(/^npm publish ("\$TARBALL" )?--access public$/);
    }
  });
});

describe("validated artifact", () => {
  const release = load("release.yml");
  const publish = load("publish.yml");
  const validate = load("validate-release.yml");
  const releaseText = fs.readFileSync(path.join(WORKFLOWS, "release.yml"), "utf8");
  const publishText = fs.readFileSync(path.join(WORKFLOWS, "publish.yml"), "utf8");
  const validateText = fs.readFileSync(path.join(WORKFLOWS, "validate-release.yml"), "utf8");
  const BUILD_JOB = "build";

  /** @req FR:devops-release/artifact.build */
  it("builds the tarball once, with the release version stamped, and uploads it", () => {
    const build = release.jobs?.[BUILD_JOB];
    expect(build).toBeDefined();
    expect(needsOf(build!)).toContain("plan");
    const steps = build!.steps ?? [];
    const stamp = steps.findIndex((s) => /npm version/.test(s.run ?? ""));
    const pack = steps.findIndex((s) => /npm run build/.test(s.run ?? ""));
    const upload = steps.findIndex((s) => (s.uses ?? "").startsWith("actions/upload-artifact"));
    expect(stamp).toBeGreaterThanOrEqual(0);
    expect(pack).toBeGreaterThan(stamp);
    expect(upload).toBeGreaterThan(pack);
  });

  /** @req FR:devops-release/artifact.validate */
  it("validates the uploaded tarball instead of building its own", () => {
    const [name, job] = Object.entries(release.jobs ?? {}).find(
      ([, j]) => j.uses === "./.github/workflows/validate-release.yml" && !j.with?.smoke,
    )!;
    expect(name).toBeDefined();
    expect(needsOf(job)).toContain(BUILD_JOB);
    expect(job.with?.artifact).toBeTruthy();
    expect(validate.on).toHaveProperty("workflow_call");
    expect(validateText).toMatch(/download-artifact/);
    expect(validateText).toMatch(/--tarball/);
  });

  /** @req FR:devops-release/artifact.gate */
  it("creates the tag and release only after validation", () => {
    const creator = release.jobs?.[CREATE_JOB];
    const [validateName] = Object.entries(release.jobs ?? {}).find(
      ([, j]) => j.uses === "./.github/workflows/validate-release.yml" && !j.with?.smoke,
    )!;
    expect(needsOf(creator!)).toContain(validateName);
  });

  /** @req FR:devops-release/artifact.publish */
  it("publishes the validated tarball without rebuilding it", () => {
    const [, caller] = jobsUsing(release, PUBLISH_PATH)[0];
    expect(caller.with?.artifact).toBeTruthy();
    expect(needsOf(caller)).toContain(BUILD_JOB);
    expect(publish.on).toHaveProperty("workflow_call");
    expect(publishText).toMatch(/download-artifact/);
    expect(publishText).toMatch(/npm publish "?\$\{?TARBALL|npm publish \.\/|npm publish .*\.tgz/);
  });

  /** @req FR:devops-release/artifact.fallback */
  it("still rebuilds from the tag when run by hand with no artifact", () => {
    expect(publishText).toMatch(/inputs\.artifact/);
    expect(publishText).toMatch(/npm run build/);
  });

  /** @req FR:devops-release/release.order */
  it("chains every stage after the one before it", () => {
    const jobs = release.jobs ?? {};
    expect(needsOf(jobs.plan)).toContain("preflight");
    expect(needsOf(jobs[BUILD_JOB])).toContain("plan");
    const [validateName, validateJob] = Object.entries(jobs).find(
      ([, j]) => j.uses === "./.github/workflows/validate-release.yml" && !j.with?.smoke,
    )!;
    expect(needsOf(validateJob)).toContain(BUILD_JOB);
    expect(needsOf(jobs[CREATE_JOB])).toContain(validateName);
    const [publishName, publishJob] = jobsUsing(release, PUBLISH_PATH)[0];
    expect(needsOf(publishJob)).toContain(CREATE_JOB);
    const smoke = Object.values(jobs).find((j) => j.with?.smoke);
    expect(needsOf(smoke!)).toContain(publishName);
  });

  /** @req FR:devops-release/release.version */
  it("normalizes short versions and computes the next dev version", () => {
    expect(releaseText).toMatch(/\^\[0-9\]\+\\\.\[0-9\]\+\$/);
    expect(releaseText).toMatch(/NEXT_PATCH/);
    expect(releaseText).toMatch(/TAG_VERSION/);
  });

  /** @req FR:devops-release/release.dry-run */
  it("stops after validation on a dry run", () => {
    const creator = release.jobs?.[CREATE_JOB] as Job & { if?: string };
    expect(creator.if).toMatch(/dry_run/);
  });

  /** @req FR:devops-release/release.secrets */
  it("never fails preflight on missing secrets; skips the e2e with a warning and summary", () => {
    const steps = release.jobs?.preflight?.steps ?? [];
    const check = steps.find((s) => /ANTHROPIC_API_KEY/.test(s.run ?? "")) as Step | undefined;
    expect(check).toBeDefined();
    expect(check!.run).not.toMatch(/exit 1/);
    expect(check!.run).toMatch(/::warning::/);
    expect(check!.run).toMatch(/GITHUB_STEP_SUMMARY/);
  });

  /** @req FR:devops-release/release.full-e2e */
  it("runs the skills e2e only when both secrets are present and not a dry run", () => {
    const inputs = (release.on as { workflow_dispatch: { inputs: Record<string, unknown> } }).workflow_dispatch.inputs;
    expect(inputs).not.toHaveProperty("full_e2e");
    const validate = jobsUsing(release, VALIDATE_PATH)[0][1] as Job & { with?: Record<string, unknown> };
    expect(String(validate.with?.full)).toMatch(/preflight\.outputs\.full/);
    expect(needsOf(validate)).toContain("preflight");
  });

  /** @req FR:devops-release/tag.create */
  it("commits the release version, tags it, and creates the GitHub release", () => {
    const runs = (release.jobs?.[CREATE_JOB]?.steps ?? []).map((s) => s.run ?? "").join("\n");
    expect(runs).toMatch(/git commit -m "Release v/);
    expect(runs).toMatch(/git tag v/);
    expect(runs).toMatch(/gh release create/);
  });

  /** @req FR:devops-release/tag.rerun */
  it("reuses an existing tag and GitHub release", () => {
    expect(releaseText).toMatch(/git ls-remote --exit-code --tags origin/);
    expect(releaseText).toMatch(/gh release view/);
  });

  /** @req FR:devops-release/tag.bump */
  it("bumps to the next dev version unless main is already past the release", () => {
    expect(releaseText).toMatch(/Main is already past/);
    expect(releaseText).toMatch(/Bump version to/);
  });

  /** @req FR:devops-release/npm.oidc */
  it("publishes with trusted publishing and no stored npm token", () => {
    expect(publishText).toMatch(/id-token: write/);
    expect(publishText).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN:/);
  });

  /** @req FR:devops-release/npm.idempotent */
  it("skips publishing when the version is already on npm", () => {
    expect(publishText).toMatch(/already on npm; skipping publish/);
  });

  /** @req FR:devops-release/npm.verify */
  it("retries the npm verify and fails when the version never appears", () => {
    expect(publishText).toMatch(/seq 1 20/);
    expect(publishText).toMatch(/is not on npm after publishing/);
  });

  /** @req FR:devops-release/npm.smoke */
  it("installs the published version from npm and runs catalyst check", () => {
    expect(validateText).toMatch(/npx --no-install catalyst check/);
    const smoke = Object.values(release.jobs ?? {}).find((j) => j.with?.smoke);
    expect(smoke).toBeDefined();
  });

  /** @req FR:devops-release/listing.after-npm */
  it("updates the listing only after the npm publish", () => {
    const [publishName] = jobsUsing(release, PUBLISH_PATH)[0];
    const marketplace = Object.values(release.jobs ?? {}).find((j) =>
      (j.steps ?? []).some((s) => (s.run ?? "").includes("--marketplace")),
    );
    expect(needsOf(marketplace!)).toContain(publishName);
  });

  /** @req FR:devops-release/listing.skip */
  it("warns and skips the listing update when its token is missing", () => {
    expect(releaseText).toMatch(/AI_PLUGINS_TOKEN is not set; skipping/);
  });

  /** @req FR:devops-release/release.input */
  it("takes an optional version and a dry-run flag", () => {
    const inputs = (release.on as { workflow_dispatch: { inputs: Record<string, unknown> } }).workflow_dispatch.inputs;
    expect(inputs).toHaveProperty("version");
    expect(inputs).toHaveProperty("dry_run");
  });

  /** @req FR:devops-release/release.@workflow */
  it("is dispatched manually", () => {
    expect(release.on).toHaveProperty("workflow_dispatch");
  });

  /** @req AC:devops-release/no-token */
  it("has no npm token anywhere in the pipeline", () => {
    for (const text of [releaseText, publishText, validateText]) {
      expect(text).not.toMatch(/secrets\.NPM_TOKEN/);
    }
  });
});
