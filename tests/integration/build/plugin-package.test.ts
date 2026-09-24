/**
 * Integration tests for the AI plugin inside the built package (dist/).
 *
 * Requires `npm run build`; skipped when dist/ is absent (running a build here
 * would stomp on other tests that read from dist/ in parallel).
 */

import { execFileSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const ROOT = path.join(__dirname, "../../..");
const DIST = path.join(ROOT, "dist");
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const built = fs.existsSync(path.join(DIST, ".claude-plugin", "plugin.json"));
const describeBuilt = built ? describe : describe.skip;

function hasClaude(): boolean {
  return spawnSync("claude", ["--version"], { encoding: "utf8" }).status === 0;
}

function tmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "catalyst-plugin-pkg-"));
  fs.mkdirSync(path.join(dir, ".git"));
  return dir;
}

describeBuilt("built plugin package", () => {
  /**
   * @req FR:ai-plugin/manifest.@claude
   * @req FR:ai-plugin/manifest.@portable
   * @req FR:ai-plugin/manifest.version
   */
  it("ships both manifests at the package version", () => {
    for (const rel of [".claude-plugin/plugin.json", "agent-plugin/plugin.json"]) {
      const manifest = JSON.parse(fs.readFileSync(path.join(DIST, rel), "utf8"));
      expect(manifest).toMatchObject({ name: "catalyst", version: PACKAGE_JSON.version });
    }
  });

  /**
   * @req FR:ai-plugin/skills.generate.claude
   * @req FR:ai-plugin/skills.generate.portable
   */
  it("ships Claude and portable skills", () => {
    const claude = fs.readdirSync(path.join(DIST, "skills"));
    const portable = fs.readdirSync(path.join(DIST, "agent-plugin", "skills"));
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
   * @req FR:ai-plugin/bootstrap.@hook
   * @req FR:ai-plugin/bootstrap.scope
   */
  it("runs the hook script as a silent no-op outside Catalyst projects", () => {
    const project = tmpProject();
    try {
      const out = execFileSync("node", [path.join(DIST, "ai/plugin/bootstrap.js"), "--hook"], {
        encoding: "utf8",
        env: { ...process.env, CLAUDE_PROJECT_DIR: project },
      });
      expect(out).toBe("");
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
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

  /** @req FR:ai-plugin/manifest.@claude */
  (hasClaude() ? it : it.skip)("passes `claude plugin validate`", () => {
    const result = spawnSync("claude", ["plugin", "validate", DIST], { encoding: "utf8" });
    expect(result.stdout + result.stderr).toMatch(/Validation passed/);
    expect(result.status).toBe(0);
  });
});
