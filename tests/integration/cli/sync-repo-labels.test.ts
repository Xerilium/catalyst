/**
 * Integration tests for the sync-repo-labels playbook
 *
 * Runs the built CLI against a temporary repo with a fake `gh` on PATH that
 * serves a label fixture and logs every create and rename.
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

const ROOT_DIR = path.join(__dirname, "../../..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const CLI_PATH = path.join(DIST_DIR, "launchers", "catalyst.js");
const conditionalDescribe = fs.existsSync(DIST_DIR) ? describe : describe.skip;

type Label = { name: string; usage: number };

function setup(
  labels: Label[],
  config?: object,
): { dir: string; log: string; env: NodeJS.ProcessEnv } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "catalyst-labels-"));
  execSync("git init -q", { cwd: dir });
  fs.mkdirSync(path.join(dir, "node_modules", "@xerilium"), {
    recursive: true,
  });
  fs.symlinkSync(
    DIST_DIR,
    path.join(dir, "node_modules", "@xerilium", "catalyst"),
    "dir",
  );
  if (config) {
    fs.mkdirSync(path.join(dir, ".xe/config"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".xe/config/catalyst.json"),
      JSON.stringify(config),
    );
  }
  const bin = path.join(dir, ".fake-bin");
  fs.mkdirSync(bin);
  const fixture = path.join(bin, "labels.json");
  const nodes = labels.map((l) => ({
    name: l.name,
    color: "ededed",
    description: null,
    issues: { totalCount: l.usage },
    pullRequests: { totalCount: 0 },
  }));
  fs.writeFileSync(
    fixture,
    JSON.stringify({
      data: {
        repository: {
          labels: { pageInfo: { hasNextPage: false, endCursor: null }, nodes },
        },
      },
    }),
  );
  const log = path.join(bin, "gh.log");
  fs.writeFileSync(
    path.join(bin, "gh"),
    [
      "#!/bin/bash",
      'case "$1 $2" in',
      '  "repo view") echo \'{"nameWithOwner":"acme/widgets"}\' ;;',
      `  "api graphql") cat "${fixture}" ;;`,
      '  "label create"|"label edit"|"label delete") printf "%s|" "$@" >> "$GH_LOG"; echo >> "$GH_LOG"; exit "${GH_FAIL:-0}" ;;',
      "  *) exit 1 ;;",
      "esac",
    ].join("\n"),
    { mode: 0o755 },
  );
  const env = {
    ...process.env,
    NO_COLOR: "1",
    GH_LOG: log,
    PATH: [bin, path.dirname(process.execPath), "/usr/bin", "/bin"].join(
      path.delimiter,
    ),
  };
  return { dir, log, env };
}

function run(
  dir: string,
  env: NodeJS.ProcessEnv,
  args = "",
): { stdout: string; exitCode: number } {
  try {
    // stdin is a pipe, so every checkpoint takes its default
    const stdout = execSync(`node ${CLI_PATH} run sync-repo-labels ${args}`, {
      cwd: dir,
      env,
      encoding: "utf-8",
    });
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const e = error as { stdout?: string; status?: number };
    return { stdout: e.stdout || "", exitCode: e.status || 1 };
  }
}

const calls = (log: string): string[][] =>
  fs.existsSync(log)
    ? fs
        .readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => l.replace(/\|$/, "").split("|"))
    : [];
const created = (log: string) =>
  calls(log)
    .filter((c) => c[1] === "create")
    .map((c) => c[2]);
const renamed = (log: string) =>
  calls(log)
    .filter((c) => c[1] === "edit")
    .map((c) => `${c[2]} → ${c[c.indexOf("--name") + 1]}`);
const deleted = (log: string) =>
  calls(log)
    .filter((c) => c[1] === "delete")
    .map((c) => c[2]);
const savedLabels = (dir: string) =>
  JSON.parse(
    fs.readFileSync(path.join(dir, ".xe/config/catalyst.json"), "utf8"),
  ).labels;

conditionalDescribe("sync-repo-labels", () => {
  const dirs: string[] = [];
  const make = (labels: Label[], config?: object) => {
    const s = setup(labels, config);
    dirs.push(s.dir);
    return s;
  };
  afterAll(() =>
    dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })),
  );

  /**
   * @req FR:repo-labels/sync.@playbook
   * @req FR:repo-labels/sync.catalog
   * @req FR:repo-labels/sync.create
   * @req FR:repo-labels/sync.discover.defaults
   * @req FR:repo-labels/sync.discover.none
   * @req FR:repo-labels/sync.rename.defaults
   * @req FR:repo-labels/catalog
   */
  it("uses Key: Value in a new repo and renames GitHub's unused defaults in place", () => {
    const { dir, log, env } = make([
      { name: "bug", usage: 0 },
      { name: "enhancement", usage: 0 },
      { name: "help wanted", usage: 0 },
      { name: "dependencies", usage: 4 },
    ]);
    const { exitCode, stdout } = run(dir, env);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("✅ Labels: 22 label change(s)");
    expect(renamed(log)).toEqual(["help wanted → Help wanted ✨"]);
    expect(created(log)).toEqual(
      expect.arrayContaining([
        "Status: 🚧 WIP",
        "Needs: Attention 👋",
        "Resolution: No activity",
      ]),
    );
    expect(created(log)).toHaveLength(21);
    expect(calls(log).flat()).not.toContain("dependencies");
    // GitHub issue types replace Type labels
    expect(calls(log).flat()).not.toContain("bug");
    expect(savedLabels(dir)).toEqual({ style: "key-value" });
  });

  /**
   * @req FR:repo-labels/sync.discover
   */
  it("follows simple labels that are actually in use", () => {
    const { dir, log, env } = make([
      { name: "bug", usage: 12 },
      { name: "wip", usage: 3 },
    ]);
    run(dir, env);
    expect(renamed(log)).toEqual([]);
    expect(created(log)).toEqual(
      expect.arrayContaining(["needs review", "help wanted", "no activity"]),
    );
    expect(savedLabels(dir).style).toBe("simple");
  });

  /** @req FR:repo-labels/sync.input */
  it("takes the style input over detection, without asking", () => {
    const { dir, log, env } = make([{ name: "Status: WIP 🚧", usage: 9 }]);
    run(dir, env, "-i style=simple");
    expect(renamed(log)).toContain("Status: WIP 🚧 → wip");
  });

  /**
   * @req FR:repo-labels/sync.rename
   * @req FR:repo-labels/sync.rename.emoji
   * @req FR:repo-labels/sync.rename.keep
   */
  it("offers to rename Key: Value labels that differ, with the emoji first only on Status labels", () => {
    const { dir, log, env } = make([
      { name: "Status: WIP 🚧", usage: 5 },
      { name: "Release: 🍒 Stretch", usage: 2 },
      { name: "Area: Docs", usage: 7 },
    ]);
    run(dir, env);
    expect(renamed(log)).toEqual([
      "Release: 🍒 Stretch → Release: Stretch 🍒",
      "Status: WIP 🚧 → Status: 🚧 WIP",
    ]);
    expect(calls(log).flat()).not.toContain("Area: Docs");
  });

  /**
   * @req FR:repo-labels/sync.delete
   * @req FR:repo-labels/sync.delete.used
   */
  it("deletes unused type labels and keeps used ones", () => {
    const { dir, log, env } = make([
      { name: "bug", usage: 0 },
      { name: "question", usage: 0 },
      { name: "enhancement", usage: 4 },
      { name: "Area: Docs", usage: 0 },
    ]);
    run(dir, env);
    expect(deleted(log)).toEqual(["bug", "question"]);
  });

  /**
   * @req FR:repo-labels/sync.config
   * @req FR:repo-labels/sync.config.override
   */
  it("keeps the repo's own names as custom names and honors saved overrides", () => {
    const { dir, log, env } = make(
      [{ name: "Status: Work in progress", usage: 5 }],
      {
        labels: { names: { paused: "Status: On ice 🧊" } },
      },
    );
    run(dir, env, "-i style=custom");
    expect(renamed(log)).toEqual([]);
    expect(created(log)).toContain("Status: On ice 🧊");
    expect(savedLabels(dir)).toEqual({
      style: "custom",
      names: { paused: "Status: On ice 🧊", wip: "Status: Work in progress" },
    });
  });

  /** @req FR:repo-labels/sync.fallback */
  it("reports labels it couldn't create and keeps going", () => {
    const { dir, env } = make([]);
    const { exitCode, stdout } = run(dir, { ...env, GH_FAIL: "1" });
    expect(exitCode).toBe(0);
    expect(stdout).toContain("couldn't set up Status: 🚧 WIP");
    expect(stdout).toContain("22 of 22 changes failed");
  });

  /** @req FR:repo-labels/sync.unavailable */
  it("skips with a notice when GitHub isn't reachable", () => {
    const { dir, env } = make([]);
    fs.writeFileSync(
      path.join(dir, ".fake-bin", "gh"),
      "#!/bin/bash\nexit 1\n",
      { mode: 0o755 },
    );
    const { exitCode, stdout } = run(dir, env);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Labels: skipped");
    expect(fs.existsSync(path.join(dir, ".xe/config/catalyst.json"))).toBe(
      false,
    );
  });

  /**
   * @req FR:repo-labels/catalog.name
   * @req FR:repo-labels/catalog.emoji
   * @req FR:repo-labels/catalog.emoji.status
   * @req FR:repo-labels/catalog.emoji.other
   * @req FR:repo-labels/catalog.emoji.resolution
   * @req FR:repo-labels/catalog.color
   * @req FR:repo-labels/catalog.color.urgent
   * @req FR:repo-labels/catalog.color.waiting
   * @req FR:repo-labels/catalog.color.welcome
   * @req FR:repo-labels/catalog.color.release
   * @req FR:repo-labels/catalog.color.state
   * @req FR:repo-labels/catalog.color.neutral
   * @req FR:repo-labels/catalog.external
   * @req FR:repo-labels/catalog.breaking-change
   * @req FR:repo-labels/catalog.good-first-issue
   * @req FR:repo-labels/catalog.help-wanted
   * @req FR:repo-labels/catalog.hotfix
   * @req FR:repo-labels/catalog.needs-attention
   * @req FR:repo-labels/catalog.needs-review
   * @req FR:repo-labels/catalog.needs-triage
   * @req FR:repo-labels/catalog.release-blocker
   * @req FR:repo-labels/catalog.release-priority
   * @req FR:repo-labels/catalog.release-stretch
   * @req FR:repo-labels/catalog.cant-repro
   * @req FR:repo-labels/catalog.duplicate
   * @req FR:repo-labels/catalog.external
   * @req FR:repo-labels/catalog.invalid
   * @req FR:repo-labels/catalog.no-activity
   * @req FR:repo-labels/catalog.wont-fix
   * @req FR:repo-labels/catalog.autopilot
   * @req FR:repo-labels/catalog.blocked
   * @req FR:repo-labels/catalog.finalized
   * @req FR:repo-labels/catalog.paused
   * @req FR:repo-labels/catalog.ready
   * @req FR:repo-labels/catalog.wip
   */
  it("creates exactly the catalog in the spec, with its colors, descriptions, and emoji placement", () => {
    const { dir, log, env } = make([]);
    expect(run(dir, env).exitCode).toBe(0);
    const specText = fs.readFileSync(
      path.join(ROOT_DIR, ".xe/features/repo-labels/spec.md"),
      "utf8",
    );
    const expected = [
      ...specText.matchAll(
        /Catalog MUST include `([^`]+)` \(simple name `([^`]+)`\), color `([0-9A-F]{6})`: (.+)/g,
      ),
    ].map((m) => ({ name: m[1], color: m[3], description: m[4] }));
    expect(expected).toHaveLength(22);
    const actual = calls(log)
      .filter((c) => c[1] === "create")
      .map((c) => ({
        name: c[2],
        color: c[c.indexOf("--color") + 1],
        description: c[c.indexOf("--description") + 1],
      }));
    expect(actual).toEqual(expect.arrayContaining(expected));
    expect(actual).toHaveLength(22);
    const emoji = /\p{Extended_Pictographic}/u;
    for (const { name } of actual) {
      if (name.startsWith("Status: ")) {
        expect(name).toMatch(/^Status: \p{Extended_Pictographic}/u);
      } else if (name.startsWith("Resolution: ")) {
        expect(name).not.toMatch(emoji);
      } else {
        expect(name).toMatch(/\p{Extended_Pictographic}\uFE0F?$/u);
      }
    }
  });
});
