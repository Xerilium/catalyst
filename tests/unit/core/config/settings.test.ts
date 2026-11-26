/**
 * Tests for the typed Catalyst config object.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CatalystError } from "../../../../src/core/errors";
import {
  CONFIG_PATH,
  Config,
  createConfig,
  loadConfig,
} from "../../../../src/core/config";

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return e instanceof CatalystError ? e.code : "not-catalyst-error";
  }
  return undefined;
};

describe("config file", () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "config-settings-"));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  const write = (text: string) => {
    fs.mkdirSync(path.join(root, ".xe", "config"), { recursive: true });
    fs.writeFileSync(path.join(root, CONFIG_PATH), text);
  };

  // @req FR:config-settings/config.@json
  // @req FR:config-settings/config.@api
  // @req FR:config-settings/config.input
  // @req FR:config-settings/config.output
  it("loads .xe/config/catalyst.json at the project root into the config object", async () => {
    expect(CONFIG_PATH).toBe(".xe/config/catalyst.json");
    write('{ "check": { "rules": { "spec.actor": "error" } } }');
    expect((await loadConfig(root)).check.rules).toEqual({
      "spec.actor": "error",
    });
  });

  // @req FR:config-settings/config.@json
  it("reads a dotted path from nested objects", () => {
    expect(
      createConfig('{ "pull-requests": { "merge": { "never": ["a/b"] } } }')[
        "pull-requests"
      ].merge.never,
    ).toEqual(["a/b"]);
  });

  // @req FR:config-settings/config.missing
  it("treats a missing or blank file as no settings", async () => {
    expect((await loadConfig(root)).labels.style).toBe("");
    write("  \n");
    expect((await loadConfig(root)).labels.style).toBe("");
    expect(createConfig(undefined).check.rules).toEqual({});
    expect(createConfig("").check.rules).toEqual({});
  });

  it("surfaces read errors other than a missing file", async () => {
    fs.mkdirSync(path.join(root, CONFIG_PATH), { recursive: true });
    await expect(loadConfig(root)).rejects.toBeDefined();
  });

  // @req FR:config-settings/config.invalid
  it("fails with ConfigInvalid when the text is not a JSON object", async () => {
    expect(codeOf(() => createConfig("{ nope"))).toBe("ConfigInvalid");
    expect(codeOf(() => createConfig("[1, 2]"))).toBe("ConfigInvalid");
    expect(codeOf(() => createConfig('"text"'))).toBe("ConfigInvalid");
    expect(codeOf(() => createConfig("null"))).toBe("ConfigInvalid");
    write("{ nope");
    await expect(loadConfig(root)).rejects.toMatchObject({
      code: "ConfigInvalid",
    });
  });
});

describe("startup config", () => {
  let cwd: string;
  let root: string;
  beforeEach(() => {
    cwd = process.cwd();
    root = fs.mkdtempSync(path.join(os.tmpdir(), "config-startup-"));
  });
  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(root, { recursive: true, force: true });
  });

  // @req FR:config-settings/config.startup
  it("loads the working directory config once, on first use", () => {
    jest.isolateModules(() => {
      fs.mkdirSync(path.join(root, ".xe", "config"), { recursive: true });
      fs.writeFileSync(
        path.join(root, CONFIG_PATH),
        '{ "labels": { "style": "simple" } }',
      );
      process.chdir(root);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh =
        require("../../../../src/core/config") as typeof import("../../../../src/core/config");
      expect(fresh.Config.labels.style).toBe("simple");
      fs.writeFileSync(
        path.join(root, CONFIG_PATH),
        '{ "labels": { "style": "custom" } }',
      );
      expect(fresh.Config.labels.style).toBe("simple");
    });
  });

  // @req FR:config-settings/config.startup.env
  it("reads Config.env without loading the config file", () => {
    jest.isolateModules(() => {
      fs.mkdirSync(path.join(root, ".xe", "config"), { recursive: true });
      fs.writeFileSync(path.join(root, CONFIG_PATH), "{ nope");
      process.chdir(root);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh =
        require("../../../../src/core/config") as typeof import("../../../../src/core/config");
      expect(fresh.Config.env.CATALYST_DIAGNOSTICS).toBe(false);
      expect(() => fresh.Config.labels).toThrow(
        expect.objectContaining({ code: "ConfigInvalid" }),
      );
    });
  });
});

describe("environment properties", () => {
  // @req FR:config-settings/config.@env
  it("reads CATALYST_* environment variables", () => {
    expect(
      createConfig("", { CATALYST_ACP_COMMAND: "gemini --experimental-acp" })
        .env.CATALYST_ACP_COMMAND,
    ).toBe("gemini --experimental-acp");
  });

  // @req FR:config-settings/config.env
  it("reads the process environment at access time", () => {
    const before = process.env.CATALYST_CHECKS_TOKEN;
    try {
      delete process.env.CATALYST_CHECKS_TOKEN;
      expect(Config.env.CATALYST_CHECKS_TOKEN).toBe("");
      process.env.CATALYST_CHECKS_TOKEN = "tok";
      expect(Config.env.CATALYST_CHECKS_TOKEN).toBe("tok");
    } finally {
      if (before === undefined) {
        delete process.env.CATALYST_CHECKS_TOKEN;
      } else {
        process.env.CATALYST_CHECKS_TOKEN = before;
      }
    }
  });

  // @req FR:config-settings/config.env.boolean
  it("reads 1 or true as true", () => {
    expect(
      createConfig("", { CATALYST_DIAGNOSTICS: "1" }).env.CATALYST_DIAGNOSTICS,
    ).toBe(true);
    expect(
      createConfig("", { CATALYST_DIAGNOSTICS: "true" }).env
        .CATALYST_DIAGNOSTICS,
    ).toBe(true);
  });

  // @req FR:config-settings/config.env.boolean.other
  it("reads any other value as false", () => {
    expect(
      createConfig("", { CATALYST_DIAGNOSTICS: "yes" }).env
        .CATALYST_DIAGNOSTICS,
    ).toBe(false);
    expect(
      createConfig("", { CATALYST_DIAGNOSTICS: "0" }).env.CATALYST_DIAGNOSTICS,
    ).toBe(false);
  });

  // @req FR:config-settings/config.env.empty
  it("treats an empty variable as not set", () => {
    expect(
      createConfig("", { CATALYST_ACP_COMMAND: "" }).env.CATALYST_ACP_COMMAND,
    ).toBe("");
    expect(
      createConfig("", { CATALYST_DIAGNOSTICS: "" }).env.CATALYST_DIAGNOSTICS,
    ).toBe(false);
  });

  // @req FR:config-settings/$config.env
  it("never reads environment properties from the file", () => {
    expect(
      createConfig('{ "env": { "CATALYST_ACP_COMMAND": "x" } }', {}).env
        .CATALYST_ACP_COMMAND,
    ).toBe("");
  });
});

describe("values and defaults", () => {
  // @req FR:config-settings/config.value
  it("holds a set value whose type matches", () => {
    const config = createConfig(
      JSON.stringify({
        labels: { style: "simple" },
        "pull-requests": {
          merge: { "strict-check": true, "approval-waiver-days": { "a/*": 3 } },
        },
        traceability: { paths: { code: ["lib/"] }, gitignore: false },
      }),
    );
    expect(config.labels.style).toBe("simple");
    expect(config["pull-requests"].merge["strict-check"]).toBe(true);
    expect(config["pull-requests"].merge["approval-waiver-days"]).toEqual({
      "a/*": 3,
    });
    expect(config.traceability.paths.code).toEqual(["lib/"]);
    expect(config.traceability.gitignore).toBe(false);
  });

  // @req FR:config-settings/config.value.strings
  it("keeps only the string items of a string[] value", () => {
    expect(
      createConfig(
        '{ "pull-requests": { "merge": { "never": [1, "a/b", null] } } }',
      )["pull-requests"].merge.never,
    ).toEqual(["a/b"]);
  });

  // @req FR:config-settings/config.value.inner
  it("checks only the top-level type of an object value", () => {
    expect(
      createConfig('{ "check": { "rules": { "spec.actor": 42 } } }').check
        .rules,
    ).toEqual({ "spec.actor": 42 });
  });

  // @req FR:config-settings/config.default
  it("holds the default when a property is not set", () => {
    const config = createConfig('{ "traceability": { "paths": null } }');
    expect(config["pull-requests"].merge["strict-check"]).toBe(false);
    expect(config.traceability.gitignore).toBe(true);
    expect(config.traceability.paths.code).toEqual(["src/"]);
  });

  // @req FR:config-settings/config.default.mismatch
  it("holds the default when the set value has a different type", () => {
    const config = createConfig(
      JSON.stringify({
        "pull-requests": { merge: { "strict-check": "true", never: "a/b" } },
        check: { rules: ["x"] },
        labels: { style: 2 },
      }),
    );
    expect(config["pull-requests"].merge["strict-check"]).toBe(false);
    expect(config["pull-requests"].merge.never).toEqual([]);
    expect(config.check.rules).toEqual({});
    expect(config.labels.style).toBe("");
  });

  // @req FR:config-settings/config.default.copy
  it("gives each config object its own copy of array and object defaults", () => {
    const a = createConfig("");
    a.traceability.paths.code.push("x/");
    a.check.rules.x = "error";
    const b = createConfig("");
    expect(b.traceability.paths.code).toEqual(["src/"]);
    expect(b.check.rules).toEqual({});
  });
});

describe("config object definition", () => {
  const defaults = createConfig("", {});

  // @req FR:config-settings/$config
  it("defines exactly the supported properties", () => {
    const paths = (node: unknown, prefix = ""): string[] =>
      Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
        typeof v === "object" &&
        v !== null &&
        !Array.isArray(v) &&
        ![
          "rules",
          "names",
          "approval-waiver-days",
          "default",
          "features",
          "thresholds",
        ].includes(k)
          ? paths(v, `${prefix}${k}.`)
          : [`${prefix}${k}`],
      );
    expect(paths(defaults).sort()).toEqual(
      [
        "check.rules",
        "env.CATALYST_ACP_COMMAND",
        "env.CATALYST_CHECKS_TOKEN",
        "env.CATALYST_DIAGNOSTICS",
        "labels.names",
        "labels.style",
        "pull-requests.long-lived-branches",
        "pull-requests.merge.approval-waiver-days",
        "pull-requests.merge.checks",
        "pull-requests.merge.never",
        "pull-requests.merge.strict-check",
        "pull-requests.reconcile.skip-checks",
        "traceability.default",
        "traceability.featureDirs",
        "traceability.features",
        "traceability.gitignore",
        "traceability.paths.code",
        "traceability.paths.exclude",
        "traceability.paths.test",
        "traceability.thresholds",
      ].sort(),
    );
  });

  // @req FR:config-settings/$config.env
  it("covers every CATALYST_* variable that source code reads", () => {
    const src = path.join(__dirname, "../../../../src");
    const found = new Set<string>();
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          walk(p);
        } else if (p.endsWith(".ts") && !p.endsWith(".d.ts")) {
          for (const m of fs
            .readFileSync(p, "utf-8")
            .matchAll(/\b(CATALYST_[A-Z_]+)\b/g)) {
            found.add(m[1]);
          }
        }
      }
    };
    walk(src);
    // GitHub-only settings: the PR workflow reads them, so they sit outside the config object
    const githubOnly = ["CATALYST_TOKEN", "CATALYST_RUNS_ON"];
    for (const name of found) {
      if (!githubOnly.includes(name)) {
        expect(Object.keys(defaults.env)).toContain(name);
      }
    }
  });

  // @req FR:config-settings/github.token
  // @req FR:config-settings/github.runs-on
  it("leaves GitHub repository settings to the PR workflow", () => {
    const workflow = fs.readFileSync(
      path.join(
        __dirname,
        "../../../../src/resources/templates/workflows/catalyst-pr.yml",
      ),
      "utf-8",
    );
    expect(workflow).toContain("secrets.CATALYST_TOKEN");
    expect(workflow).toContain(`vars.CATALYST_RUNS_ON || '"ubuntu-latest"'`);
    expect(Object.keys(defaults.env)).not.toContain("CATALYST_TOKEN");
    expect(Object.keys(defaults.env)).not.toContain("CATALYST_RUNS_ON");
  });

  // @req FR:config-settings/$config.check
  // @req FR:config-settings/$config.check.rules
  it("$config.check.rules", () => expect(defaults.check.rules).toEqual({}));

  // @req FR:config-settings/$config.labels
  // @req FR:config-settings/$config.labels.style
  // @req FR:config-settings/$config.labels.names
  it("$config.labels", () => {
    expect(defaults.labels.style).toBe("");
    expect(defaults.labels.names).toEqual({});
  });

  // @req FR:config-settings/$config.pull-requests
  // @req FR:config-settings/$config.pull-requests.long-lived-branches
  // @req FR:config-settings/$config.pull-requests.reconcile.skip-checks
  // @req FR:config-settings/$config.pull-requests.merge
  // @req FR:config-settings/$config.pull-requests.merge.never
  // @req FR:config-settings/$config.pull-requests.merge.approval-waiver-days
  // @req FR:config-settings/$config.pull-requests.merge.strict-check
  // @req FR:config-settings/$config.pull-requests.merge.checks
  it("$config.pull-requests", () => {
    const pr = defaults["pull-requests"];
    expect(pr["long-lived-branches"]).toEqual([]);
    expect(pr.reconcile["skip-checks"]).toEqual([]);
    expect(pr.merge.never).toEqual([]);
    expect(pr.merge["approval-waiver-days"]).toEqual({});
    expect(pr.merge["strict-check"]).toBe(false);
    expect(pr.merge.checks).toBe("local");
  });

  // @req FR:config-settings/$config.traceability
  // @req FR:config-settings/$config.traceability.default
  // @req FR:config-settings/$config.traceability.features
  // @req FR:config-settings/$config.traceability.paths.code
  // @req FR:config-settings/$config.traceability.paths.test
  // @req FR:config-settings/$config.traceability.paths.exclude
  // @req FR:config-settings/$config.traceability.gitignore
  // @req FR:config-settings/$config.traceability.thresholds
  // @req FR:config-settings/$config.traceability.feature-dirs
  it("$config.traceability", () => {
    const t = defaults.traceability;
    expect(t.default).toEqual({});
    expect(t.features).toEqual({});
    expect(t.paths.code).toEqual(["src/"]);
    expect(t.paths.test).toEqual([
      "tests/",
      "__tests__/",
      "test/",
      "**/*.test.*",
      "**/*.spec.*",
    ]);
    expect(t.paths.exclude).toEqual([
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.git/**",
      "**/coverage/**",
    ]);
    expect(t.gitignore).toBe(true);
    expect(t.thresholds).toEqual({});
    expect(t.featureDirs).toEqual([".xe/features/", ".xe/initiatives/"]);
  });

  // @req FR:config-settings/$config.env.acp-command
  // @req FR:config-settings/$config.env.checks-token
  // @req FR:config-settings/$config.env.diagnostics
  it("$config.env", () => {
    expect(defaults.env.CATALYST_ACP_COMMAND).toBe("");
    expect(defaults.env.CATALYST_CHECKS_TOKEN).toBe("");
    expect(defaults.env.CATALYST_DIAGNOSTICS).toBe(false);
  });
});
