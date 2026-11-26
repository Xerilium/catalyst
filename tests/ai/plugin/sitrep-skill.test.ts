/**
 * Contract tests for the sitrep skill template.
 *
 * The skill is an AI prompt, so these tests lock the instructions and tool
 * permissions that make each behavior possible.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { parseFrontmatter } from "../../../scripts/generate-plugin";

const content = readFileSync(
  join(__dirname, "../../../src/resources/ai-plugin/skills/sitrep.md"),
  "utf-8",
);
const { fields } = parseFrontmatter(content);
const tools = (fields.get("allowed-tools") ?? "")
  .split(",")
  .map((t) => t.trim());
const body = content.replace(/^---[\s\S]*?\n---\n/, "");

describe("sitrep skill", () => {
  // @req FR:session-status/checkin.@ai-skill
  // @req FR:session-status/checkin.input
  it("takes tldr as a bare mode argument", () => {
    expect(fields.get("argument-hint")).toBe("[tldr]");
    expect(content).not.toContain("--tldr");
  });

  // @req FR:session-status/checkin.fresh
  // @req FR:session-status/checkin.fresh.sources
  it("grants the read-only tools a live read needs", () => {
    for (const tool of [
      "Read",
      "Glob",
      "Grep",
      "Bash(git status:*)",
      "Bash(git log --oneline:*)",
      "Bash(git branch --show-current:*)",
      "Bash(gh pr view:*)",
      "Bash(gh pr checks:*)",
      "Bash(gh pr list:*)",
    ]) {
      expect(tools).toContain(tool);
    }
  });

  // @req FR:session-status/checkin.fresh
  // @req FR:session-status/checkin.fresh.sources
  it("reads live state before it writes the report", () => {
    const read = body.search(/## Step 1: Read live state/);
    const report = body.search(/## Step 2: Report/);
    expect(read).toBeGreaterThan(-1);
    expect(report).toBeGreaterThan(read);
    const step = body.slice(read, report);
    expect(step).toContain("Never pass `--output`");
    expect(step).toContain("Never pass `--watch`");
    for (const source of [
      "git status",
      "gh pr view",
      "gh pr checks",
      "rollout",
    ]) {
      expect(step).toContain(source);
    }
  });

  // @req FR:session-status/checkin.fresh.goal
  // @req FR:session-status/checkin.fresh.current
  it("takes the goal from the conversation and the rest from live reads", () => {
    expect(body).toContain(
      "Take Goal from the conversation. Take every other value from this run's reads.",
    );
    expect(body).toMatch(/never use memory, an earlier sitrep, or a guess/i);
  });

  // @req FR:session-status/checkin.fresh.unknown
  it("reports unknown when a live read fails", () => {
    expect(body).toMatch(/read fails.*`unknown`/i);
  });

  // @req FR:session-status/checkin.read-only
  it("grants no tool that changes state", () => {
    expect(tools).not.toContain("Edit");
    expect(tools).not.toContain("Write");
    expect(tools).not.toContain("Bash");
    for (const tool of tools.filter((t) => t.startsWith("Bash("))) {
      expect(tool).toMatch(
        /^Bash\((git status|git log --oneline|git branch --show-current|gh pr (view|checks|list)):\*\)$/,
      );
    }
    expect(body).toMatch(
      /do NOT edit files, run state-changing tools, or invoke AUQ/,
    );
  });

  // @req FR:session-status/checkin.resume
  it("resumes the in-flight task after the report", () => {
    expect(body).toMatch(
      /resume the in-flight task under that task's own rules/i,
    );
  });

  // @req FR:session-status/checkin.comms
  // @req FR:session-status/checkin.comms.current
  // @req FR:session-status/checkin.comms.paragraph
  // @req FR:session-status/checkin.comms.bullet
  // @req FR:session-status/checkin.comms.total
  it("sets the word limits", () => {
    expect(body).toContain("Simplified Technical English");
    expect(body).toContain(
      "Give status as facts. No step-by-step story of past work.",
    );
    expect(body).toMatch(/paragraph.*under 20 words/i);
    expect(body).toMatch(/bullet.*under 10 words/i);
    expect(body).toMatch(/report.*under 100 words/i);
  });

  // @req FR:session-status/checkin.comms.pr-link
  it("links every PR with its full URL", () => {
    expect(body).toContain("[{number}]({full-url})");
    expect(body).toMatch(/never `#123`/i);
  });

  // @req FR:session-status/checkin.comms.blocked
  // @req FR:session-status/checkin.followup
  // @req FR:session-status/checkin.followup.waiting
  // @req FR:session-status/checkin.followup.new-ask
  it("defines how to ask and wait for the developer", () => {
    expect(body).toContain("Need your {ack|response|...}...");
    expect(body).toMatch(
      /repeat an ask that still waits for a reply, write only `\.\.\.`/,
    );
    expect(body).toMatch(/new ask.*`---`/i);
  });

  // @req FR:session-status/checkin.output
  it("lists the full report lines in order", () => {
    const labels = [
      "**Goal:**",
      "**Working on:**",
      "**Progress:**",
      "**Blockers:**",
      "**Next:**",
      "**Files:**",
    ];
    const full = body.slice(
      body.indexOf("### Full report"),
      body.indexOf("### tldr report"),
    );
    const positions = labels.map((l) => full.indexOf(l));
    expect(positions.every((p) => p > -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  // @req FR:session-status/checkin.input.mode
  // @req FR:session-status/checkin.tldr
  // @req FR:session-status/checkin.tldr.total
  it("gives tldr mode a shorter report", () => {
    expect(body).toMatch(
      /argument `tldr` → tldr report\. No argument → full report/,
    );
    const tldr = body.slice(
      body.indexOf("### tldr report"),
      body.indexOf("## Step 3"),
    );
    const now = tldr.indexOf("**Now:**");
    const next = tldr.indexOf("**Next:**");
    const blocker = tldr.indexOf("only when blocked");
    expect(now).toBeGreaterThan(-1);
    expect(next).toBeGreaterThan(now);
    expect(blocker).toBeGreaterThan(next);
    expect(tldr).not.toContain("**Files:**");
    expect(tldr).toMatch(/under 50 words/i);
  });
});
