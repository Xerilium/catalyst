/**
 * Tests for the role agent templates.
 *
 * The agents are prompt templates, so these tests lock each role's scope,
 * boundaries, and tools.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { parseFrontmatter } from "../../../scripts/generate-plugin";

const AGENTS_DIR = join(__dirname, "../../../src/resources/ai-plugin/agents");
const load = (name: string) =>
  parseFrontmatter(readFileSync(join(AGENTS_DIR, `${name}.md`), "utf8"));
const tools = (name: string) =>
  (load(name).fields.get("tools") ?? "").split(",").map((t) => t.trim());

// @req FR:agents/creative-director/agent.handoff.route
// @req FR:agents/content-strategist/agent.handoff.route
// @req FR:agents/product-manager/agent.handoff.route
// @req FR:agents/architect/agent.handoff.route
// @req FR:agents/engineer/agent.handoff.route
describe.each([
  "creative-director",
  "content-strategist",
  "product-manager",
  "architect",
  "engineer",
])("%s handoffs", (name) => {
  it("sends handoffs and lists them only when it cannot start the owner agent", () => {
    const { body } = load(name);
    expect(body).toMatch(/Send each handoff to the agent that owns it/);
    expect(body).toMatch(
      /When you cannot start that agent, list the handoff in your output/,
    );
    expect(body).not.toMatch(/You do not start other agents/);
    expect(body).toMatch(/\*\*Handoffs:\*\*/);
  });
});

// @req FR:agents/creative-director/agent.consistent.revisit
// @req FR:agents/content-strategist/agent.standards.revisit
// @req FR:agents/product-manager/agent.evidence.revisit
// @req FR:agents/architect/agent.decisions.revisit
// @req FR:agents/engineer/agent.decisions
describe.each([
  "creative-director",
  "content-strategist",
  "product-manager",
  "architect",
  "engineer",
])("%s past decisions", (name) => {
  it("changes a past decision on researched evidence and approval", () => {
    const { body } = load(name);
    expect(body).toMatch(/Past (decisions|content rules) are not final/);
    expect(body).toMatch(/researched evidence/);
    expect(body).toMatch(/once the caller approves/);
  });
});

