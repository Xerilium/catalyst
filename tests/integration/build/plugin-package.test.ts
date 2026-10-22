/**
 * Integration tests for the built package.
 *
 * `dist/` is the one npm package, `@xerilium/catalyst`: the CLI, the Claude
 * Code plugin, and the portable Agent Plugins payload. The package root is the
 * plugin root, so it must have no top-level `bin/` directory.
 *
 * Requires `npm run build`; skipped when the output is absent (running a build
 * here would stomp on other tests that read it in parallel).
 */

import { execFileSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const ROOT = path.join(__dirname, "../../..");
const DIST = path.join(ROOT, "dist");
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const built = fs.existsSync(path.join(DIST, ".claude-plugin", "plugin.json"));
const TARBALL = path.join(DIST, "catalyst-latest.tgz");
const describeBuilt = built ? describe : describe.skip;

function hasClaude(): boolean {
  return spawnSync("claude", ["--version"], { encoding: "utf8" }).status === 0;
}

function tmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "catalyst-plugin-pkg-"));
  fs.mkdirSync(path.join(dir, ".git"));
  return dir;
}

function packedEntries(): string[] {
  return execFileSync("tar", ["-tzf", TARBALL], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .map((entry) => entry.replace(/^package\//, ""))
    .filter((entry) => !entry.endsWith("/"));
}

describeBuilt("built package as a Claude Code plugin", () => {
  /**
   * @req FR:ai-plugin/plugin.publish
   * @req FR:ai-plugin/plugin.@ai-plugin
   * @req FR:ai-plugin/plugin.version
   */
  it("is a complete plugin at the package version", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(DIST, ".claude-plugin/plugin.json"), "utf8"));
    const pkg = JSON.parse(fs.readFileSync(path.join(DIST, "package.json"), "utf8"));
    expect(manifest).toMatchObject({ name: "catalyst", version: PACKAGE_JSON.version });
    expect(pkg).toMatchObject({ name: "@xerilium/catalyst", version: PACKAGE_JSON.version });
    expect(fs.readdirSync(path.join(DIST, "skills"))).toContain("create");
  });

  /**
   * claude.ai, Cowork, and organization sync reject a plugin that has one:
   * `Plugin contains a top-level bin/ directory`. The `package.json` `bin`
   * field is fine; the directory is not.
   *
   * @req FR:ai-plugin/plugin.no-bin
   */
  it("has no top-level bin/ and points its bin field at launchers/", () => {
    expect(fs.existsSync(path.join(DIST, "bin"))).toBe(false);
    const pkg = JSON.parse(fs.readFileSync(path.join(DIST, "package.json"), "utf8"));
    for (const target of Object.values(pkg.bin as Record<string, string>)) {
      expect(target.startsWith("./launchers/")).toBe(true);
      expect(fs.existsSync(path.join(DIST, target))).toBe(true);
    }
  });

  /**
   * `files` governs the tarball, not dist/, so assert the packed artifact — a
   * dropped entry leaves dist/ intact and still ships a broken package.
   *
   * @req FR:ai-plugin/plugin.publish
   * @req FR:ai-plugin/plugin.no-bin
   */
  (fs.existsSync(TARBALL) ? it : it.skip)("packs the CLI, the Claude plugin, and the portable payload", () => {
    const entries = packedEntries();
    const skills = fs.readdirSync(path.join(DIST, "skills"));

    expect(skills.length).toBeGreaterThan(0);
    for (const name of skills) {
      expect(entries).toContain(`skills/${name}/SKILL.md`);
      expect(entries).toContain(`agent-plugin/skills/catalyst-${name}/SKILL.md`);
    }
    for (const rel of [
      ".claude-plugin/plugin.json",
      "agent-plugin/plugin.json",
      "scripts/bootstrap.js",
      "ai/plugin/bootstrap.js",
      "launchers/catalyst.js",
      "launchers/catalyst-bootstrap.js",
    ]) {
      expect(entries).toContain(rel);
    }
    expect(entries.some((e) => e.startsWith("bin/"))).toBe(false);
    expect(entries).not.toContain("hooks/hooks.json");
  });

  /** @req AC:ai-plugin/no-standing-cost */
  it("ships no hooks", () => {
    expect(fs.existsSync(path.join(DIST, "hooks"))).toBe(false);
  });

  /**
   * @req FR:ai-plugin/bootstrap.@cli
   * @req FR:ai-plugin/bootstrap.installed
   */
  it("runs its bootstrap as a silent no-op when the package is installed", () => {
    const project = tmpProject();
    try {
      const installed = path.join(project, "node_modules", "@xerilium", "catalyst");
      fs.mkdirSync(installed, { recursive: true });
      fs.writeFileSync(path.join(installed, "package.json"), JSON.stringify({ version: "99.0.0" }));
      const out = execFileSync("node", [path.join(DIST, "scripts/bootstrap.js")], {
        encoding: "utf8",
        env: { ...process.env, CLAUDE_PROJECT_DIR: project },
      });
      expect(out).toBe("");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  /**
   * The plugin manifest is where the minimum lives, so the check works from
   * the plugin cache with no package installed in the project yet.
   *
   * @req FR:ai-plugin/bootstrap.min-version
   * @req FR:ai-plugin/plugin.min-version
   */
  it("fails loudly when the installed package is older than the manifest requires", () => {
    const project = tmpProject();
    try {
      fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ name: "app" }));
      const installed = path.join(project, "node_modules", "@xerilium", "catalyst");
      fs.mkdirSync(installed, { recursive: true });
      fs.writeFileSync(path.join(installed, "package.json"), JSON.stringify({ version: "0.0.1" }));
      const result = spawnSync("node", [path.join(DIST, "scripts/bootstrap.js")], {
        encoding: "utf8",
        env: { ...process.env, CLAUDE_PROJECT_DIR: project },
      });
      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain("0.0.1");
      expect(result.stdout).toContain("@xerilium/catalyst@^");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  /** @req FR:ai-plugin/plugin.@ai-plugin */
  (hasClaude() ? it : it.skip)("passes `claude plugin validate`", () => {
    const result = spawnSync("claude", ["plugin", "validate", DIST], { encoding: "utf8" });
    expect(result.stdout + result.stderr).toMatch(/Validation passed/);
    expect(result.status).toBe(0);
  });
});

describeBuilt("built package as a portable plugin", () => {
  /** @req FR:ai-plugin/plugin.@ai-plugin */
  it("ships the portable manifest at the package version", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(DIST, "agent-plugin/plugin.json"), "utf8"));
    expect(manifest).toMatchObject({ name: "catalyst", version: PACKAGE_JSON.version });
  });

  /** @req FR:ai-plugin/skills.generate */
  it("ships one portable skill per Claude skill", () => {
    const claude = fs.readdirSync(path.join(DIST, "skills")).sort();
    const portable = fs.readdirSync(path.join(DIST, "agent-plugin", "skills")).sort();
    expect(claude).toContain("create");
    expect(portable).toEqual(claude.map((n) => `catalyst-${n}`).sort());
  });

  /** @req FR:ai-plugin/skills.generate */
  it("does not ship the retired command templates or configs", () => {
    for (const rel of ["ai-config", "ai-providers", "resources/ai-plugin"]) {
      expect(fs.existsSync(path.join(DIST, rel))).toBe(false);
    }
  });

  /**
   * @req FR:ai-plugin/bootstrap.@cli
   * @req FR:ai-plugin/bootstrap.installed
   */
  it("runs the catalyst-bootstrap launcher as a silent no-op when installed", () => {
    const project = tmpProject();
    try {
      const installed = path.join(project, "node_modules", "@xerilium", "catalyst");
      fs.mkdirSync(installed, { recursive: true });
      fs.writeFileSync(path.join(installed, "package.json"), "{}");
      const out = execFileSync("node", [path.join(DIST, "launchers", "catalyst-bootstrap.js")], {
        cwd: project,
        encoding: "utf8",
        env: { ...process.env, CLAUDE_PROJECT_DIR: "" },
      });
      expect(out).toBe("");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });
});
