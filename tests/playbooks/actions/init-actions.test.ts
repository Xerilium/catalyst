import fs from 'fs';
import path from 'path';

const actionsDir = path.join(__dirname, '../../../src/resources/playbooks/actions');

describe('init-interview.md action validation', () => {
  const actionPath = path.join(actionsDir, 'init-interview.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(actionPath, 'utf-8');
  });

  // @req FR:init-workflow/workflow.scope.research
  // @req FR:init-workflow/workflow.scope.interview
  it('should exist at the required path', () => {
    expect(fs.existsSync(actionPath)).toBe(true);
  });

  // @req NFR:workflow-context/authoring.distilled-writing
  it('should reference Distilled Excellence before the Instructions section', () => {
    const beforeInstructions = content.split(/^## Instructions/m)[0] || '';
    expect(beforeInstructions).toMatch(/\*\*Distilled Excellence\*\*/);
  });

  // @req FR:init-workflow/workflow.scope.research
  describe('Research step', () => {
    it('should direct AI to inspect repo signals (README, package metadata, source layout) before asking', () => {
      expect(content).toMatch(/README/i);
      expect(content).toMatch(/package|metadata/i);
      expect(content).toMatch(/source|layout|structure/i);
    });
  });

  // @req FR:init-workflow/workflow.scope.interview
  // @req NFR:init-workflow/reliability.informed-judgment
  describe('Interview step', () => {
    it('should require AUQ to present recommended answers, not blank questions', () => {
      expect(content).toMatch(/recommended|approve.*refine|grounded/i);
    });

    it('should invoke AUQ via the action file pattern, not inline', () => {
      expect(content).not.toMatch(/AskUserQuestion/);
      expect(content).toMatch(/Execute @node_modules\/@xerilium\/catalyst\/playbooks\/actions\/auq\.md/);
    });
  });

  // @req FR:init-workflow/workflow.scope.interview.size
  // @req FR:init-workflow/workflow.scope.interview.progress
  describe('Interview size and progress signaling', () => {
    it('should mention the 8-question budget', () => {
      expect(content).toMatch(/8 questions/i);
    });

    it('should require (Qi/n) or (Qi/n+) prefix when interview exceeds 8 questions or budget is expected to grow', () => {
      expect(content).toMatch(/\(Qi\/n\)/);
      expect(content).toMatch(/\(Qi\/n\+\)/);
    });
  });

  // Cover every input field from FR:workflow.input
  describe('Coverage of FR:workflow.input fields', () => {
    const inputFields = [
      /project overview|what the project does/i,
      /goals?/i,
      /technology|tech stack|tech preferences/i,
      /engineering preferences|engineering principles|quality criteria/i,
      /team roles?/i,
      /strategy|POC|mainstream|innovation|platform|enterprise|scale/i,
      /customer journey/i,
      /competitive|competitors/i,
    ];

    inputFields.forEach((pattern) => {
      it(`should cover input matching ${pattern}`, () => {
        expect(content).toMatch(pattern);
      });
    });
  });

  describe('Exit Criteria', () => {
    it('should include an Exit Criteria section', () => {
      expect(content).toMatch(/^## Exit Criteria/m);
    });
  });
});

describe('init-render.md action validation', () => {
  const actionPath = path.join(actionsDir, 'init-render.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(actionPath, 'utf-8');
  });

  // @req FR:init-workflow/workflow.implement
  it('should exist at the required path', () => {
    expect(fs.existsSync(actionPath)).toBe(true);
  });

  // @req NFR:workflow-context/authoring.distilled-writing
  it('should reference Distilled Excellence before the Instructions section', () => {
    const beforeInstructions = content.split(/^## Instructions/m)[0] || '';
    expect(beforeInstructions).toMatch(/\*\*Distilled Excellence\*\*/);
  });

  // @req FR:init-workflow/workflow.implement
  describe('Render behavior', () => {
    it('should direct AI to strip template instruction blocks', () => {
      expect(content).toMatch(/instruction block|\[INSTRUCTIONS\]|strip/i);
    });

    it('should direct AI to replace placeholders', () => {
      expect(content).toMatch(/placeholder|\{[a-z-]+\}/i);
    });
  });

  // @req FR:init-workflow/workflow.output
  // @req FR:product-context/product.location
  // @req FR:product-context/journey.location
  // @req FR:product-context/competitive.location
  // @req FR:engineering-context/eng.location
  // @req FR:engineering-context/arch.location
  // @req FR:engineering-context/dev.output
  describe('Output coverage', () => {
    const expectedOutputs = [
      /\.xe\/product\.md/,
      /\.xe\/customer-journey\.md/,
      /\.xe\/competitive-analysis\.md/,
      /\.xe\/engineering\.md/,
      /\.xe\/architecture\.md/,
      /\.xe\/process\/development\.md/,
    ];

    expectedOutputs.forEach((pattern) => {
      it(`should write output matching ${pattern}`, () => {
        expect(content).toMatch(pattern);
      });
    });
  });

  describe('Exit Criteria', () => {
    it('should include an Exit Criteria section', () => {
      expect(content).toMatch(/^## Exit Criteria/m);
    });
  });
});