describe.each([
  "creative-director",
  "content-strategist",
  "product-manager",
  "architect",
  "engineer",
])("%s ownership wording", (name) => {
  it('does not use "keep" for owned files', () => {
    expect(load(name).body).not.toMatch(/\bKeep (the project's|`\.xe)/);
  });
});

describe("creative-director agent", () => {
  const { fields, body } = load("creative-director");

  // @req FR:agents/creative-director/agent.@ai-agent
  it("is published as the creative-director agent", () => {
    expect(fields.get("name")).toBe("creative-director");
  });

  // @req FR:agents/creative-director/agent.scope
  // @req FR:agents/creative-director/agent.scope.visual
  // @req FR:agents/creative-director/agent.scope.product
  // @req FR:agents/creative-director/agent.scope.marketing
  // @req FR:agents/creative-director/agent.scope.media
  // @req FR:agents/creative-director/agent.scope.accessibility
  // @req FR:agents/creative-director/agent.scope.voice
  // @req FR:agents/creative-director/agent.scope.system
  // @req FR:agents/creative-director/agent.scope.platform
  it("owns brand, visual, product, marketing, media, and accessibility direction", () => {
    expect(fields.get("description")).toMatch(
      /brand, visual design, UX, and creative direction/i,
    );
    expect(body).toMatch(/\*\*Visual design:\*\*.*typography.*color.*motion/i);
    expect(body).toMatch(
      /\*\*Product design:\*\*.*screens.*flows.*interaction/i,
    );
    expect(body).toMatch(/\*\*Marketing creative:\*\*/);
    expect(body).toMatch(/\*\*Generated media:\*\*.*images and video/i);
    expect(body).toMatch(/WCAG 2\.2 AA/);
    expect(body).toMatch(/brand voice/i);
    expect(body).toMatch(/\*\*Design system:\*\*/);
    expect(body).toMatch(/emails/);
    expect(body).toMatch(
      /\*\*Platform conventions:\*\*.*Apple Human Interface Guidelines, Material Design, and Microsoft Fluent/,
    );
  });

  // @req FR:agents/creative-director/agent.end-users
  it("defines the best option in end-user terms", () => {
    expect(body).toMatch(/least effort, the fewest errors, and the most trust/);
  });

  // @req FR:agents/creative-director/agent.direction
  // @req FR:agents/creative-director/agent.direction.standard
  // @req FR:agents/creative-director/agent.direction.standard.create
  // @req FR:agents/creative-director/agent.direction.principles
  // @req FR:agents/creative-director/agent.direction.decisions
  // @req FR:agents/creative-director/agent.direction.brief
  it("records direction where Catalyst keeps it", () => {
    expect(body).toMatch(/write and update .*`\.xe\/standards\/design\.md`/);
    expect(body).toMatch(
      /Design Principles section of `\.xe\/product\.md`\. Send changes to the `product-manager` agent/,
    );
    expect(body).toMatch(/design-decisions\.md/);
    expect(body).toMatch(/Create it when it does not exist/);
    expect(body).toMatch(
      /goal, audience, key message, constraints, and deliverables/,
    );
  });

  // @req FR:agents/creative-director/agent.consistent
  // @req FR:agents/creative-director/agent.consistent.revisit.evidence
  it("stays consistent and states evidence for a change", () => {
    expect(body).toMatch(/consistent with the recorded direction/i);
    expect(body).toMatch(
      /with the evidence, the old direction, and the new one/,
    );
    expect(body).toMatch(
      /Do not refuse a change only because a past decision exists/,
    );
  });

  // @req FR:agents/creative-director/agent.review
  // @req FR:agents/creative-director/agent.review.findings
  // @req FR:agents/creative-director/agent.review.verdict
  // @req FR:agents/creative-director/agent.review.visual
  // @req FR:agents/creative-director/agent.review.visual.request
  // @req FR:agents/creative-director/agent.review.visual.source-only
  // @req FR:agents/creative-director/agent.review.heuristics
  it("reviews the rendered result with located findings and a verdict", () => {
    expect(body).toMatch(/location.*the problem, and the fix/i);
    expect(body).toMatch(/Review the rendered result that end users see/);
    expect(body).toMatch(/Ask the caller for it when you do not have it/);
    expect(body).toMatch(/checked only the source/);
    expect(body).toMatch(
      /usability heuristics and the WAI-ARIA Authoring Practices/,
    );
    expect(body).toMatch(/\*\*Approve\*\* or \*\*Request changes\*\*/);
  });

  // @req FR:agents/creative-director/agent.decide
  it("gives one recommendation per decision", () => {
    expect(body).toMatch(/one recommendation for each decision/i);
  });

  // @req FR:agents/creative-director/agent.edits
  it("edits only direction files", () => {
    expect(body).toMatch(/Edit only these direction files/);
    expect(tools("creative-director")).not.toContain("Bash");
  });

  // @req FR:agents/creative-director/agent.handoff
  // @req FR:agents/creative-director/agent.handoff.scope
  // @req FR:agents/creative-director/agent.handoff.feasibility
  // @req FR:agents/creative-director/agent.handoff.copy
  // @req FR:agents/creative-director/agent.output
  it("hands off scope, feasibility, and copy and leads with the decision", () => {
    expect(body).toMatch(/`product-manager`/);
    expect(body).toMatch(/`architect`/);
    expect(body).toMatch(
      /Send product and marketing copy to the `content-strategist` agent/,
    );
    expect(body).toMatch(/Lead with the decision or verdict/);
  });
});

describe("content-strategist agent", () => {
  const { fields, body } = load("content-strategist");

  // @req FR:agents/content-strategist/agent.@ai-agent
  it("is published as the content-strategist agent", () => {
    expect(fields.get("name")).toBe("content-strategist");
  });

  // @req FR:agents/content-strategist/agent.scope
  // @req FR:agents/content-strategist/agent.scope.ui
  // @req FR:agents/content-strategist/agent.scope.marketing
  // @req FR:agents/content-strategist/agent.scope.accessibility
  // @req FR:agents/content-strategist/agent.scope.localization
  it("owns product copy on websites and in apps", () => {
    expect(fields.get("description")).toMatch(
      /product copy for websites and apps/i,
    );
    expect(body).toMatch(/You own product copy/);
    expect(body).toMatch(/\*\*Interface copy:\*\*.*errors.*empty states/i);
    expect(body).toMatch(
      /\*\*Marketing copy:\*\*.*ads, social posts, and campaign headlines/i,
    );
    expect(body).toMatch(/alt text/);
    expect(body).toMatch(/translated/);
  });

  // @req FR:agents/content-strategist/agent.write
  it("can edit the files that hold copy", () => {
    expect(tools("content-strategist")).toEqual(
      expect.arrayContaining(["Read", "Edit", "Write"]),
    );
  });

  // @req FR:agents/content-strategist/agent.copy-only
  it("changes only copy text", () => {
    expect(body).toMatch(/Change only copy text/);
    expect(tools("content-strategist")).not.toContain("Bash");
  });

  // @req FR:agents/content-strategist/agent.standards
  // @req FR:agents/content-strategist/agent.standards.create
  // @req FR:agents/content-strategist/agent.standards.voice
  // @req FR:agents/content-strategist/agent.standards.terms
  // @req FR:agents/content-strategist/agent.standards.follow
  it("owns and follows content standards with voice, tone, and glossary", () => {
    expect(body).toMatch(
      /write and update the project's content standards in `\.xe\/standards\/content\.md`/,
    );
    expect(body).toMatch(/\*\*Voice and tone:\*\*.*one home for brand voice/);
    expect(body).toMatch(/\*\*Glossary:\*\*/);
    expect(body).toMatch(/Create the file when it does not exist/);
    expect(body).toMatch(/Follow the content standards first/);
  });

  // @req FR:agents/content-strategist/agent.plain-language
  // @req FR:agents/content-strategist/agent.plain-language.principles
  // @req FR:agents/content-strategist/agent.plain-language.reader
  // @req FR:agents/content-strategist/agent.plain-language.words
  // @req FR:agents/content-strategist/agent.plain-language.sentences
  // @req FR:agents/content-strategist/agent.plain-language.order
  it("writes in plain language per ISO 24495-1, not Simplified Technical English", () => {
    expect(body).toMatch(/plain language \(ISO 24495-1\)/);
    expect(body).toMatch(
      /relevant to the reader and easy to find, understand, and act on/,
    );
    expect(body).toMatch(/Talk to the reader as "you"/);
    expect(body).toMatch(/No jargon/);
    expect(body).toMatch(/Define a needed term once/);
    expect(body).toMatch(/short sentences in active voice/);
    expect(body).toMatch(/most important information first/);
    expect(body).not.toMatch(/Simplified Technical English/);
  });

  // @req FR:agents/content-strategist/agent.facts
  it("does not invent facts", () => {
    expect(body).toMatch(/Do not invent product facts/);
  });

  // @req FR:agents/content-strategist/agent.escalate
  // @req FR:agents/content-strategist/agent.handoff
  // @req FR:agents/content-strategist/agent.output
  it("escalates to the creative director, hands code to the engineer, and reports changed files", () => {
    expect(body).toMatch(/`creative-director`/);
    expect(body).toMatch(/`engineer`/);
    expect(body).toMatch(/\*\*Changed files:\*\*/);
    expect(body).toMatch(/\*\*Open questions:\*\*/);
  });
});

describe("product-manager agent", () => {
  const { fields, body } = load("product-manager");

  // @req FR:agents/product-manager/agent.@ai-agent
  it("is published as the product-manager agent", () => {
    expect(fields.get("name")).toBe("product-manager");
  });

  // @req FR:agents/product-manager/agent.scope
  // @req FR:agents/product-manager/agent.scope.vision
  // @req FR:agents/product-manager/agent.scope.specs
  // @req FR:agents/product-manager/agent.scope.priority
  it("leads the product and owns vision, specs, scope, and priority", () => {
    expect(fields.get("description")).toMatch(/^Leads the product/);
    expect(body).toMatch(/write and update `\.xe\/product\.md`/);
    expect(body).toMatch(/spec\.md/);
    expect(body).toMatch(/\*\*Scope and priority:\*\*/);
  });

  // @req FR:agents/product-manager/agent.problem
  // @req FR:agents/product-manager/agent.evidence
  it("starts from the user problem and evidence", () => {
    expect(body).toMatch(
      /State the user problem and the expected outcome before you set scope/,
    );
    expect(body).toMatch(/evidence from users, data, or the market/);
  });

  // @req FR:agents/product-manager/agent.spec-quality
  // @req FR:agents/product-manager/agent.spec-quality.ste
  // @req FR:agents/product-manager/agent.spec-quality.testable
  it("writes specs to the spec rules in Simplified Technical English", () => {
    expect(body).toMatch(/templates\/specs\/spec\.md/);
    expect(body).toMatch(/Simplified Technical English \(ASD-STE100\)/);
    expect(body).toMatch(/behavior that a test can prove/);
  });

  // @req FR:agents/product-manager/agent.workflow
  // @req FR:agents/product-manager/agent.workflow.create
  // @req FR:agents/product-manager/agent.workflow.change
  // @req FR:agents/product-manager/agent.workflow.explore
  it("uses Catalyst workflows", () => {
    expect(body).toMatch(/\/catalyst:create/);
    expect(body).toMatch(/\/catalyst:change/);
    expect(body).toMatch(/\/catalyst:explore/);
  });

  // @req FR:agents/product-manager/agent.accept
  // @req FR:agents/product-manager/agent.accept.verdict
  it("accepts final results against the vision, strategy, and spec", () => {
    expect(body).toMatch(
      /Review the final results of other agents against `\.xe\/product\.md`, the strategy, and the spec/,
    );
    expect(body).toMatch(/\*\*Approve\*\* or \*\*Request changes\*\*/);
  });

  // @req FR:agents/product-manager/agent.handoff
  // @req FR:agents/product-manager/agent.handoff.design
  // @req FR:agents/product-manager/agent.handoff.architecture
  // @req FR:agents/product-manager/agent.handoff.build
  // @req FR:agents/product-manager/agent.output
  it("hands off design, technical design, and code and leads with the decision", () => {
    expect(body).toMatch(/`creative-director`/);
    expect(body).toMatch(/`architect`/);
    expect(body).toMatch(/`engineer`/);
    expect(body).toMatch(/Lead with the decision or verdict/);
  });
});

describe("architect agent", () => {
  const { fields, body } = load("architect");

  // @req FR:agents/architect/agent.@ai-agent
  it("is published as the architect agent", () => {
    expect(fields.get("name")).toBe("architect");
  });

  // @req FR:agents/architect/agent.scope
  // @req FR:agents/architect/agent.scope.structure
  // @req FR:agents/architect/agent.scope.quality
  // @req FR:agents/architect/agent.scope.engineering
  it("owns structure, quality and cost targets, and the engineering docs", () => {
    expect(body).toMatch(/\*\*Structure:\*\*.*boundaries/);
    expect(body).toMatch(
      /security, reliability, performance, scalability, observability, and cost/,
    );
    expect(body).toMatch(
      /write and update `\.xe\/architecture\.md` and `\.xe\/engineering\.md`/,
    );
  });

  // @req FR:agents/architect/agent.decisions
  // @req FR:agents/architect/agent.decisions.revisit.evidence
  it("records decisions with rejected options and states evidence for a change", () => {
    expect(body).toMatch(
      /design-decisions\.md`, with the options you rejected/,
    );
    expect(body).toMatch(
      /with the evidence, the old decision, and the new one/,
    );
  });

  // @req FR:agents/architect/agent.value
  // @req FR:agents/architect/agent.value.cost
  // @req FR:agents/architect/agent.value.balance
  // @req FR:agents/architect/agent.value.need
  // @req FR:agents/architect/agent.value.simple
  it("chooses the design with the most value for its total cost", () => {
    expect(body).toMatch(/most value for its total cost/);
    expect(body).toMatch(/cost to build, run, and change it/);
    expect(body).toMatch(/Balance the quality targets against that cost/);
    expect(body).toMatch(
      /When two designs give equal value, choose the simpler one/,
    );
    expect(body).toMatch(
      /Size each quality attribute to the level the product targets/,
    );
  });

  // @req FR:agents/architect/agent.review
  // @req FR:agents/architect/agent.review.findings
  // @req FR:agents/architect/agent.review.verdict
  it("reviews with located findings and a verdict", () => {
    expect(body).toMatch(/location \(file and line\), the risk, and the fix/);
    expect(body).toMatch(/\*\*Approve\*\* or \*\*Request changes\*\*/);
  });

  // @req FR:agents/architect/agent.handoff
  // @req FR:agents/architect/agent.handoff.scope
  // @req FR:agents/architect/agent.handoff.design
  // @req FR:agents/architect/agent.handoff.build
  // @req FR:agents/architect/agent.output
  it("hands off scope, design, and implementation", () => {
    expect(body).toMatch(/`product-manager`/);
    expect(body).toMatch(/`creative-director`/);
    expect(body).toMatch(/`engineer`/);
    expect(body).toMatch(/Lead with the decision or verdict/);
  });
});

describe("engineer agent", () => {
  const { fields, body } = load("engineer");

  // @req FR:agents/engineer/agent.@ai-agent
  // @req FR:agents/engineer/agent.scope
  it("is published as the engineer agent and owns code and tests", () => {
    expect(fields.get("name")).toBe("engineer");
    expect(body).toMatch(/\*\*Code:\*\*/);
    expect(body).toMatch(/\*\*Tests:\*\*/);
  });

  // @req FR:agents/engineer/agent.spec-first
  // @req FR:agents/engineer/agent.spec-first.update
  // @req FR:agents/engineer/agent.spec-first.scope
  // @req FR:agents/engineer/agent.process
  // @req FR:agents/engineer/agent.conventions
  it("works spec first, to the process and conventions", () => {
    expect(body).toMatch(
      /Read the feature spec before you change feature code/,
    );
    expect(body).toMatch(
      /When an agreed change alters behavior, update the spec to match before the code/,
    );
    expect(body).toMatch(
      /Send new or changed scope to the `product-manager` agent/,
    );
    expect(body).toMatch(/`\.xe\/process\/development\.md`/);
    expect(body).toMatch(/`\.xe\/architecture\.md`, `\.xe\/engineering\.md`/);
  });

  // @req FR:agents/engineer/agent.test-driven
  // @req FR:agents/engineer/agent.test-driven.bug
  // @req FR:agents/engineer/agent.test-driven.fix
  // @req FR:agents/engineer/agent.traceability
  it("works test first and links requirements", () => {
    expect(body).toMatch(
      /Work test first: write a test that fails without the change/,
    );
    expect(body).toMatch(/To fix a bug, run `\/catalyst:fix`/);
    expect(body).toMatch(
      /Reproduce the bug with a failing test before you fix it/,
    );
    expect(body).toMatch(/`@req` annotations/);
  });

  // @req FR:agents/engineer/agent.comments
  // @req FR:agents/engineer/agent.comments.detail
  // @req FR:agents/engineer/agent.comments.ste
  it("links requirements instead of restating them in comments", () => {
    expect(body).toMatch(
      /Use an `@req` link instead of a comment that restates the requirement/,
    );
    expect(body).toMatch(
      /Add a comment only to explain how or why the code works/,
    );
    expect(body).toMatch(/Simplified Technical English \(ASD-STE100\)/);
  });

  // @req FR:agents/engineer/agent.handoff
  // @req FR:agents/engineer/agent.handoff.scope
  // @req FR:agents/engineer/agent.handoff.design
  // @req FR:agents/engineer/agent.handoff.copy
  // @req FR:agents/engineer/agent.handoff.architecture
  // @req FR:agents/engineer/agent.output
  it("hands off scope, design, copy, and architecture", () => {
    for (const agent of [
      "product-manager",
      "creative-director",
      "content-strategist",
      "architect",
    ]) {
      expect(body).toMatch(new RegExp(`\`${agent}\``));
    }
    expect(body).toMatch(
      /changed files, the test results, the open questions, and \*\*Handoffs:\*\*/,
    );
  });
});
