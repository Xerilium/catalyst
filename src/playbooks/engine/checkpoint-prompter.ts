/**
 * Checkpoint Prompter
 *
 * Abstraction for interactive checkpoint prompts during playbook execution.
 * Decouples the CheckpointAction from terminal I/O for testability and extensibility.
 *
 * @req FR:playbook-engine/actions.builtin.checkpoint.display - Render prompt to terminal
 * @req FR:playbook-engine/actions.builtin.checkpoint.interactive - Collect user input via stdin
 */

import * as readline from "readline";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Configuration passed to the prompter for rendering and input collection.
 */
export interface CheckpointPromptConfig {
  /** Question or prompt text (inline formatting only) */
  message: string;
  /** Extended context (full markdown, displayed collapsed by default) */
  context?: string;
  /** Selectable options */
  options: CheckpointDisplayOption[];
  /** Allow multiple selections */
  multiSelect: boolean;
  /** Timeout in seconds (auto-selects default when elapsed) */
  timeout?: number;
  /** Key of the default option */
  defaultKey?: string;
  /** Optional header title (default: none — just a dim HR separator) */
  header?: string;
  /** Optional header color: named ("yellow", "bold cyan"), hex ("#ff8800"), or ANSI code (default: dim) */
  headerColor?: string;
}

/**
 * A single option displayed to the user.
 */
export interface CheckpointDisplayOption {
  /** Unique key for this option */
  key: string;
  /** Display label (may contain & prefix for accelerator key) */
  label: string;
  /** Optional description */
  description?: string;
  /** Visual emphasis */
  emphasis?: "recommended" | "suggested";
  /** 1-based display number */
  number: number;
  /** Accelerator key character (extracted from & prefix in label) */
  accelerator?: string;
  /** Whether selecting this option prompts for text input */
  allowText?: boolean;
}

/**
 * The user's response to a checkpoint prompt.
 *
 * @req FR:playbook-engine/actions.builtin.checkpoint.result - User selection as step result
 */
export interface CheckpointResponse {
  /** Key(s) of chosen option(s) */
  selected: string | string[];
  /** The option's value (or key if no explicit value), or text input string */
  value: unknown;
  /** True if user provided text input (via an allowText option) */
  hasTextInput: boolean;
  /** The text the user typed (only when hasTextInput is true) */
  textInput?: string;
}

// ─── Interface ──────────────────────────────────────────────────────────────

/**
 * Interface for collecting user input at checkpoint steps.
 *
 * Implementations handle rendering the prompt and collecting the response.
 * The default TerminalCheckpointPrompter uses Node readline for CLI interaction.
 * Tests inject a mock that returns predetermined responses.
 */
export interface CheckpointPrompter {
  prompt(config: CheckpointPromptConfig): Promise<CheckpointResponse>;
}

// ─── Terminal Implementation ────────────────────────────────────────────────

// ANSI codes
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const UNDERLINE = "\x1b[4m";
const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";
const WHITE = "\x1b[37m";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_TO_END = "\x1b[J";

/**
 * Named color map for human-friendly color specification in checkpoint headers.
 * Supports standard terminal colors, bright variants, and modifiers.
 */
const NAMED_COLORS: Record<string, string> = {
  // Standard colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  // Bright variants
  "bright-black": "\x1b[90m",
  gray: "\x1b[90m",
  grey: "\x1b[90m",
  "bright-red": "\x1b[91m",
  "bright-green": "\x1b[92m",
  "bright-yellow": "\x1b[93m",
  "bright-blue": "\x1b[94m",
  "bright-magenta": "\x1b[95m",
  "bright-cyan": "\x1b[96m",
  "bright-white": "\x1b[97m",
  // Modifiers (can be combined: "bold yellow")
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
};

/**
 * Resolve a color specification to ANSI escape code(s).
 *
 * Supports:
 * - Named colors: "yellow", "bright-red", "green"
 * - Combined names: "bold yellow", "bold bright-cyan"
 * - RGB hex codes: "#ff8800", "#f80"
 * - Raw ANSI codes: "\x1b[33m" (passthrough)
 *
 * Returns the DIM ANSI code if the input is undefined or unrecognized.
 */
export function resolveColor(color: string | undefined): string {
  if (!color) return DIM;

  // Raw ANSI passthrough (starts with ESC)
  if (color.startsWith("\x1b") || color.startsWith("\u001b")) {
    return color;
  }

  // Hex RGB: #rrggbb or #rgb
  if (color.startsWith("#")) {
    return hexToAnsi(color);
  }

  // Named color(s): "bold yellow", "bright-red", etc.
  const parts = color.toLowerCase().trim().split(/\s+/);
  const codes = parts.map((p) => NAMED_COLORS[p]).filter(Boolean);
  if (codes.length > 0) {
    return codes.join("");
  }

  // Unrecognized — fall back to dim
  return DIM;
}

