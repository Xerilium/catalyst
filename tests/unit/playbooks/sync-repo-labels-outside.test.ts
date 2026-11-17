/**
 * Reviewing labels outside the standard, run through the real engine with a
 * scripted prompter and a fake `gh`
 */

import { execFileSync, execSync } from "child_process";
import * as fs from "fs";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";
import { Engine } from "../../../src/playbooks/engine/engine";
import { PlaybookProvider } from "../../../src/playbooks/registry/playbook-provider";
import { StatePersistence } from "../../../src/playbooks/persistence/state-persistence";
import type { CheckpointPrompter, CheckpointPromptConfig, CheckpointResponse } from "../../../src/playbooks/engine/checkpoint-prompter";

jest.mock("child_process", () => ({ ...jest.requireActual("child_process"), execSync: jest.fn(), execFileSync: jest.fn() }));
const ghFile = execFileSync as jest.MockedFunction<typeof execFileSync>;
const ghShell = execSync as jest.MockedFunction<typeof execSync>;

const ROOT = path.join(__dirname, "../../..");
const SYNC = path.join(ROOT, "src/resources/playbooks/sync-repo-labels.yaml");

let calls: string[];
let labels: { name: string; usage: number }[];
let failOn: string[];
/** What to pick for each label, by name: a key, or a key and typed text */
let picks: Record<string, [string, string?]>;
let asked: { message: string; keys: string[]; labels: string[] }[];
let said: string;

const prompter: CheckpointPrompter = {
  async prompt(config: CheckpointPromptConfig): Promise<CheckpointResponse> {
    asked.push({ message: config.message, keys: config.options.map((o) => o.key), labels: config.options.map((o) => o.label) });
    const [name] = config.message.split(" (");
    const pick = picks[name] ?? (config.message.startsWith("You have") ? ["review"] : [config.defaultKey ?? config.options[0].key]);
    const [key, text] = pick;
    return { selected: key, value: key, hasTextInput: !!text, textInput: text };
  },
};

let dir: string;
let cwd: string;

beforeEach(() => {
  PlaybookProvider.resetInstance();
  calls = [];
  failOn = [];
  asked = [];
  picks = {};
  ghShell.mockReset().mockImplementation(((command: string) => {
    if (command.includes("repo view")) return JSON.stringify({ nameWithOwner: "o/r" });
    return "{}";
  }) as any);
  ghFile.mockReset().mockImplementation(((_file: string, args: string[]) => {
    const a = args.join(" ");
    if (a.includes("labels(")) {
      return JSON.stringify({ data: { repository: { labels: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: labels.map((l) => ({ name: l.name, color: "000000", description: "", issues: { totalCount: l.usage }, pullRequests: { totalCount: 0 } })),
      } } } });
    }
    calls.push(a);
    if (failOn.some((n) => a.includes(`label delete ${n} `) || a.includes(`label edit ${n} `))) throw new Error("denied");
    return "";
  }) as any);
  dir = mkdtempSync(path.join(tmpdir(), "outside-"));
  fs.mkdirSync(path.join(dir, "node_modules/@xerilium/catalyst"), { recursive: true });
  fs.symlinkSync(path.join(ROOT, "src/resources/playbooks"), path.join(dir, "node_modules/@xerilium/catalyst/playbooks"));
  cwd = process.cwd();
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(cwd);
  rmSync(dir, { recursive: true, force: true });
});

async function sync(style: string | undefined = "simple") {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  try {
    const playbook = await PlaybookProvider.getInstance().loadPlaybook(SYNC);
    const result = await new Engine(undefined, new StatePersistence(path.join(dir, ".xe/runs")), undefined, undefined, prompter).run(playbook, style ? { style } : {});
    said = log.mock.calls.map((c) => String(c[0])).join("\n");
    if (result.status !== "completed") throw new Error(JSON.stringify(result.error ?? result));
  } finally {
    log.mockRestore();
  }
}
const deletes = () => calls.filter((c) => c.startsWith("label delete"));

