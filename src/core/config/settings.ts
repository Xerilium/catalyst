/**
 * The typed Catalyst config object: every setting Catalyst reads from
 * `.xe/config/catalyst.json` or a `CATALYST_*` environment variable.
 * @module core/config/settings
 */

import * as fs from "fs";
import * as path from "path";
import { CatalystError } from "../errors";

/** Repo config file, relative to the project root */
// @req FR:config-settings/config.@json
export const CONFIG_PATH = ".xe/config/catalyst.json";

type Obj = Record<string, unknown>;
type Kind = "string" | "boolean" | "string[]" | "object";

const LEAF = Symbol("setting");
interface Leaf<T> {
  [LEAF]: true;
  kind: Kind;
  default: T;
  description: string;
}

const str = (def: string, description: string): Leaf<string> => ({
  [LEAF]: true,
  kind: "string",
  default: def,
  description,
});
const bool = (def: boolean, description: string): Leaf<boolean> => ({
  [LEAF]: true,
  kind: "boolean",
  default: def,
  description,
});
const strs = (def: string[], description: string): Leaf<string[]> => ({
  [LEAF]: true,
  kind: "string[]",
  default: def,
  description,
});
const obj = (description: string): Leaf<Obj> => ({
  [LEAF]: true,
  kind: "object",
  default: {},
  description,
});

/**
 * File properties: the only code definition of their paths, types, and defaults.
 * @req FR:config-settings/$config
 */
const FILE = {
  // @req FR:config-settings/$config.check
  check: {
    // @req FR:config-settings/$config.check.rules
    rules: obj("Rule ID or {namespace}.* to error, warning, or disable"),
  },
  // @req FR:config-settings/$config.labels
  labels: {
    // @req FR:config-settings/$config.labels.style
    style: str(
      "",
      "Label naming style: key-value, simple, or custom; empty uses the standard names",
    ),
    // @req FR:config-settings/$config.labels.names
    names: obj("Label ID to the repository's label name"),
  },
  // @req FR:config-settings/$config.pull-requests
  "pull-requests": {
    // @req FR:config-settings/$config.pull-requests.long-lived-branches
    "long-lived-branches": strs(
      [],
      "Branches never deleted or retargeted; read from the base branch",
    ),
    reconcile: {
      // @req FR:config-settings/$config.pull-requests.reconcile.skip-checks
      "skip-checks": strs(
        [],
        "Check names reconcile ignores; read from the base branch",
      ),
    },
    // @req FR:config-settings/$config.pull-requests.merge
    merge: {
      // @req FR:config-settings/$config.pull-requests.merge.never
      never: strs(
        [],
        "owner/repo patterns Autopilot never merges; read from the base branch",
      ),
      // @req FR:config-settings/$config.pull-requests.merge.approval-waiver-days
      "approval-waiver-days": obj(
        "owner/repo pattern to days of inactivity that waive code-owner sign-off; read from the base branch",
      ),
      // @req FR:config-settings/$config.pull-requests.merge.strict-check
      "strict-check": bool(
        false,
        "Fail the Catalyst check gate on a warning; read from the base branch",
      ),
    },
  },
  // @req FR:config-settings/$config.traceability
  traceability: {
    // @req FR:config-settings/$config.traceability.default
    default: obj("Project code and test traceability modes"),
    // @req FR:config-settings/$config.traceability.features
    features: obj(
      "Feature ID or * pattern to code and test traceability modes",
    ),
    paths: {
      // @req FR:config-settings/$config.traceability.paths.code
      code: strs(["src/"], "Source paths to scan"),
      // @req FR:config-settings/$config.traceability.paths.test
      test: strs(
        ["tests/", "__tests__/", "test/", "**/*.test.*", "**/*.spec.*"],
        "Test paths to scan",
      ),
      // @req FR:config-settings/$config.traceability.paths.exclude
      exclude: strs(
        [
          "**/node_modules/**",
          "**/dist/**",
          "**/build/**",
          "**/.git/**",
          "**/coverage/**",
        ],
        "Paths to skip",
      ),
    },
    // @req FR:config-settings/$config.traceability.gitignore
    gitignore: bool(true, "Skip paths that .gitignore ignores"),
    // @req FR:config-settings/$config.traceability.thresholds
    thresholds: obj("Minimum implementation and test coverage, 0-100"),
    // @req FR:config-settings/$config.traceability.feature-dirs
    featureDirs: strs(
      [".xe/features/", ".xe/initiatives/"],
      "Folders that hold feature specs",
    ),
  },
};

/**
 * Environment properties, never read from the file.
 * @req FR:config-settings/$config.env
 */
const ENV = {
  // @req FR:config-settings/$config.env.acp-command
  CATALYST_ACP_COMMAND: str("", "Command that starts an ACP agent"),
  // @req FR:config-settings/$config.env.checks-token
  CATALYST_CHECKS_TOKEN: str("", "GitHub token for check runs"),
  // @req FR:config-settings/$config.env.diagnostics
  CATALYST_DIAGNOSTICS: bool(false, "Show framework logs"),
};

