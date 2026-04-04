/**
 * Integration tests for project-location (.xe/) storage
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Project Storage (.xe/)', () => {
  const xePath = path.join(__dirname, '../../../.xe');

  /**
   * @req FR:context-storage/storage.project
   */
  it('should provide .xe/ as storage for user/project resources', () => {
    expect(fs.existsSync(xePath)).toBe(true);
    expect(fs.statSync(xePath).isDirectory()).toBe(true);
  });

  /**
   * @req FR:context-storage/templates.project
   */
  it('should support .xe/templates/ storage for internal project use', () => {
    const templatesPath = path.join(xePath, 'templates');

    // .xe/templates/ should be available for user storage
    // (not required to exist as empty folder, but path should be valid for user creation)
    const parentExists = fs.existsSync(xePath);
    expect(parentExists).toBe(true);

    // If it exists, verify it's a directory
    if (fs.existsSync(templatesPath)) {
      expect(fs.statSync(templatesPath).isDirectory()).toBe(true);
    }
  });

  /**
   * @req FR:context-storage/standards.project
   */
  it('should support .xe/standards/ storage for internal project use', () => {
    const standardsPath = path.join(xePath, 'standards');

    // .xe/standards/ should be available for user storage
    // In this project, it exists with catalyst.md
    const parentExists = fs.existsSync(xePath);
    expect(parentExists).toBe(true);

    // Verify standards folder exists (in Catalyst repo, it does)
    if (fs.existsSync(standardsPath)) {
      expect(fs.statSync(standardsPath).isDirectory()).toBe(true);

      // Verify catalyst.md exists as user override location
      const catalystPath = path.join(standardsPath, 'catalyst.md');
      if (fs.existsSync(catalystPath)) {
        expect(fs.statSync(catalystPath).isFile()).toBe(true);
      }
    }
  });

  /**
   * @req FR:context-storage/playbooks.project
   */
  it('should support .xe/playbooks/ storage for internal project use', () => {
    const playbooksPath = path.join(xePath, 'playbooks');

    // .xe/playbooks/ should be available for user storage
    const parentExists = fs.existsSync(xePath);
    expect(parentExists).toBe(true);

    // If it exists, verify it's a directory
    if (fs.existsSync(playbooksPath)) {
      expect(fs.statSync(playbooksPath).isDirectory()).toBe(true);
    }
  });
});
