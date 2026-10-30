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
  it("asks for the style, offering both, defaulting to the detected one", () => {
    const style = checkpoint("pick-style");
    expect(style.options.map((o: Step) => o.key)).toEqual([
      "key-value",
      "simple",
    ]);
    expect(style.default).toBe("{{analysis.detected}}");
    expect(playbook.steps[indexOf("pick-style")].if).toBe("{{asked}}");
  });

  // @req FR:repo-labels/sync.confirm
  it("asks to confirm before changing any label", () => {
    const confirm = indexOf("confirm");
    const apply = playbook.steps.findIndex((s) =>
      JSON.stringify(s).includes("gh label create"),
    );
    expect(confirm).toBeGreaterThan(-1);
    expect(confirm).toBeLessThan(apply);
    expect(playbook.steps[apply].if).toBe("{{apply}}");
    expect(checkpoint("confirm").context).toBe("{{chosen.summary}}");
  });

  // @req FR:repo-labels/sync.rename.keep
  it("asks whether to keep differing Key: Value names", () => {
    expect(checkpoint("pick-names").options.map((o: Step) => o.key)).toEqual([
      "standard",
      "keep",
    ]);
  });

  // @req FR:repo-labels/sync.no-delete
  it("never deletes a label", () => {
    expect(JSON.stringify(playbook)).not.toMatch(/label delete/);
  });
});

describe("sync-repo-labels analysis", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vm = require("vm") as typeof import("vm");
  const code = playbook.steps.find((s) => s.name === "analysis")!
    .script as string;
  const analyze = async (labels: { name: string; usage: number }[]) => {
    const vars: Record<string, unknown> = {
      available: true,
      repo: { stdout: labels.map((l) => JSON.stringify(l)).join("\n") },
    };
    const fsStub = {
      readFileSync: () => {
        throw new Error("no config");
      },
    };
    const context = vm.createContext({
      get: (k: string) => vars[k],
      fs: fsStub,
      path,
      __dirname: "/repo",
    });
    return vm.runInContext(`(async () => { ${code} })()`, context);
  };

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
});
