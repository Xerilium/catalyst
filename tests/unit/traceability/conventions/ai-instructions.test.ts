/**
 * Tests verifying AI instructions for requirement conventions exist.
 *
 * These tests ensure the traceability standards documentation contains the
 * guidance that AI needs to follow when working with requirements.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * @req FR:req-traceability/id.immutable
 * @req FR:req-traceability/annotation.placement
 * @req FR:req-traceability/standards
 */
describe('AI Instructions for Requirements', () => {
  const standardsPath = path.join(__dirname, '../../../../src/resources/standards/catalyst-traceability.md');
  let standardsContent: string;

  beforeAll(() => {
    standardsContent = fs.readFileSync(standardsPath, 'utf-8');
  });

  describe('Requirement ID stability', () => {
    /**
     * @req FR:req-traceability/id.immutable
     * @req FR:req-traceability/standards.id-stability
     */
    it('should contain guidance on ID immutability', () => {
      expect(standardsContent).toContain('Requirement ID');
      expect(standardsContent).toContain('immutable');
    });

    /**
     * @req FR:req-traceability/id.immutable
     * @req FR:req-traceability/standards.id-stability
     */
    it('should instruct AI to NEVER change existing IDs', () => {
      expect(standardsContent).toMatch(/NEVER.*change.*requirement ID/i);
    });

    /**
     * @req FR:req-traceability/id.immutable
     * @req FR:req-traceability/standards.id-stability
     */
    it('should instruct AI to preserve IDs when refactoring', () => {
      expect(standardsContent).toMatch(/refactor.*preserve.*ID/i);
    });

    /**
     * @req FR:req-traceability/id.immutable
     * @req FR:req-traceability/standards.id-stability
     */
    it('should instruct AI to use deprecated marker instead of deletion', () => {
      expect(standardsContent).toContain('deprecated');
      expect(standardsContent).toMatch(/obsolete.*deprecated/i);
    });
  });

  describe('Annotation placement', () => {
    /**
     * @req FR:req-traceability/annotation.placement
     * @req FR:req-traceability/standards.placement
     */
    it('should contain guidance on annotation placement', () => {
      expect(standardsContent).toContain('Annotation Placement');
    });

    /**
     * @req FR:req-traceability/annotation.placement
     * @req FR:req-traceability/standards.placement
     */
    it('should instruct AI to place annotations on specific constructs', () => {
      expect(standardsContent).toMatch(/place.*annotations.*function|method|class/i);
    });

    /**
     * @req FR:req-traceability/annotation.placement
     * @req FR:req-traceability/standards.placement
     */
    it('should warn against file-level annotations', () => {
      expect(standardsContent).toMatch(/NOT.*file.*level|file-level cop-out/i);
    });

    /**
     * @req FR:req-traceability/annotation.placement
     * @req FR:req-traceability/standards.placement
     */
    it('should include good and bad examples', () => {
      expect(standardsContent).toContain('Good example');
      expect(standardsContent).toContain('Bad example');
    });

    /**
     * @req FR:req-traceability/annotation.placement
     * @req FR:req-traceability/standards.placement
     */
    it('should instruct AI to prefer leaf requirements over parents', () => {
      expect(standardsContent).toMatch(/leaf.*parent|specific.*requirement/i);
    });
  });

  describe('Dependency link semantics', () => {
    /**
     * @req FR:req-traceability/standards.deps
     */
    it('should document that spec @req links are dependency declarations', () => {
      expect(standardsContent).toMatch(/dependency declaration/i);
    });

    /**
     * @req FR:req-traceability/standards.deps
     */
    it('should clarify dependency links do not count toward coverage', () => {
      expect(standardsContent).toMatch(/NOT.*count.*coverage/i);
    });
  });
});
