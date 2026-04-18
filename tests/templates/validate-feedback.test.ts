import fs from 'fs';
import path from 'path';

describe('feedback.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/feedback.md');

  // @req FR:feature-context/feedback.template
  it('should exist at the conventional template path', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
  });
});

describe('feedback.md instance validation', () => {
  const featuresDir = path.join(__dirname, '../../.xe/features');
  const getFeedbackFiles = () => {
    const features = fs.readdirSync(featuresDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    return features
      .map(f => ({ feature: f, path: path.join(featuresDir, f, 'feedback.md') }))
      .filter(({ path: p }) => fs.existsSync(p));
  };

  // @req FR:feature-context/feedback.location
  it('should store feedback.md at the conventional path when present', () => {
    expect(getFeedbackFiles().length).toBeGreaterThan(0);
  });

  // @req FR:feature-context/feedback.scope
  it('should not contain FR definitions', () => {
    for (const { path: p } of getFeedbackFiles()) {
      const fbContent = fs.readFileSync(p, 'utf-8');
      expect(fbContent).not.toMatch(/^- \*\*FR:/m);
    }
  });

  // @req FR:feature-context/feedback.format
  it('should group items under H2 headings', () => {
    for (const { path: p } of getFeedbackFiles()) {
      const fbContent = fs.readFileSync(p, 'utf-8');
      const sections = fbContent.split(/^## /m).slice(1);
      expect(sections.length).toBeGreaterThan(0);
    }
  });
});
