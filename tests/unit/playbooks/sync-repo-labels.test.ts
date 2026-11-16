/**
 * Structure tests for the sync-repo-labels playbook: what it asks, and when
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

type Step = Record<string, any>;

const playbook = yaml.load(
  fs.readFileSync(
    path.join(
      __dirname,
      "../../../src/resources/playbooks/sync-repo-labels.yaml",
    ),
    "utf8",
  ),
) as { steps: Step[] };

/** Top-level index of the step whose subtree contains a step named `name`. */
const indexOf = (name: string): number =>
  playbook.steps.findIndex((s) =>
    JSON.stringify(s).includes(`"name":"${name}"`),
  );
const checkpoint = (name: string): Step =>
  JSON.parse(JSON.stringify(playbook.steps[indexOf(name)])).then.find(
    (s: Step) => s.name === name,
  ).checkpoint;

describe("sync-repo-labels playbook", () => {
  // @req FR:repo-labels/sync.style
  // @req FR:repo-labels/sync.style
  // @req FR:repo-labels/sync.style.current
  // @req FR:repo-labels/sync.style.default
  // @req FR:repo-labels/sync.style.details
  it("asks one question that shows the current state, with details", () => {
    const pick = checkpoint("pick-style");
    expect(pick.message).toContain("{{analysis.currentStyle}}");
    expect(pick.context).toBe("{{analysis.details}}");
    expect(pick.options).toBe("${{ get('analysis').options }}");
    expect(pick.default).toBe("{{analysis.detected}}");
    expect(playbook.steps[indexOf("pick-style")].if).toBe("{{asked}}");
  });

  // @req FR:repo-labels/sync.confirm
  it("asks to confirm only when the user did not just choose the changes", () => {
    const confirm = indexOf("confirm");
    const apply = playbook.steps.findIndex((s) =>
      JSON.stringify(s).includes("github-label-create"),
    );
    expect(confirm).toBeGreaterThan(-1);
    expect(confirm).toBeLessThan(apply);
    expect(playbook.steps[apply].if).toBe("{{apply}}");
    expect(JSON.stringify(playbook.steps[confirm].if)).toContain("asked");
    expect(checkpoint("confirm").context).toBe("{{chosen.summary}}");
  });

  // @req FR:repo-labels/sync.style.options.keep
  it("has no separate question for differing names", () => {
    expect(indexOf("pick-names")).toBe(-1);
  });

  // @req FR:repo-labels/sync.outside
  it("asks whether to review outside labels one by one or leave them, with 1 vs. 2+ wording", () => {
    const pick = checkpoint("pick-extras");
    expect(pick.options.map((o: Step) => o.key)).toEqual(["review", "leave"]);
    expect(pick.options.some((o: Step) => "description" in o)).toBe(false);
    expect(pick.default).toBe("leave");
    const text = JSON.stringify(playbook.steps[indexOf("pick-extras")]);
    expect(text).toContain("label' : ' labels'");
  });

  // @req FR:repo-labels/sync.outside.options
  // @req FR:repo-labels/sync.outside.options.keep
  // @req FR:repo-labels/sync.outside.options.change
  // @req FR:repo-labels/sync.outside.options.change.typed
  // @req FR:repo-labels/sync.outside.options.delete
  it("lets the user keep, change to a typed name, or delete each outside label", () => {
    const text = JSON.stringify(playbook.steps[indexOf("pick-extras")]);
    for (const key of ["keep", "suggest", "rename", "delete"]) {
      expect(text).toContain(`"key":"${key}"`);
    }
    expect(text).toContain("github-label-delete");
    expect(text).toContain("github-label-edit");
    expect(text).toContain('"allowText":true');
  });

  // @req FR:repo-labels/sync.outside.report
  it("applies every choice without retrying, then reports done and failed apart", () => {
    const text = JSON.stringify(playbook.steps[indexOf("pick-extras")]);
    expect(text).toContain("changed outside labels");
    expect(text).toContain("couldn't change these outside labels");
    expect(text).not.toContain("retry");
  });

  // @req FR:repo-labels/sync.portable
  it("runs without a bash shell", () => {
    expect(JSON.stringify(playbook)).not.toMatch(/"bash"/);
  });

  // @req FR:repo-labels/sync.delete
  it("deletes labels with the native delete action", () => {
    expect(JSON.stringify(playbook)).toContain("github-label-delete");
  });
});

