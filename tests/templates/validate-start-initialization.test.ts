import fs from "fs";
import path from "path";

describe("start-initialization.md playbook validation", () => {
  const playbookPath = path.join(
    __dirname,
    "../../src/resources/playbooks/start-initialization.md",
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(playbookPath, "utf-8");
  });

  // @req FR:init-workflow/workflow.playbook
  it("should exist at the required path", () => {
    expect(fs.existsSync(playbookPath)).toBe(true);
  });

  // @req FR:init-workflow/workflow.playbook
  // @req FR:init-workflow/workflow.ai-command
  describe("Frontmatter", () => {
    it("should declare owner as Product Manager", () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || "";
      expect(frontmatter).toMatch(/owner:\s*"?Product Manager"?/);
    });

    it("should declare Architect as required reviewer", () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || "";
      expect(frontmatter).toMatch(/required:\s*\[\s*"Architect"\s*\]/);
    });
  });

  // @req FR:init-workflow/workflow (overall structure)
  // @req FR:init-workflow/workflow.input
  // @req FR:init-workflow/workflow.output
  // @req NFR:init-workflow/reliability.sequential-execution
  describe("Playbook structure", () => {
    it("should have a Goal line", () => {
      expect(content).toMatch(/\*\*Goal\*\*:/);
    });

    it("should declare the 3 phases (Scope, Implement, Review) as H2 sections in order, starting at Phase 1", () => {
      const phaseHeadings = content.match(/^## Phase \d+: \w+/gm) || [];
      expect(phaseHeadings).toEqual([
        "## Phase 1: Scope",
        "## Phase 2: Implement",
        "## Phase 3: Review",
      ]);
    });

    it("should include Inputs, Error handling, Success criteria sections", () => {
      expect(content).toMatch(/^## Inputs/m);
      expect(content).toMatch(/^## Error handling/m);
      expect(content).toMatch(/^## Success criteria/m);
    });
  });

  // @req FR:init-workflow/workflow.scope
  // @req FR:init-workflow/workflow.scope.detect
  // @req FR:init-workflow/workflow.scope.research
  // @req FR:init-workflow/workflow.scope.initial-batch
  // @req FR:init-workflow/workflow.scope.interview
  describe("FR:workflow.scope: Scope phase", () => {
    it("should include a Scope phase that inlines scope handling (no workflow-scope.md call)", () => {
      expect(content).toMatch(/## Phase 1: Scope/);
      expect(content).not.toMatch(/workflow-scope\.md/);
    });

    it("should detect existing .xe/product.md, research artifacts, and propose improvements (no overwrite-confirm)", () => {
      const phase1 =
        content.split(/## Phase 1: Scope/)[1]?.split(/^## /m)[0] || "";
      expect(phase1).toMatch(/\.xe\/product\.md/);
      expect(phase1).toMatch(
        /research existing.*artifacts|existing.*\.xe\/.*artifacts/i,
      );
      expect(phase1).toMatch(
        /improvements?|strengthen|modernize|innovation|scale|adoption/i,
      );
      expect(phase1).not.toMatch(/confirm.*overwrite|overwrite.*confirm/i);
    });

    it("should let inputs scope the research (no inputs → improve weaknesses)", () => {
      const phase1 =
        content.split(/## Phase 1: Scope/)[1]?.split(/^## /m)[0] || "";
      expect(phase1).toMatch(/inputs (scope|direct|provided)/i);
      expect(phase1).toMatch(/without inputs|deemed weak|no inputs/i);
    });

    it("should present an initial AUQ batch with up to 4 questions (Q1-Q3 context + Q4 mode with all four mode descriptions)", () => {
      const phase1 =
        content.split(/## Phase 1: Scope/)[1]?.split(/^## /m)[0] || "";
      expect(phase1).toMatch(/initial AUQ batch|initial batch/i);
      expect(phase1).toMatch(/Q1[-–]Q3/i);
      expect(phase1).toMatch(/Q4/i);
      // Each mode label present with its description (per workflow-context canonical text)
      expect(phase1).toMatch(/interactive/i);
      expect(phase1).toMatch(/checkpoint-review/i);
      expect(phase1).toMatch(/final-review/i);
      expect(phase1).toMatch(/autonomous/i);
      expect(phase1).toMatch(/Progressive Q&A/i);
      expect(phase1).toMatch(/Autonomous between checkpoints/i);
      expect(phase1).toMatch(/final human review/i);
      expect(phase1).toMatch(/New branch \+ PR/i);
    });

    it("should run the full interview in interactive mode OR when user opts in at Q3; otherwise run autonomously", () => {
      const phase1 =
        content.split(/## Phase 1: Scope/)[1]?.split(/^## /m)[0] || "";
      expect(phase1).toMatch(/init-interview\.md/);
      expect(phase1).toMatch(/interactive/i);
      expect(phase1).toMatch(/Q3.*interview|interview.*Q3/i);
      expect(phase1).toMatch(/autonomous|without AUQ|best-guess/i);
    });

    it("should place the interview opt-in (single decision point, not duplicated in the follow-up batch)", () => {
      const phase1 =
        content.split(/## Phase 1: Scope/)[1]?.split(/^## /m)[0] || "";
      expect(phase1).toMatch(/ask "Run the full product interview/i);
    });

    it("should cap non-interactive follow-up batches at ≤4 questions", () => {
      const phase1 =
        content.split(/## Phase 1: Scope/)[1]?.split(/^## /m)[0] || "";
      expect(phase1).toMatch(/≤\s*4|up to 4/i);
    });
  });

  // @req FR:init-workflow/workflow.implement
  describe("FR:workflow.implement: Implement phase", () => {
    it("should include an Implement phase that invokes init-render.md", () => {
      expect(content).toMatch(/## Phase 2: Implement/);
      const phaseSection =
        content.split(/## Phase 2: Implement/)[1]?.split(/^## /m)[0] || "";
      expect(phaseSection).toMatch(/init-render\.md/);
    });
  });

  // No FR:workflow.blueprint — blueprint is a closing message in Review, not a separate phase
  describe("No standalone Blueprint phase", () => {
    it("should NOT include a Blueprint phase as its own H2 section", () => {
      expect(content).not.toMatch(/^## Phase \d+: Blueprint/m);
    });
  });

  // @req FR:init-workflow/workflow.review
  // @req FR:workflow-context/audit
  // @req FR:workflow-context/review
  // @req FR:workflow-context/closure
  // @req FR:workflow-context/celebrate
  describe("FR:workflow.review: Review phase", () => {
    it("should include a Review phase composing the workflow-context closure actions", () => {
      expect(content).toMatch(/## Phase 3: Review/);
      expect(content).toMatch(/workflow-audit\.md/);
      expect(content).toMatch(/workflow-review\.md/);
      expect(content).toMatch(/workflow-closure\.md/);
      expect(content).toMatch(/workflow-celebrate\.md/);
    });

    it("should pass pr-type Init (or similar) to workflow-closure", () => {
      expect(content).toMatch(/pr-type[:\s]+Init/i);
    });

    it("should include a closing message pointing the user to /catalyst:blueprint for product design", () => {
      const phase3 =
        content.split(/## Phase 3: Review/)[1]?.split(/^## /m)[0] || "";
      expect(phase3).toMatch(/\/catalyst:blueprint/);
      expect(phase3).toMatch(/closing message|when ready|design/i);
    });
  });

  // No FR:workflow.continuity — init does not maintain a rollout/Active State (overhead disproportionate to single-pass workflow)
  describe("No rollout overhead", () => {
    it("should NOT reference workflow-state.md (no Active State maintenance)", () => {
      expect(content).not.toMatch(/workflow-state\.md/);
    });

    it("should NOT reference any rollout file", () => {
      expect(content).not.toMatch(/rollout-init\.md/);
      expect(content).not.toMatch(/\.xe\/rollouts\//);
    });
  });

  // @req FR:init-workflow/workflow.auq-usage
  describe("FR:workflow.auq-usage: AUQ via action file invocation", () => {
    it("should NOT include inline AskUserQuestion directives", () => {
      expect(content).not.toMatch(/AskUserQuestion/);
    });
  });

  // Regression: legacy issue-based init flow must not return
  describe("Regression: legacy issue-based init artifacts removed", () => {
    it("should NOT reference new-init-issue", () => {
      expect(content).not.toMatch(/new-init-issue/);
    });

    it("should NOT reference templates/issues/init.md", () => {
      expect(content).not.toMatch(/templates\/issues\/init\.md/);
    });

    it("should NOT reference any feature-* actions (use workflow-* instead)", () => {
      expect(content).not.toMatch(/actions\/feature-[a-z]+\.md/);
    });

    it("should NOT require an issue-id input", () => {
      const inputsSection =
        content.split(/## Inputs/)[1]?.split(/^## /m)[0] || "";
      expect(inputsSection).not.toMatch(/issue-id.*required/i);
    });
  });
});