/**
 * Convert a hex color (#rrggbb or #rgb) to ANSI 24-bit color escape code.
 * Falls back to DIM if the hex is malformed.
 */
function hexToAnsi(hex: string): string {
  const h = hex.replace("#", "");
  let r: number, g: number, b: number;

  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length === 6) {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    return DIM;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return DIM;

  // ANSI 24-bit (truecolor): ESC[38;2;r;g;bm
  return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Terminal-based checkpoint prompter using raw keypress input.
 *
 * Renders checkpoint header with separator, message, optional expandable context,
 * arrow-navigable option list with accelerator keys, and collects user selection
 * via stdin keypresses.
 *
 * @req FR:playbook-engine/actions.builtin.checkpoint.display - Terminal rendering
 * @req FR:playbook-engine/actions.builtin.checkpoint.interactive - Arrow-key + Enter selection
 * @req FR:playbook-engine/actions.builtin.checkpoint.timeout - Timeout support
 */
export class TerminalCheckpointPrompter implements CheckpointPrompter {
  /** Number of lines rendered in the current options block (0 = first render) */
  private renderedLineCount = 0;

  /**
   * Release stdin resources after all checkpoints are complete.
   *
   * readline.emitKeypressEvents() adds an internal 'data' listener to stdin
   * that persists after our 'keypress' listeners are removed. This orphaned
   * listener keeps the Node.js event loop alive, preventing process exit.
   * Call this once after the playbook run finishes — never between checkpoints.
   *
   * `stdin.unref()` only exists when stdin is a Socket (TTY). When stdin is
   * piped, redirected, or in some non-TTY contexts it's a plain Readable
   * without `.unref()`, so we feature-detect before calling.
   */
  static releaseStdin(): void {
    const stdin = process.stdin as NodeJS.ReadStream & { unref?: () => void };
    stdin.removeAllListeners("data");
    stdin.removeAllListeners("keypress");
    if (!stdin.isPaused()) {
      stdin.pause();
    }
    // Allow Node.js to exit even if stdin hasn't been fully consumed.
    // Without unref(), a paused-but-open stdin keeps the event loop alive.
    if (typeof stdin.unref === "function") {
      stdin.unref();
    }
  }

  async prompt(config: CheckpointPromptConfig): Promise<CheckpointResponse> {
    // Render separator and optional header
    const cols = process.stdout.columns || 80;
    this.write("\n");
    if (config.header) {
      const color = resolveColor(config.headerColor);
      const titlePart = `── ${config.header} `;
      const remaining = Math.max(0, cols - titlePart.length);
      this.write(`${color}${titlePart}${"─".repeat(remaining)}${RESET}\n`);
    } else {
      this.write(`${DIM}${"─".repeat(cols)}${RESET}\n`);
    }
    this.write("\n");
    this.write(`  ${config.message}\n`);

    // No options → simple Enter-to-continue
    if (config.options.length === 0) {
      this.write("\n");
      const hint = config.context
        ? `  ${DIM}Enter continue · ? details${RESET} `
        : `  ${DIM}Press Enter to continue...${RESET} `;
      const key = await this.waitForKey(config.timeout, hint);
      if (key === "?" && config.context) {
        this.renderContext(config.context);
        await this.waitForKey(
          undefined,
          `  ${DIM}Press Enter to continue...${RESET} `,
        );
      }
      this.write("\n"); // blank line after checkpoint (matches options flow)
      return { selected: "continue", value: true, hasTextInput: false };
    }

    // Options present → arrow-key navigation
    if (config.multiSelect) {
      return await this.collectMultiSelect(config);
    } else {
      return await this.collectSingleSelect(config);
    }
  }

  private async collectSingleSelect(
    config: CheckpointPromptConfig,
  ): Promise<CheckpointResponse> {
    const options = config.options;

    // Start cursor on default option if specified, else first
    let cursor = 0;
    if (config.defaultKey) {
      const idx = options.findIndex((o) => o.key === config.defaultKey);
      if (idx >= 0) cursor = idx;
    }

    let contextShown = false;
    this.renderedLineCount = 0;

    this.write(HIDE_CURSOR);
    this.renderOptions(
      options,
      cursor,
      undefined,
      contextShown ? undefined : config.context,
    );

    const result = await this.navigateOptions(
      options,
      cursor,
      false,
      undefined,
      config.timeout,
      config.defaultKey,
      config.context,
      contextShown,
      (cur, _sel, ctxShown) => {
        contextShown = ctxShown;
        this.renderOptions(
          options,
          cur,
          undefined,
          ctxShown ? undefined : config.context,
        );
      },
    );

    this.write(SHOW_CURSOR);

    if (result.action === "timeout" && config.defaultKey) {
      const defaultOpt = options.find((o) => o.key === config.defaultKey);
      if (defaultOpt) {
        this.write(
          `  ${DIM}Timeout — auto-selected: ${defaultOpt.label}${RESET}\n`,
        );
        return {
          selected: defaultOpt.key,
          value: defaultOpt.key,
          hasTextInput: false,
        };
      }
    }

    const chosen = options[result.cursor];

    // If this option has allowText, prompt for text input
    if (chosen.allowText) {
      const text = await this.askLine(`  ${CYAN}Enter your response:${RESET} `);
      this.write("\n");
      return {
        selected: chosen.key,
        value: text,
        hasTextInput: true,
        textInput: text,
      };
    }

    return { selected: chosen.key, value: chosen.key, hasTextInput: false };
  }

  private async collectMultiSelect(
    config: CheckpointPromptConfig,
  ): Promise<CheckpointResponse> {
    const options = config.options;
    let cursor = 0;
    const selected = new Set<number>();
    let contextShown = false;
    this.renderedLineCount = 0;

    this.write(HIDE_CURSOR);
    this.renderOptions(
      options,
      cursor,
      selected,
      contextShown ? undefined : config.context,
    );

    const result = await this.navigateOptions(
      options,
      cursor,
      true,
      selected,
      config.timeout,
      config.defaultKey,
      config.context,
      contextShown,
      (cur, sel, ctxShown) => {
        contextShown = ctxShown;
        this.renderOptions(
          options,
          cur,
          sel,
          ctxShown ? undefined : config.context,
        );
      },
    );

    this.write(SHOW_CURSOR);

    if (result.action === "timeout" && config.defaultKey) {
      const defaultOpt = options.find((o) => o.key === config.defaultKey);
      if (defaultOpt) {
        this.write(
          `  ${DIM}Timeout — auto-selected: ${defaultOpt.label}${RESET}\n`,
        );
        return {
          selected: defaultOpt.key,
          value: defaultOpt.key,
          hasTextInput: false,
        };
      }
    }

    // Check if any allowText option was selected
    const textIdx = [...selected].find((i) => options[i].allowText);
    if (textIdx !== undefined) {
      const text = await this.askLine(`  ${CYAN}Enter your response:${RESET} `);
      this.write("\n");
      return {
        selected: options[textIdx].key,
        value: text,
        hasTextInput: true,
        textInput: text,
      };
    }

    const selectedKeys = [...selected].map((i) => options[i].key);
    return { selected: selectedKeys, value: selectedKeys, hasTextInput: false };
  }

  /**
   * Format a single option line with cursor highlight, checkbox, accelerator underline.
   * Focused (cursor) items get bright styling; unfocused items are always dim
   * so the focused item visually stands out regardless of emphasis.
   */
  private formatOptionLine(
    opt: CheckpointDisplayOption,
    isCursor: boolean,
    isSelected?: boolean,
  ): string {
    const pointer = isCursor ? `${CYAN}›${RESET} ` : "  ";
    const checkbox =
      isSelected !== undefined
        ? isSelected
          ? `${GREEN}[✓]${RESET} `
          : `${DIM}[ ]${RESET} `
        : "";

    // Focused: emphasis color if present, otherwise bright white bold
    // Unfocused: always dim — keeps focus visually clear
    let labelColor: string;
    if (isCursor) {
      const emphasisColor = this.formatEmphasis(opt);
      labelColor = emphasisColor || `${WHITE}${BOLD}`;
    } else {
      labelColor = DIM;
    }

    const desc = opt.description ? ` ${DIM}— ${opt.description}${RESET}` : "";
    const label = this.formatLabel(opt.label, opt.accelerator, labelColor);

    return `  ${pointer}${checkbox}${label}${desc}`;
  }

  /**
   * Format label with accelerator underline. The & character in the source label
   * marks the next character as the accelerator (e.g., "&Continue" → C is underlined).
   */
  private formatLabel(
    label: string,
    accelerator: string | undefined,
    colorCode: string,
  ): string {
    if (!accelerator) {
      return `${colorCode}${label}${RESET}`;
    }

    const idx = label.toLowerCase().indexOf(accelerator.toLowerCase());
    if (idx < 0) {
      return `${colorCode}${label}${RESET}`;
    }

    const before = label.slice(0, idx);
    const accelChar = label[idx];
    const after = label.slice(idx + 1);
    return `${colorCode}${before}${UNDERLINE}${accelChar}${RESET}${colorCode}${after}${RESET}`;
  }

  private formatEmphasis(opt: CheckpointDisplayOption): string {
    if (opt.emphasis === "recommended") {
      return `${GREEN}${BOLD}`;
    }
    if (opt.emphasis === "suggested") {
      return `${BLUE}`;
    }
    return "";
  }

  /**
   * Render the option list using relative cursor movement for reliable positioning.
   * On first render: write lines and track count.
   * On subsequent renders: move cursor up by previous line count, clear to end, rewrite.
   * This avoids DEC save/restore which breaks when the terminal scrolls.
   */
  private renderOptions(
    options: CheckpointDisplayOption[],
    cursor: number,
    selected: Set<number> | undefined,
    contextHint: string | undefined,
  ): void {
    const lines: string[] = [];
    lines.push(""); // blank line before options
    for (let i = 0; i < options.length; i++) {
      const isSelected = selected ? selected.has(i) : undefined;
      lines.push(this.formatOptionLine(options[i], i === cursor, isSelected));
    }
    lines.push(""); // blank line before navigation tip
    const hints =
      selected !== undefined
        ? ["↑↓ to navigate", "Space to toggle", "Enter to confirm"]
        : ["↑↓ to navigate", "Enter to select"];
    if (contextHint) {
      hints.push("? for details");
    }
    lines.push(`  ${DIM}${hints.join(" · ")}${RESET}`);
    lines.push(""); // blank line after navigation tip

    if (this.renderedLineCount > 0) {
      // Move cursor up to the first line of the previous render, then clear.
      // After writing N lines with join('\n'), cursor is on the last line,
      // so we move up (N - 1) lines to reach the first line.
      this.write(`\x1b[${this.renderedLineCount - 1}A\r`);
      this.write(CLEAR_TO_END);
    }

    this.write(lines.join("\n"));
    this.renderedLineCount = lines.length;
  }

  /**
   * Raw keypress navigation loop using readline keypress events for
   * cross-platform arrow key support.
   */
  private navigateOptions(
    options: CheckpointDisplayOption[],
    startCursor: number,
    multiSelect: boolean,
    selected: Set<number> | undefined,
    timeoutSeconds: number | undefined,
    defaultKey: string | undefined,
    context: string | undefined,
    contextShown: boolean,
    onRedraw: (
      cursor: number,
      selected: Set<number> | undefined,
      contextShown: boolean,
    ) => void,
  ): Promise<{ cursor: number; action: "select" | "timeout" }> {
    return new Promise((resolve) => {
      let cursor = startCursor;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      const wasPaused = !stdin.readableFlowing;
      if (stdin.isTTY) {
        stdin.setRawMode(true);
        readline.emitKeypressEvents(stdin);
      }
      stdin.resume();

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        stdin.removeListener("keypress", onKeypress);
        if (stdin.isTTY && wasRaw !== undefined) {
          stdin.setRawMode(wasRaw);
        }
        if (wasPaused) {
          stdin.pause();
        }
        this.write("\n\n");
      };

      if (timeoutSeconds && timeoutSeconds > 0 && defaultKey) {
        timer = setTimeout(() => {
          cleanup();
          resolve({ cursor, action: "timeout" });
        }, timeoutSeconds * 1000);
      }

      // Build accelerator lookup: lowercase char → option index
      const accelerators = new Map<string, number[]>();
      for (let i = 0; i < options.length; i++) {
        const accel = options[i].accelerator;
        if (accel) {
          const key = accel.toLowerCase();
          if (!accelerators.has(key)) {
            accelerators.set(key, []);
          }
          accelerators.get(key)!.push(i);
        }
      }
      const accelCyclePos = new Map<string, number>();

      const onKeypress = (
        ch: string | undefined,
        key: readline.Key | undefined,
      ) => {
        // Ctrl+C — abort
        if (key?.ctrl && key?.name === "c") {
          cleanup();
          this.write(SHOW_CURSOR);
          process.exit(130);
        }

        // Arrow up or 'k'
        if (key?.name === "up" || ch === "k") {
          cursor = (cursor - 1 + options.length) % options.length;
          onRedraw(cursor, selected, contextShown);
          return;
        }

        // Arrow down or 'j'
        if (key?.name === "down" || ch === "j") {
          cursor = (cursor + 1) % options.length;
          onRedraw(cursor, selected, contextShown);
          return;
        }

        // Number keys 1-9 — jump to option
        if (ch && ch >= "1" && ch <= "9") {
          const num = parseInt(ch, 10);
          if (num >= 1 && num <= options.length) {
            cursor = num - 1;
            if (multiSelect && selected) {
              if (selected.has(cursor)) {
                selected.delete(cursor);
              } else {
                selected.add(cursor);
              }
              onRedraw(cursor, selected, contextShown);
            } else {
              cleanup();
              resolve({ cursor, action: "select" });
            }
            return;
          }
        }

        // Space — toggle in multi-select
        if (ch === " " && multiSelect && selected) {
          if (selected.has(cursor)) {
            selected.delete(cursor);
          } else {
            selected.add(cursor);
          }
          onRedraw(cursor, selected, contextShown);
          return;
        }

        // Enter — confirm
        if (key?.name === "return") {
          cleanup();
          resolve({ cursor, action: "select" });
          return;
        }

        // '?' — toggle context details
        if (ch === "?" && context) {
          if (!contextShown) {
            // Context goes above the options — clear current options, print context, then redraw
            if (this.renderedLineCount > 1) {
              this.write(`\x1b[${this.renderedLineCount - 1}A\r`);
              this.write(CLEAR_TO_END);
            }
            this.renderContext(context);
            this.renderedLineCount = 0; // Next renderOptions writes fresh
            contextShown = true;
          }
          onRedraw(cursor, selected, contextShown);
          return;
        }

        // Accelerator key matching
        if (ch && accelerators.has(ch.toLowerCase())) {
          const indices = accelerators.get(ch.toLowerCase())!;
          const accelKey = ch.toLowerCase();
          const cyclePos = accelCyclePos.get(accelKey) ?? 0;
          const targetIdx = indices[cyclePos % indices.length];
          accelCyclePos.set(accelKey, cyclePos + 1);

          cursor = targetIdx;
          if (multiSelect && selected) {
            // Multi-select: toggle the option
            if (selected.has(cursor)) {
              selected.delete(cursor);
            } else {
              selected.add(cursor);
            }
            onRedraw(cursor, selected, contextShown);
          } else if (indices.length > 1) {
            // Single-select with shared accelerator: cycle cursor, require Enter to confirm
            onRedraw(cursor, selected, contextShown);
          } else {
            // Single-select with unique accelerator: select immediately
            cleanup();
            resolve({ cursor, action: "select" });
          }
          return;
        }
      };

      stdin.on("keypress", onKeypress);
    });
  }

  private renderContext(context: string): void {
    // Border uses a subtly brighter shade than the dim content for visual separation
    const BORDER = "\x1b[90m"; // bright-black (dark gray)

    // Trim trailing empty lines (YAML block scalars end with \n → empty last element)
    const lines = context.split("\n");
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }

    this.write("\n");
    this.write(
      `  ${BORDER}╭── Details ${"─".repeat(Math.max(0, 40 - 13))}${RESET}\n`,
    );
    for (const line of lines) {
      this.write(`  ${BORDER}│${RESET} ${DIM}${line}${RESET}\n`);
    }
    this.write(`  ${BORDER}╰${"─".repeat(40)}${RESET}\n`);
  }

  /** Readline-based line input for text input responses */
  private askLine(prompt: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer ?? "");
      });
    });
  }

  /**
   * Wait for a single keypress (for Enter-to-continue prompts).
   */
  private waitForKey(
    timeoutSeconds?: number,
    prompt?: string,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      if (prompt) this.write(prompt);

      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      const wasPaused = !stdin.readableFlowing;
      if (stdin.isTTY) {
        stdin.setRawMode(true);
        readline.emitKeypressEvents(stdin);
      }
      stdin.resume();

      let timer: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        stdin.removeListener("keypress", onKeypress);
        if (stdin.isTTY && wasRaw !== undefined) {
          stdin.setRawMode(wasRaw);
        }
        if (wasPaused) {
          stdin.pause();
        }
        this.write("\n");
      };

      if (timeoutSeconds && timeoutSeconds > 0) {
        timer = setTimeout(() => {
          cleanup();
          resolve(null);
        }, timeoutSeconds * 1000);
      }

      const onKeypress = (
        ch: string | undefined,
        key: readline.Key | undefined,
      ) => {
        if (key?.ctrl && key?.name === "c") {
          cleanup();
          process.exit(130);
        }
        cleanup();
        resolve(key?.name === "return" ? "\n" : (ch ?? null));
      };

      stdin.on("keypress", onKeypress);
    });
  }

  /** Write to stdout */
  private write(text: string): void {
    process.stdout.write(text);
  }
}