describe("sync-repo-labels analysis", () => {
  const vm = require("vm") as typeof import("vm");
  const code = playbook.steps.find((s) => s.name === "analysis")!
    .script as string;
  const analyze = async (
    labels: { name: string; usage: number }[],
    saved: unknown = undefined,
    supportsColor = false,
  ) => {
    const vars: Record<string, unknown> = {
      available: true,
      labels,
    };
    const fsStub = {
      readFileSync: () => {
        if (saved) return JSON.stringify(saved);
        throw new Error("no config");
      },
    };
    const context = vm.createContext({
      get: (k: string) => vars[k],
      fs: fsStub,
      supportsColor,
      path,
      __dirname: "/repo",
    });
    return vm.runInContext(`(async () => { ${code} })()`, context);
  };

  // @req FR:repo-labels/sync.delete
  // @req FR:repo-labels/sync.delete.used
  it("plans to delete only unused type labels", async () => {
    const result = await analyze([
      { name: "bug", usage: 0 },
      { name: "question", usage: 0 },
      { name: "enhancement", usage: 3 },
      { name: "dependencies", usage: 0 },
    ]);
    const deletes = result.plans["key-value"].standard.ops
      .filter((o: { delete?: boolean }) => o.delete)
      .map((o: { name: string }) => o.name);
    expect(deletes).toEqual(["bug", "question"]);
    expect(result.plans["key-value"].standard.summary).toContain(
      "x bug (unused type label)",
    );
  });

  // @req FR:repo-labels/sync.summary
  // @req FR:repo-labels/sync.summary.color
  it("lists changes with symbols, colored only when supported", async () => {
    const labels = [
      { name: "Status: WIP 🚧", usage: 2 },
      { name: "bug", usage: 0 },
    ];
    const plain = (await analyze(labels)).plans["key-value"].standard.summary;
    expect(plain).toContain("  ~ Status: WIP 🚧 -> Status: 🚧 WIP");
    expect(plain).toContain("  + Help wanted ✨");
    expect(plain).toContain("  x bug (unused type label)");
    expect(plain).not.toContain("\x1b");
    const color = (await analyze(labels, undefined, true)).plans["key-value"].standard
      .summary;
    expect(color).toContain("\x1b[32m+\x1b[0m");
    expect(color).toContain("\x1b[33m~\x1b[0m");
    expect(color).toContain("\x1b[31mx\x1b[0m");
  });

  // @req FR:repo-labels/sync.style.options
  // @req FR:repo-labels/sync.style.options.keep
  it("offers keep-my-names only when names differ, and shows what each choice does", async () => {
    const differing = await analyze([{ name: "Status: WIP 🚧", usage: 4 }]);
    expect(differing.options.map((o: Step) => o.key)).toEqual([
      "key-value",
      "keep",
      "simple",
      "skip",
    ]);
    expect(differing.currentStyle).toBe("Key: Value");
    expect(differing.details).toContain("~ Status: WIP");
    const same = await analyze([{ name: "Status: 🚧 WIP", usage: 4 }]);
    expect(same.options.map((o: Step) => o.key)).toEqual([
      "key-value",
      "simple",
      "skip",
    ]);
  });

  // @req FR:repo-labels/sync.style.options
  it("keeps every option on one row, with no examples in the descriptions", async () => {
    const result = await analyze([{ name: "Status: WIP 🚧", usage: 4 }, { name: "bug", usage: 0 }]);
    for (const o of result.options) expect(o.description.length).toBeLessThanOrEqual(30);
  });

  // @req FR:repo-labels/sync.style.details
  it("shows at most three examples of each kind of change, then how many more", async () => {
    const result = await analyze([{ name: "x", usage: 0 }]);
    const lines = result.details.split("\n\n")[1].split("\n");
    const adds = lines.filter((l: string) => /^ {2}\+ /.test(l));
    expect(adds).toHaveLength(3);
    expect(result.details).toMatch(/\.\.\. \d+ more to add/);
    expect(result.details).toContain("Key: Value looks like Status: ✅ Ready");
  });

  // @req FR:repo-labels/sync.style.options.skip
  // @req FR:repo-labels/sync.config.declined
  it("keeps the style the repository uses most when the user skips", async () => {
    const result = await analyze([
      { name: "wip", usage: 9 },
      { name: "Status: 🚧 WIP", usage: 1 },
    ]);
    expect(result.detected).toBe("simple");
    expect(result.plans.simple.standard.declinedConfig.labels.names.wip).toBe("wip");
    // The playbook picks that plan on skip
    expect(JSON.stringify(playbook.steps[indexOf("pick-style")])).toContain("'skip' ? get('analysis').detected");
  });

  // @req FR:repo-labels/sync.config.declined
  it("keeps the repo's existing names when the user declines the changes", async () => {
    const result = await analyze([
      { name: "Status: WIP 🚧", usage: 4 },
      { name: "help wanted", usage: 0 },
    ]);
    expect(result.plans["key-value"].standard.declinedConfig.labels).toEqual({
      style: "custom",
      names: { wip: "Status: WIP 🚧", "help-wanted": "help wanted" },
    });
  });

  // @req FR:repo-labels/sync.outside
  // @req FR:repo-labels/sync.outside.exceptions
  it("reports labels outside the catalog, except dependencies and unused type labels", async () => {
    const result = await analyze([
      { name: "ai-automation", usage: 2 },
      { name: "claude-action", usage: 0 },
      { name: "Status: ✅ Ready", usage: 1 },
      { name: "help wanted", usage: 0 },
      { name: "bug", usage: 0 },
      { name: "enhancement", usage: 3 },
      { name: "dependencies", usage: 5 },
    ]);
    expect(result.extras.map((e: { name: string }) => e.name)).toEqual([
      "ai-automation",
      "claude-action",
      "enhancement",
    ]);
    expect(result.extrasSummary).toContain("ai-automation (2 in use)");
  });

  // @req FR:repo-labels/sync.outside.exceptions
  it("doesn't report a custom name saved in labels.names", async () => {
    const result = await analyze([{ name: "PTAL", usage: 2 }, { name: "other", usage: 1 }], {
      labels: { style: "custom", names: { "needs-review": "PTAL" } },
    });
    expect(result.extras.map((e: { name: string }) => e.name)).toEqual(["other"]);
  });

  // @req FR:repo-labels/sync.outside.options.change.suggest
  it("suggests the simple twin of a Key: Value label, and nothing for a simple one", async () => {
    const result = await analyze([
      { name: "Epic: Big Idea 💡", usage: 1 },
      { name: "ai-automation", usage: 2 },
    ]);
    const [kv, simple] = result.extras;
    expect(kv.suggest).toEqual({ simple: "big idea", "key-value": "" });
    expect(simple.suggest).toEqual({ simple: "", "key-value": "" });
  });

  // @req FR:repo-labels/sync.outside
  it("reports no outside labels when all are standard", async () => {
    const result = await analyze([{ name: "wip", usage: 1 }]);
    expect(result.extras).toEqual([]);
  });
});
