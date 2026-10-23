/**
 * Tests for the build script and CI workflow: the stages the build runs, and
 * the gates CI enforces. Reads the files rather than running a build, since
 * other tests already build and inspect dist/.
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const ROOT = path.join(__dirname, "../../..");
const BUILD = fs.readFileSync(path.join(ROOT, "scripts/build.ts"), "utf8");
const CI_TEXT = fs.readFileSync(path.join(ROOT, ".github/workflows/ci.yml"), "utf8");
const VALIDATE_TEXT = fs.readFileSync(path.join(ROOT, ".github/workflows/validate-release.yml"), "utf8");
const GITIGNORE = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8").split("\n");
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const CI = yaml.load(CI_TEXT) as {
  on: Record<string, unknown>;
  concurrency?: { "cancel-in-progress"?: boolean };
  jobs: Record<string, { steps: { name?: string; run?: string; "continue-on-error"?: boolean }[] }>;
};

const at = (needle: string): number => BUILD.indexOf(needle);

describe("build script", () => {
  /** @req FR:devops-build/build.@script */
  it("runs as npm run build", () => {
    expect(PACKAGE_JSON.scripts.build).toBe("tsx scripts/build.ts");
  });

  /** @req FR:devops-build/build.clean */
  it("removes the previous output before building", () => {
    expect(at("rm -rf")).toBeGreaterThan(-1);
    expect(at("rm -rf")).toBeLessThan(at("tsx scripts/generate-provider-registry.ts"));
  });

  /** @req FR:devops-build/build.generate */
  it("generates registries, the catalog, and the schema, and validates action conventions", () => {
    for (const script of [
      "generate-provider-registry",
      "generate-action-registry",
      "generate-loader-catalog",
      "validate-action-conventions",
      "generate-playbook-schema",
    ]) {
      expect(BUILD).toContain(`scripts/${script}.ts`);
    }
    expect(at("generate-action-registry")).toBeLessThan(at("tsc"));
  });

  /** @req FR:devops-build/build.compile */
  it("compiles TypeScript, then resolves path aliases", () => {
    expect(at("/tsc'")).toBeGreaterThan(-1);
    expect(at("tsc-alias")).toBeGreaterThan(at("/tsc'"));
  });

  /** @req FR:devops-build/build.layout */
  it("places resources, launchers, and package metadata at the root of dist", () => {
    expect(BUILD).toMatch(/cp -r launchers dist\//);
    for (const file of ["package.json", "README.md", "LICENSE"]) {
      expect(BUILD).toContain(`cp ${file} dist/`);
    }
    expect(BUILD).toMatch(/dist\/resources/);
  });

  /** @req FR:devops-build/build.plugin */
  it("adds the plugin payloads before packing", () => {
    expect(at("scripts/generate-plugin.ts")).toBeGreaterThan(-1);
    expect(at("scripts/generate-plugin.ts")).toBeLessThan(at("npm pack"));
  });

  /** @req FR:devops-build/build.pack */
  it("packs dist into dist/catalyst-latest.tgz", () => {
    expect(BUILD).toMatch(/cd dist && npm pack/);
    expect(BUILD).toContain("dist/catalyst-latest.tgz");
  });

  /** @req FR:devops-build/build.local-install */
  it("installs locally, runs init, self-hosts, and injects feedback unless told to skip", () => {
    const install = at("if (!skipInstall)");
    expect(install).toBeGreaterThan(-1);
    for (const step of ["npm install --no-save", "launchers/catalyst.js init", "--self-host", "inject-feedback"]) {
      expect(at(step)).toBeGreaterThan(install);
    }
  });

  /** @req FR:devops-build/build.skip-install */
  it("honors --skip-install", () => {
    expect(BUILD).toMatch(/process\.argv\.includes\('--skip-install'\)/);
  });

  /** @req FR:devops-build/build.no-committed-output */
  it("keeps generated output out of version control", () => {
    expect(GITIGNORE).toContain("dist");
  });

  /** @req AC:devops-build/one-build */
  it("is the only build path CI and release use", () => {
    expect(CI_TEXT).toMatch(/npm run build -- --skip-install/);
    expect(fs.readFileSync(path.join(ROOT, ".github/workflows/release.yml"), "utf8")).toMatch(/npm run build/);
  });
});

describe("CI workflow", () => {
  /** @req FR:devops-build/ci.@workflow */
  it("lives at .github/workflows/ci.yml", () => {
    expect(fs.existsSync(path.join(ROOT, ".github/workflows/ci.yml"))).toBe(true);
  });

  /** @req FR:devops-build/ci.trigger */
  it("runs on pull requests to main and on pushes to main", () => {
    expect(CI.on).toHaveProperty("pull_request");
    expect(CI.on).toHaveProperty("push");
  });

  /** @req FR:devops-build/ci.verify */
  it("builds and type-checks", () => {
    const runs = CI.jobs.verify.steps.map((s) => s.run ?? "").join("\n");
    expect(runs).toMatch(/npm run build/);
    expect(runs).toMatch(/npm run type-check/);
  });

  /** @req FR:devops-build/ci.test */
  it("installs the fresh build, runs the suite, and fails on new failures", () => {
    const runs = CI.jobs.test.steps.map((s) => s.run ?? "");
    const install = runs.findIndex((r) => /file:\.\/dist\/catalyst-latest\.tgz/.test(r));
    const jest = runs.findIndex((r) => /npx jest/.test(r));
    const baseline = runs.findIndex((r) => /check-test-baseline/.test(r));
    expect(install).toBeGreaterThanOrEqual(0);
    expect(jest).toBeGreaterThan(install);
    expect(baseline).toBeGreaterThan(jest);
    expect(CI.jobs.test.steps[baseline]["continue-on-error"]).toBeUndefined();
  });

  /** @req FR:devops-build/ci.lint */
  it("reports lint without blocking", () => {
    const eslint = CI.jobs.lint.steps.find((s) => /npm run lint/.test(s.run ?? ""));
    expect(eslint?.["continue-on-error"]).toBe(true);
  });

  /** @req FR:devops-build/ci.concurrency */
  it("cancels superseded runs", () => {
    expect(CI.concurrency?.["cancel-in-progress"]).toBe(true);
  });

  /** @req FR:devops-build/ci.pack-gate */
  it("runs the pack gate on pull requests that touch what ships", () => {
    const v = yaml.load(VALIDATE_TEXT) as { on: { pull_request: { paths: string[] } } };
    const paths = v.on.pull_request.paths;
    for (const p of ["package.json", "launchers/**", "src/**", "scripts/**"]) {
      expect(paths).toContain(p);
    }
  });
});
