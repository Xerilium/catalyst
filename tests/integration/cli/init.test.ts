/**
 * Integration tests for `catalyst init`
 *
 * Exercises the full install pipeline end-to-end: discovery → generation →
 * legacy untracking → gitignore writes — against a temporary git repo.
 *
 * @req FR:cli-init/init.@command
 * @req FR:cli-init/init.@playbook
 * @req FR:cli-init/init.ai-commands
 * @req FR:cli-init/init.handoff
 * @req FR:cli-init/init.idempotent
 * @req FR:ai-provider/commands.@playbook
 * @req FR:ai-provider/commands.generate
 * @req FR:ai-provider/commands.transform
 * @req FR:ai-provider/commands.legacy
 * @req FR:ai-provider/commands.gitignore-folder
 * @req FR:ai-provider/commands.gitignore-flat-new
 * @req FR:ai-provider/commands.gitignore-flat-merge
 * @req FR:ai-provider/commands.idempotent
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

const ROOT_DIR = path.join(__dirname, "../../..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
// Use the built bin/ shim so the CLI loads from dist/cli/ (compiled JS),
// not src/cli/ (TS with @core/... path aliases that tsx can't resolve
// from a cwd outside the repo).
const CLI_PATH = path.join(DIST_DIR, "bin", "catalyst.js");

// Tests exercise the CLI from a separate cwd, which requires the package to
// be available at node_modules/@xerilium/catalyst (path-resolver maps
// `catalyst://` to that location). They also require a built dist/ because
// bin/catalyst.js's dev path loads TS via tsx with path aliases that don't
// resolve outside the repo root.
const distExists = fs.existsSync(DIST_DIR);
const conditionalDescribe = distExists ? describe : describe.skip;

function runInit(cwd: string): {
  stdout: string;
  stderr: string;
  exitCode: number;
} {
  try {
    const stdout = execSync(`node ${CLI_PATH} init`, {
      encoding: "utf-8",
      cwd,
      env: { ...process.env, NO_COLOR: "1" },
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (error: unknown) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout || "",
      stderr: e.stderr || "",
      exitCode: e.status || 1,
    };
  }
}

function setupTmpRepo(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "catalyst-init-"));
  // Initialize git so legacy untracking step has a repo to work against
  execSync("git init -q", { cwd: tmpDir });
  execSync('git config user.email "test@example.com"', { cwd: tmpDir });
  execSync('git config user.name "Test"', { cwd: tmpDir });
  // Symlink node_modules/@xerilium/catalyst → dist/ so `catalyst://` resolves
  // to the built package (matching real consumer install layout).
  fs.mkdirSync(path.join(tmpDir, "node_modules", "@xerilium"), {
    recursive: true,
  });
  fs.symlinkSync(
    DIST_DIR,
    path.join(tmpDir, "node_modules", "@xerilium", "catalyst"),
    "dir",
  );
  return tmpDir;
}

conditionalDescribe("catalyst init", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = setupTmpRepo();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("first run", () => {
    let result: ReturnType<typeof runInit>;

    beforeEach(() => {
      result = runInit(tmpDir);
    });

    it("exits successfully", () => {
      expect(result.exitCode).toBe(0);
    });

    it("writes Claude command files (folder-based provider)", () => {
      const claudeDir = path.join(tmpDir, ".claude", "commands", "catalyst");
      expect(fs.existsSync(claudeDir)).toBe(true);
      const files = fs.readdirSync(claudeDir).filter((f) => f.endsWith(".md"));
      expect(files.length).toBeGreaterThan(0);
    });

    it("writes Copilot prompt files (flat provider) with catalyst prefix", () => {
      const copilotDir = path.join(tmpDir, ".github", "prompts");
      expect(fs.existsSync(copilotDir)).toBe(true);
      const files = fs
        .readdirSync(copilotDir)
        .filter((f) => f.startsWith("catalyst.") && f.endsWith(".prompt.md"));
      expect(files.length).toBeGreaterThan(0);
    });

    it("writes Cursor command files (folder-based provider)", () => {
      const cursorDir = path.join(tmpDir, ".cursor", "commands", "catalyst");
      expect(fs.existsSync(cursorDir)).toBe(true);
      const files = fs.readdirSync(cursorDir).filter((f) => f.endsWith(".md"));
      expect(files.length).toBeGreaterThan(0);
    });

    it("writes folder-based provider .gitignore (Claude) with single * entry", () => {
      const gitignorePath = path.join(
        tmpDir,
        ".claude",
        "commands",
        "catalyst",
        ".gitignore",
      );
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const content = fs.readFileSync(gitignorePath, "utf8");
      expect(content).toMatch(/# Catalyst commands/i);
      expect(content).toContain("*");
    });

    it("creates flat provider .gitignore (Copilot) with catalyst pattern", () => {
      const gitignorePath = path.join(
        tmpDir,
        ".github",
        "prompts",
        ".gitignore",
      );
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const content = fs.readFileSync(gitignorePath, "utf8");
      expect(content).toMatch(/# Catalyst commands/i);
      expect(content).toContain("catalyst.*.prompt.md");
      expect(content).toContain(".gitignore"); // @req FR:ai-provider/commands.gitignore-flat-new
    });

    it("outputs handoff message pointing user at /catalyst:init", () => {
      expect(result.stdout).toContain("/catalyst:init");
    });
  });

  describe("idempotency", () => {
    it("produces identical output when run twice", () => {
      runInit(tmpDir);

      const snapshot1 = JSON.stringify(collectArtifacts(tmpDir));
      const result2 = runInit(tmpDir);
      const snapshot2 = JSON.stringify(collectArtifacts(tmpDir));

      expect(result2.exitCode).toBe(0);
      expect(snapshot2).toEqual(snapshot1);
    });

    it("does not duplicate catalyst pattern in flat .gitignore on re-run", () => {
      runInit(tmpDir);
      runInit(tmpDir);

      const gitignorePath = path.join(
        tmpDir,
        ".github",
        "prompts",
        ".gitignore",
      );
      const content = fs.readFileSync(gitignorePath, "utf8");
      const matches = content.match(/catalyst\.\*\.prompt\.md/g);
      expect(matches).toHaveLength(1);
    });
  });

  describe("flat provider gitignore merge", () => {
    it("preserves existing entries when merging into a user .gitignore", () => {
      // Pre-create a .gitignore with user content
      const promptsDir = path.join(tmpDir, ".github", "prompts");
      fs.mkdirSync(promptsDir, { recursive: true });
      const gitignorePath = path.join(promptsDir, ".gitignore");
      fs.writeFileSync(gitignorePath, "user-secret.txt\n*.bak\n");

      runInit(tmpDir);

      const content = fs.readFileSync(gitignorePath, "utf8");
      expect(content).toContain("user-secret.txt");
      expect(content).toContain("*.bak");
      expect(content).toContain("catalyst.*.prompt.md");
    });
  });

  describe("legacy untracking", () => {
    it("untracks previously-committed catalyst command files", () => {
      // Pre-commit a fake catalyst file to simulate a legacy install
      const claudeDir = path.join(tmpDir, ".claude", "commands", "catalyst");
      fs.mkdirSync(claudeDir, { recursive: true });
      const legacyFile = path.join(claudeDir, "old-command.md");
      fs.writeFileSync(legacyFile, "# legacy");
      execSync("git add .claude/commands/catalyst/old-command.md", {
        cwd: tmpDir,
      });
      execSync('git commit -q -m "legacy"', { cwd: tmpDir });

      // Sanity: file is tracked
      const tracked = execSync("git ls-files .claude/commands/catalyst/", {
        cwd: tmpDir,
        encoding: "utf8",
      });
      expect(tracked).toContain("old-command.md");

      // Run init — should untrack
      runInit(tmpDir);

      const trackedAfter = execSync("git ls-files .claude/commands/catalyst/", {
        cwd: tmpDir,
        encoding: "utf8",
      });
      expect(trackedAfter).toBe(""); // No tracked files in the catalyst dir
      // But file still on disk (was overwritten by install)
      expect(fs.existsSync(legacyFile)).toBe(true);
    });
  });
});

/**
 * Collect filesystem artifacts under provider command paths for idempotency
 * snapshot comparison. Returns sorted lists of files and gitignore contents.
 */
function collectArtifacts(root: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const providerPath of [
    ".claude/commands/catalyst",
    ".github/prompts",
    ".cursor/commands/catalyst",
  ]) {
    const dir = path.join(root, providerPath);
    if (fs.existsSync(dir)) {
      result[providerPath] = {
        files: fs.readdirSync(dir).sort(),
        gitignore: fs.existsSync(path.join(dir, ".gitignore"))
          ? fs.readFileSync(path.join(dir, ".gitignore"), "utf8")
          : null,
      };
    }
  }
  return result;
}
