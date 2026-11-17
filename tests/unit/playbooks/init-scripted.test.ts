/**
 * `catalyst init` with and without --platform, run through the real engine with
 * a prompter that records every question, so a removed guard shows up as a
 * question asked.
 */

import * as fs from "fs";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";
import { Engine } from "../../../src/playbooks/engine/engine";
import { PlaybookProvider } from "../../../src/playbooks/registry/playbook-provider";
import { StatePersistence } from "../../../src/playbooks/persistence/state-persistence";
import type { CheckpointPrompter, CheckpointPromptConfig, CheckpointResponse } from "../../../src/playbooks/engine/checkpoint-prompter";

const ROOT = path.resolve(__dirname, "../../..");
const INIT = path.join(ROOT, "src/resources/cli-commands/init.yaml");

class RecordingPrompter implements CheckpointPrompter {
  asked: string[] = [];
  async prompt(config: CheckpointPromptConfig): Promise<CheckpointResponse> {
    this.asked.push(config.message);
    // Always decline the setup so no test runs a real install
    const key = config.options.find((o) => o.key === "manual")?.key ?? config.defaultKey ?? config.options[0].key;
    return { selected: key, value: key, hasTextInput: false };
  }
}

let dir: string;
let cwd: string;
let savedPath: string | undefined;

beforeEach(() => {
  PlaybookProvider.resetInstance();
  dir = mkdtempSync(path.join(tmpdir(), "init-scripted-"));
  fs.mkdirSync(path.join(dir, "node_modules/@xerilium/catalyst"), { recursive: true });
  fs.symlinkSync(path.join(ROOT, "src/resources/playbooks"), path.join(dir, "node_modules/@xerilium/catalyst/playbooks"));
  fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
  cwd = process.cwd();
  savedPath = process.env.PATH;
  // No claude or gh on PATH, so nothing real runs
  process.env.PATH = [path.dirname(process.execPath), "/usr/bin", "/bin"].join(path.delimiter);
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(cwd);
  process.env.PATH = savedPath;
  rmSync(dir, { recursive: true, force: true });
});

async function init(inputs: Record<string, unknown>) {
  const prompter = new RecordingPrompter();
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  try {
    const playbook = await PlaybookProvider.getInstance().loadPlaybook(INIT);
    await new Engine(undefined, new StatePersistence(path.join(dir, ".xe/runs")), undefined, undefined, prompter).run(playbook, inputs);
    return { asked: prompter.asked, said: log.mock.calls.map((c) => String(c[0])).join("\n") };
  } finally {
    log.mockRestore();
  }
}

describe("init with and without --platform", () => {
  // @req FR:cli-init/init.platform.prompt
  // @req FR:cli-init/init.platform.mode
  it("asks which platforms and whether to set them up when --platform is missing", async () => {
    const { asked } = await init({});
    expect(asked).toEqual(["Which AI platforms would you like to set up?", "Should I set it up for you?"]);
  });

  // @req FR:cli-init/init.platform.parameter
  // @req FR:cli-init/init.platform.mode.scripted
  it("asks nothing when --platform is set", async () => {
    const { asked } = await init({ platform: "claude" });
    expect(asked).toEqual([]);
  });

  // @req FR:cli-init/init.platform.quiet
  it("says which platforms it detected only when --platform is missing", async () => {
    const asking = await init({});
    const scripted = await init({ platform: "claude" });
    expect(asking.said).toMatch(/Claude Code/);
    expect(scripted.said).not.toMatch(/Detected|Claude Code in this project/);
  });
});
