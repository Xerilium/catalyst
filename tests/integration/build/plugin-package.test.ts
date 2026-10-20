/**
 * Integration tests for the two built plugin payloads.
 *
 * The committed `plugin/` payload is what the marketplace serves; `dist/` and
 * the npm tarball carry the portable payload and the CLI. These are checked
 * separately because their constraints conflict: the plugin must have no
 * top-level `bin/`, and the tarball must keep one.
 *
 * The dist/ assertions require `npm run build` and are skipped when dist/ is
 * absent (running a build here would stomp on other tests that read dist/ in
 * parallel).
 */

import { execFileSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const ROOT = path.join(__dirname, "../../..");
const DIST = path.join(ROOT, "dist");
const PLUGIN = path.join(ROOT, "plugin");
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const built = fs.existsSync(path.join(DIST, "agent-plugin", "plugin.json"));
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

describe("committed plugin payload", () => {
  /**
   * @req FR:ai-plugin/plugin.committed
   * @req FR:ai-plugin/plugin.@ai-plugin
   * @req FR:ai-plugin/plugin.version
   */
  it("is a complete plugin at the package version", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN, ".claude-plugin/plugin.json"), "utf8"));
    expect(manifest).toMatchObject({ name: "catalyst", version: PACKAGE_JSON.version });
    expect(fs.readdirSync(path.join(PLUGIN, "skills"))).toContain("create");
  });

  /**
   * claude.ai, Cowork, and organization sync reject a plugin that has one:
   * `Plugin contains a top-level bin/ directory`.
   *
   * @req AC:ai-plugin/no-bin
   */
  it("has no top-level bin/ and keeps its executable in scripts/", () => {
    expect(fs.existsSync(path.join(PLUGIN, "bin"))).toBe(false);
    expect(fs.existsSync(path.join(PLUGIN, "scripts/bootstrap.js"))).toBe(true);
  });

  /** @req AC:ai-plugin/no-standing-cost */
  it("ships no hooks", () => {
    expect(fs.existsSync(path.join(PLUGIN, "hooks"))).toBe(false);
  });

  /**
   * The payload must be self-contained: the marketplace fetches only this
   * subdirectory, so the bootstrap cannot reach outside it.
   *
   * @req FR:ai-plugin/bootstrap.@cli
   * @req FR:ai-plugin/bootstrap.installed
   */
  it("runs its bootstrap as a silent no-op when the package is installed", () => {
    const project = tmpProject();
    try {
      const installed = path.join(project, "node_modules", "@xerilium", "catalyst");
      fs.mkdirSync(installed, { recursive: true });
      fs.writeFileSync(path.join(installed, "package.json"), JSON.stringify({ version: "99.0.0" }));
      const out = execFileSync("node", [path.join(PLUGIN, "scripts/bootstrap.js")], {
        encoding: "utf8",
        env: { ...process.env, CLAUDE_PROJECT_DIR: project },
      });
      expect(out).toBe("");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });

  /**
   * The payload's own manifest is where the minimum lives, so the check works
   * from the plugin cache with no package installed yet.
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
      const result = spawnSync("node", [path.join(PLUGIN, "scripts/bootstrap.js")], {
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
    const result = spawnSync("claude", ["plugin", "validate", PLUGIN], { encoding: "utf8" });
    expect(result.stdout + result.stderr).toMatch(/Validation passed/);
    expect(result.status).toBe(0);
  });
});

describeBuilt("built npm package", () => {
  /** @req FR:ai-plugin/plugin.@ai-plugin */
  it("ships the portable manifest at the package version", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(DIST, "agent-plugin/plugin.json"), "utf8"));
    expect(manifest).toMatchObject({ name: "catalyst", version: PACKAGE_JSON.version });
  });

  /** @req FR:ai-plugin/skills.generate */
  it("ships one portable skill per committed Claude skill", () => {
    const claude = fs.readdirSync(path.join(PLUGIN, "skills")).sort();
    const portable = fs.readdirSync(path.join(DIST, "agent-plugin", "skills")).sort();
    expect(claude).toContain("create");
    expect(portable).toEqual(claude.map((n) => `catalyst-${n}`).sort());
  });

  /** @req AC:ai-plugin/single-source */
  it("does not ship the retired command templates or configs", () => {
    for (const rel of ["ai-config", "ai-providers", "resources/ai-plugin"]) {
      expect(fs.existsSync(path.join(DIST, rel))).toBe(false);
    }
  });

  /**
   * `files` governs the tarball, not dist/, so assert the packed artifact — a
   * dropped entry leaves dist/ intact and still ships a broken package.
   *
   * @req FR:ai-plugin/plugin.publish
   * @req AC:ai-plugin/separate-payloads
   */
  (fs.existsSync(TARBALL) ? it : it.skip)("packs the portable payload and the CLI, but not the Claude plugin", () => {
    const entries = execFileSync("tar", ["-tzf", TARBALL], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .map((entry) => entry.replace(/^package\//, ""));
    const skills = fs.readdirSync(path.join(PLUGIN, "skills"));

    expect(skills.length).toBeGreaterThan(0);
    expect(entries).toContain("agent-plugin/plugin.json");
    expect(entries).toContain("bin/catalyst.js");
    expect(entries).toContain("ai/plugin/bootstrap.js");
    for (const name of skills) {
      expect(entries).toContain(`agent-plugin/skills/catalyst-${name}/SKILL.md`);
    }
    // The Claude plugin layout at the tarball root is what coupled plugin
    // installs to npm publishes.
    for (const rel of [".claude-plugin/plugin.json", "hooks/hooks.json"]) {
      expect(entries).not.toContain(rel);
    }
    expect(entries.some((e) => e.startsWith("skills/"))).toBe(false);
  });

  /**
   * @req FR:ai-plugin/bootstrap.@cli
   * @req FR:ai-plugin/bootstrap.installed
   */
  it("runs the catalyst-bootstrap binary as a silent no-op when installed", () => {
    const project = tmpProject();
    try {
      const installed = path.join(project, "node_modules", "@xerilium", "catalyst");
      fs.mkdirSync(installed, { recursive: true });
      fs.writeFileSync(path.join(installed, "package.json"), "{}");
      const out = execFileSync("node", [path.join(DIST, "bin", "catalyst-bootstrap.js")], {
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
