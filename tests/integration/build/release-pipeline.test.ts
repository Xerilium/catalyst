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
    expect(job.secrets).toBe("inherit");
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
