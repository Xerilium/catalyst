import fs from "fs";
import path from "path";

describe("design-decisions.md template validation", () => {
  const templatePath = path.join(
    __dirname,
    "../../src/resources/templates/specs/design-decisions.md",
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, "utf-8");
  });

  // @req FR:feature-context/design-decisions.template
  it("should exist at the conventional template path", () => {
    expect(fs.existsSync(templatePath)).toBe(true);
  });

  // @req FR:feature-context/design-decisions.heading
  it("should use H1 format with scope name placeholder", () => {
    expect(content).toMatch(/^# Design Decisions: \{scope-name\}$/m);
  });

  it("should document both feature-level and product-level scope variants", () => {
    expect(content).toMatch(/Feature decisions/i);
    expect(content).toMatch(/Product\/architecture decisions/i);
  });

  // @req FR:feature-context/design-decisions.criteria
  it("should state the recording bar: distinct options plus lasting consequence", () => {
    expect(content).toMatch(/distinct options/i);
    expect(content).toMatch(/changes an outcome/i);
    expect(content).toMatch(/introduces a limitation/i);
    expect(content).toMatch(/refuted/i);
  });

  // @req FR:feature-context/design-decisions.criteria.exclusions
  it("should exclude low-impact and unrefutable choices and route them to PR comments", () => {
    expect(content).toMatch(/negligible customer, outcome, UX, or API impact/i);
    expect(content).toMatch(/pull request comments/i);
  });

  // @req FR:feature-context/design-decisions.active
  it("should declare the file a list of active decisions, not a historical ledger", () => {
    expect(content).toMatch(/active.{0,40}decisions/is);
    expect(content).toMatch(/not a ledger/i);
  });

  // @req FR:feature-context/design-decisions.active.supersede
  it("should require updating an existing entry in place over adding an overlapping one", () => {
    expect(content).toMatch(/update the existing entry in place/i);
    expect(content).toMatch(/never add a second entry that overlaps/i);
  });

  // @req FR:feature-context/design-decisions.heading.decision
  it("should require plain-language H2 titles", () => {
    expect(content).toMatch(/H2 titles.*plain language/i);
    expect(content).toMatch(/clear, concise, precise/i);
  });

  // @req FR:feature-context/design-decisions.scope
  it("should include all required field placeholders", () => {
    expect(content).toMatch(/\*\*Decision\*\*/);
    expect(content).toMatch(/\*\*Date\*\*/);
    expect(content).toMatch(/\*\*Why\*\*/);
    expect(content).toMatch(/\*\*Rejected\*\*/);
    expect(content).toMatch(/\*\*Evidence\*\*/);
  });
});

describe("design-decisions.md instance validation", () => {
  const featuresDir = path.join(__dirname, "../../.xe/features");
  const getDecisionFiles = () => {
    const features = fs
      .readdirSync(featuresDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    return features
      .map((f) => ({
        feature: f,
        path: path.join(featuresDir, f, "design-decisions.md"),
      }))
      .filter(({ path: p }) => fs.existsSync(p));
  };

  // @req FR:feature-context/design-decisions.@file
  it("should store design-decisions.md at the conventional path when present", () => {
    expect(getDecisionFiles().length).toBeGreaterThan(0);
  });

  // @req FR:feature-context/design-decisions.scope
  it("should not contain FR definitions", () => {
    for (const { path: p } of getDecisionFiles()) {
      const ddContent = fs.readFileSync(p, "utf-8");
      expect(ddContent).not.toMatch(/^- \*\*FR:/m);
    }
  });

  // @req FR:feature-context/design-decisions.heading
  it("should use H1 format with feature name", () => {
    for (const { path: p } of getDecisionFiles()) {
      const ddContent = fs.readFileSync(p, "utf-8");
      expect(ddContent).toMatch(/^# Design Decisions: .+$/m);
    }
  });

  // @req FR:feature-context/design-decisions.scope
  it("should include required fields for each decision", () => {
    for (const { path: p } of getDecisionFiles()) {
      const ddContent = fs.readFileSync(p, "utf-8");
      const decisions = ddContent.split(/^## /m).slice(1);
      for (const decision of decisions) {
        expect(decision).toMatch(/\*\*Decision\*\*/);
        expect(decision).toMatch(/\*\*Date\*\*/);
        expect(decision).toMatch(/\*\*Why\*\*/);
      }
    }
  });

  // @req FR:feature-context/design-decisions.active.supersede
  it("should not repeat a decision title within a file", () => {
    for (const { path: p } of getDecisionFiles()) {
      const ddContent = fs.readFileSync(p, "utf-8");
      const titles = (ddContent.match(/^## .+$/gm) || []).map((t) =>
        t.trim().toLowerCase(),
      );
      expect(titles.length).toBe(new Set(titles).size);
    }
  });

  // @req FR:feature-context/design-decisions.scope
  it("should not contain authority-based reasoning", () => {
    for (const { path: p } of getDecisionFiles()) {
      const ddContent = fs.readFileSync(p, "utf-8");
      const whyBlocks = ddContent.match(/\*\*Why\*\*:.*$/gm) || [];
      for (const why of whyBlocks) {
        expect(why).not.toMatch(
          /per user (request|specification|requirement)/i,
        );
      }
    }
  });
});
