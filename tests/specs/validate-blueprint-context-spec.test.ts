import fs from 'fs';
import path from 'path';

describe('blueprint-context spec.md validation', () => {
  const specPath = path.join(__dirname, '../../.xe/features/blueprint-context/spec.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(specPath, 'utf-8');
  });

  it('should exist', () => {
    expect(fs.existsSync(specPath)).toBe(true);
  });

  // @req FR:blueprint-context/blueprint.location
  describe('FR:blueprint.location: Artifact location', () => {
    it('should specify .xe/features/blueprint.md as the artifact location', () => {
      expect(content).toMatch(/\.xe\/features\/blueprint\.md/);
    });
  });

  // @req FR:blueprint-context/blueprint.arch
  describe('FR:blueprint.arch: Visual dependency graph by functional area', () => {
    it('should require a visual dependency graph grouped by functional area', () => {
      const fr = content.match(/FR:blueprint\.arch[^\n]*\n[^\n]*/)?.[0] || '';
      expect(fr).toMatch(/visualize/i);
      expect(fr).toMatch(/dependencies/i);
      expect(fr).toMatch(/functional area/i);
    });
  });

  // @req FR:blueprint-context/blueprint.data-model
  describe('FR:blueprint.data-model: Visual entity model', () => {
    it('should require visualization of entities and relationships', () => {
      const fr = content.match(/FR:blueprint\.data-model[^\n]*\n[^\n]*/)?.[0] || '';
      expect(fr).toMatch(/visualize/i);
      expect(fr).toMatch(/entities/i);
      expect(fr).toMatch(/relationships/i);
    });
  });

  // @req FR:blueprint-context/blueprint.roadmap
  describe('FR:blueprint.roadmap: Sequential phases tied to strategy', () => {
    it('should require sequential phases aligned with product strategy', () => {
      const fr = content.match(/FR:blueprint\.roadmap\b[^\n]*\n[^\n]*/)?.[0] || '';
      expect(fr).toMatch(/sequential/i);
      expect(fr).toMatch(/product strategy/i);
    });

    it('should declare upstream @req link to product-context strategy', () => {
      expect(content).toMatch(/@req FR:product-context\/product\.strategy/);
    });
  });

  // @req FR:blueprint-context/blueprint.roadmap.visual
  describe('FR:blueprint.roadmap.visual: Gantt visualization', () => {
    it('should require a gantt chart for implementation order', () => {
      const fr = content.match(/FR:blueprint\.roadmap\.visual[^\n]*\n[^\n]*/)?.[0] || '';
      expect(fr).toMatch(/visualize|visual/i);
      expect(fr).toMatch(/gantt/i);
    });
  });

  // @req FR:blueprint-context/blueprint.roadmap.detail
  describe('FR:blueprint.roadmap.detail: Per-feature actionable detail', () => {
    it('should require id, complexity, purpose, scope, and dependencies', () => {
      const fr = content.match(/FR:blueprint\.roadmap\.detail[^\n]*\n[^\n]*/)?.[0] || '';
      expect(fr).toMatch(/\bid\b/i);
      expect(fr).toMatch(/complexity/i);
      expect(fr).toMatch(/purpose/i);
      expect(fr).toMatch(/scope/i);
      expect(fr).toMatch(/dependencies/i);
    });
  });

  // @req FR:blueprint-context/design-decisions.location
  describe('FR:design-decisions.location: Product-architecture decisions location', () => {
    it('should specify .xe/features/design-decisions.md', () => {
      expect(content).toMatch(/\.xe\/features\/design-decisions\.md/);
    });

    it('should distinguish from per-feature design-decisions.md', () => {
      expect(content).toMatch(/\.xe\/features\/\{feature-id\}\/design-decisions\.md/);
    });
  });

  // @req FR:blueprint-context/design-decisions.scope
  describe('FR:design-decisions.scope: Product-architecture scope', () => {
    it('should distinguish product-architecture decisions from per-feature decisions', () => {
      const fr = content.match(/FR:design-decisions\.scope[^\n]*\n[^\n]*/)?.[0] || '';
      expect(fr).toMatch(/product/i);
      expect(fr).toMatch(/architecture/i);
    });
  });

  // @req FR:blueprint-context/design-decisions.format
  describe('FR:design-decisions.format: Reuses feature-level entry format', () => {
    it('should reference Decision/Date/Why/Rejected/Evidence format', () => {
      const fr = content.match(/FR:design-decisions\.format[^\n]*\n[^\n]*/)?.[0] || '';
      expect(fr).toMatch(/Decision\/Date\/Why\/Rejected\/Evidence/);
    });

    it('should declare upstream @req link to feature-context format', () => {
      expect(content).toMatch(/@req FR:feature-context\/design-decisions\.scope/);
    });
  });

  // @req FR:blueprint-context/design-decisions.template
  describe('FR:design-decisions.template: Template reuse', () => {
    it('should reference src/resources/templates/specs/design-decisions.md', () => {
      const fr = content.match(/FR:design-decisions\.template[^\n]*\n[^\n]*/)?.[0] || '';
      expect(fr).toMatch(/src\/resources\/templates\/specs\/design-decisions\.md/);
    });

    it('should declare upstream @req link to feature-context template', () => {
      expect(content).toMatch(/@req FR:feature-context\/design-decisions\.template/);
    });
  });

  // Spec integrity
  describe('Spec integrity', () => {
    it('should have traceability code disabled (spec-only feature)', () => {
      expect(content).toMatch(/traceability:\s*\n\s*code:\s*disable/);
    });

    it('should declare upstream dependencies, not downstream', () => {
      const frontmatter = content.match(/^---\n[\s\S]*?\n---/)?.[0] || '';
      expect(frontmatter).toMatch(/dependencies:/);
      expect(frontmatter).toMatch(/context-storage/);
      expect(frontmatter).toMatch(/feature-context/);
      expect(frontmatter).toMatch(/product-context/);
      expect(frontmatter).not.toMatch(/blueprint-workflow/);
    });
  });
});
