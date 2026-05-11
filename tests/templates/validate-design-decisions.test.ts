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