type Values<T> = {
  [K in keyof T]: T[K] extends Leaf<infer V> ? V : Values<T[K]>;
};

/** Environment part of the config object */
export type EnvConfig = {
  readonly [K in keyof typeof ENV]: (typeof ENV)[K] extends Leaf<infer V>
    ? V
    : never;
};

/** The config object */
// @req FR:config-settings/$config
export type CatalystConfig = Values<typeof FILE> & { readonly env: EnvConfig };

const isObject = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isLeaf = (v: unknown): v is Leaf<unknown> => isObject(v) && LEAF in v;

const invalid = (detail: string) =>
  new CatalystError(
    `${CONFIG_PATH} is not a JSON object: ${detail}`,
    "ConfigInvalid",
    `Fix ${CONFIG_PATH} so it holds one JSON object`,
  );

/**
 * Parse config text. Missing or blank text is an empty object.
 * @req FR:config-settings/config.missing
 * @req FR:config-settings/config.invalid
 */
function parse(text: string | undefined): Obj {
  if (!text?.trim()) {
    return {};
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw invalid((e as Error).message);
  }
  if (!isObject(json)) {
    throw invalid(
      `found ${Array.isArray(json) ? "an array" : json === null ? "null" : typeof json}`,
    );
  }
  return json;
}

const matches = (value: unknown, kind: Kind): boolean =>
  kind === "string[]"
    ? Array.isArray(value)
    : kind === "object"
      ? isObject(value)
      : typeof value === kind;

/**
 * One property value: the set value when its top-level type matches, else a copy of the default.
 * @req FR:config-settings/config.value
 * @req FR:config-settings/config.value.inner
 * @req FR:config-settings/config.default
 */
function valueOf(leaf: Leaf<unknown>, value: unknown): unknown {
  if (value !== undefined && matches(value, leaf.kind)) {
    // @req FR:config-settings/config.value.strings
    return leaf.kind === "string[]"
      ? (value as unknown[]).filter((v) => typeof v === "string")
      : structuredClone(value);
  }
  // @req FR:config-settings/config.default.mismatch
  // @req FR:config-settings/config.default.copy
  return structuredClone(leaf.default);
}

function fill(schema: Obj, raw: unknown): Obj {
  const out: Obj = {};
  for (const [key, node] of Object.entries(schema)) {
    const value = isObject(raw) ? raw[key] : undefined;
    out[key] = isLeaf(node) ? valueOf(node, value) : fill(node as Obj, value);
  }
  return out;
}

/**
 * Environment properties, read from `env` at access time.
 * @req FR:config-settings/config.@env
 * @req FR:config-settings/config.env
 */
function envConfig(getEnv: () => NodeJS.ProcessEnv): EnvConfig {
  const out = {};
  for (const [key, leaf] of Object.entries(ENV) as [string, Leaf<unknown>][]) {
    Object.defineProperty(out, key, {
      enumerable: true,
      get: () => {
        // @req FR:config-settings/config.env.empty
        const raw = getEnv()[key];
        if (!raw) {
          return structuredClone(leaf.default);
        }
        // @req FR:config-settings/config.env.boolean
        // @req FR:config-settings/config.env.boolean.other
        return leaf.kind === "boolean" ? raw === "1" || raw === "true" : raw;
      },
    });
  }
  return out as EnvConfig;
}

/**
 * Build a config object from config text and an environment.
 * The caller picks the text source: working tree or base branch.
 * @req FR:config-settings/config.@api
 * @req FR:config-settings/config.input
 * @req FR:config-settings/config.output
 */
export function createConfig(
  text?: string,
  env: NodeJS.ProcessEnv = process.env,
): CatalystConfig {
  return {
    ...fill(FILE, parse(text)),
    env: envConfig(() => env),
  } as CatalystConfig;
}

const readText = (projectRoot: string): string | undefined => {
  try {
    return fs.readFileSync(path.join(projectRoot, CONFIG_PATH), "utf-8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw e;
  }
};

/**
 * Load `.xe/config/catalyst.json` from a project root into a config object.
 * @req FR:config-settings/config.@api
 * @req FR:config-settings/config.@json
 * @req FR:config-settings/config.missing
 */
export async function loadConfig(
  projectRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CatalystConfig> {
  let text: string | undefined;
  try {
    text = await fs.promises.readFile(
      path.join(projectRoot, CONFIG_PATH),
      "utf-8",
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      throw e;
    }
  }
  return createConfig(text, env);
}

let startup: CatalystConfig | undefined;
const startupEnv = envConfig(() => process.env);

/**
 * The working directory's config object, loaded once on first use.
 * `Config.env` never loads the file.
 * @req FR:config-settings/config.@api
 * @req FR:config-settings/config.startup
 * @req FR:config-settings/config.startup.env
 */
export const Config: CatalystConfig = new Proxy({} as CatalystConfig, {
  get: (_target, key) => {
    if (key === "env") {
      return startupEnv;
    }
    startup ??= createConfig(readText(process.cwd()));
    return startup[key as keyof CatalystConfig];
  },
});