describe("outside labels, reviewed one by one", () => {
  // @req FR:repo-labels/sync.outside.options.keep
  // @req FR:repo-labels/sync.outside.options.change
  // @req FR:repo-labels/sync.outside.options.change.typed
  // @req FR:repo-labels/sync.outside.options.delete
  it("keeps, renames to a typed name, and deletes as chosen", async () => {
    labels = [{ name: "ai-keep", usage: 1 }, { name: "ai-rename", usage: 1 }, { name: "ai-drop", usage: 2 }];
    picks = { "ai-rename": ["rename", "automation"], "ai-drop": ["delete"] };
    await sync();
    expect(deletes()).toEqual(["label delete ai-drop -R o/r --yes"]);
    expect(calls.filter((c) => c.includes("label edit ai-rename"))).toEqual(["label edit ai-rename -R o/r --name automation"]);
    expect(calls.join("\n")).not.toContain("ai-keep");
  });

  // @req FR:repo-labels/sync.outside.options.change.suggest
  it("offers the suggested simple name for a Key: Value label, and none for a simple one", async () => {
    labels = [{ name: "Epic: Big Idea 💡", usage: 1 }, { name: "ai-plain", usage: 0 }];
    picks = { "Epic: Big Idea 💡": ["suggest"] };
    await sync();
    const epic = asked.find((q) => q.message.startsWith("Epic"))!;
    expect(epic.keys).toEqual(["keep", "suggest", "rename", "delete"]);
    expect(epic.labels).toContain("Change to big idea");
    expect(asked.find((q) => q.message.startsWith("ai-plain"))!.keys).toEqual(["keep", "rename", "delete"]);
    expect(calls).toContain("label edit Epic: Big Idea 💡 -R o/r --name big idea");
  });

  // @req FR:repo-labels/sync.outside.options.change
  it("treats a change with no name typed as a keep", async () => {
    labels = [{ name: "ai-blank", usage: 1 }];
    picks = { "ai-blank": ["rename"] };
    await sync();
    expect(calls.join("\n")).not.toContain("ai-blank");
  });

  // @req FR:repo-labels/sync.outside
  it("words the question for one label and for several", async () => {
    labels = [{ name: "ai-one", usage: 1 }];
    await sync();
    expect(asked[asked.length - 2].message).toBe("You have 1 label outside the standard. Review it?");
    asked = [];
    labels = [{ name: "ai-one", usage: 1 }, { name: "ai-two", usage: 1 }];
    await sync();
    expect(asked.find((q) => q.message.startsWith("You have"))!.message).toBe("You have 2 labels outside the standard. Review them?");
  });

  // @req FR:repo-labels/sync.outside.report
  it("applies every choice without retrying, then reports what changed apart from what didn't", async () => {
    labels = [{ name: "ai-ok", usage: 1 }, { name: "ai-bad", usage: 1 }, { name: "ai-also", usage: 1 }];
    picks = { "ai-ok": ["delete"], "ai-bad": ["delete"], "ai-also": ["delete"] };
    failOn = ["ai-bad"];
    await sync();
    expect(deletes().filter((c) => c.includes("ai-bad"))).toHaveLength(1);
    expect(deletes().some((c) => c.includes("ai-also"))).toBe(true);
    expect(said).toMatch(/changed outside labels:\n {2}delete {2}ai-ok\n {2}delete {2}ai-also/);
    expect(said).toMatch(/couldn't change these outside labels[^\n]*:\n {2}ai-bad \(/);
  });

  // @req FR:repo-labels/sync.outside
  it("changes nothing when the user leaves them as-is", async () => {
    labels = [{ name: "ai-one", usage: 1 }];
    picks = { "ai-one": ["keep"] };
    const prompt = prompter.prompt;
    prompter.prompt = async (c) => (c.message.startsWith("You have") ? { selected: "leave", value: "leave", hasTextInput: false } : prompt(c));
    try {
      await sync();
    } finally {
      prompter.prompt = prompt;
    }
    expect(asked.some((q) => q.message.startsWith("ai-one"))).toBe(false);
    expect(calls.join("\n")).not.toContain("ai-one");
  });
});
