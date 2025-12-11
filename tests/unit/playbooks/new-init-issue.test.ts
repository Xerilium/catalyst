/**
 * Unit tests for new-init-issue script
 * Tests the detection of existing product.md file
 */

import * as fs from 'fs';
import * as path from 'path';
import { createInitIssue } from '../../../src/playbooks/scripts/new-init-issue';
import * as github from '../../../src/playbooks/scripts/github';

// Mock the github module functions
jest.mock('../../../src/playbooks/scripts/github', () => ({
  getProjectName: jest.fn(() => 'test-project'),
  isGitHubCliAvailable: jest.fn(() => true),
  findIssue: jest.fn(() => null),
  prepareIssueTemplate: jest.fn(() => 'template content'),
  createGitHubIssue: jest.fn(),
}));

describe('createInitIssue', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: () => string;

  beforeEach(() => {
    // Save original environment and cwd
    originalEnv = { ...process.env };
    originalCwd = process.cwd;
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment and cwd
    process.env = originalEnv;
    Object.defineProperty(process, 'cwd', {
      value: originalCwd,
      configurable: true,
    });
  });

  describe('product.md detection', () => {
    it('should detect product.md using INIT_CWD when available', () => {
      // Setup: Create a temporary directory structure
      const tempDir = '/tmp/test-project-' + Date.now();
      const xeDir = path.join(tempDir, '.xe');
      const productMdPath = path.join(xeDir, 'product.md');

      try {
        // Create the directory and file
        fs.mkdirSync(xeDir, { recursive: true });
        fs.writeFileSync(productMdPath, '# Test Product');

        // Set INIT_CWD to the temp directory (simulating npm install from project root)
        process.env.INIT_CWD = tempDir;

        // Mock process.cwd to return a different directory (simulating running from node_modules)
        Object.defineProperty(process, 'cwd', {
          value: () => '/some/other/path/node_modules/@xerilium/catalyst',
          configurable: true,
        });

        // Call createInitIssue
        createInitIssue();

        // Verify that createGitHubIssue was NOT called (because product.md exists)
        expect(github.createGitHubIssue).not.toHaveBeenCalled();
      } finally {
        // Cleanup
        if (fs.existsSync(productMdPath)) {
          fs.unlinkSync(productMdPath);
        }
        if (fs.existsSync(xeDir)) {
          fs.rmdirSync(xeDir);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });

    it('should fallback to process.cwd when INIT_CWD is not set', () => {
      // Setup: Create a temporary directory structure
      const tempDir = '/tmp/test-project-fallback-' + Date.now();
      const xeDir = path.join(tempDir, '.xe');
      const productMdPath = path.join(xeDir, 'product.md');

      try {
        // Create the directory and file
        fs.mkdirSync(xeDir, { recursive: true });
        fs.writeFileSync(productMdPath, '# Test Product');

        // Don't set INIT_CWD (simulating direct script execution)
        delete process.env.INIT_CWD;

        // Mock process.cwd to return the temp directory
        Object.defineProperty(process, 'cwd', {
          value: () => tempDir,
          configurable: true,
        });

        // Call createInitIssue
        createInitIssue();

        // Verify that createGitHubIssue was NOT called (because product.md exists)
        expect(github.createGitHubIssue).not.toHaveBeenCalled();
      } finally {
        // Cleanup
        if (fs.existsSync(productMdPath)) {
          fs.unlinkSync(productMdPath);
        }
        if (fs.existsSync(xeDir)) {
          fs.rmdirSync(xeDir);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });

    it('should create issue when product.md does not exist', () => {
      // Setup: Use a directory without product.md
      const tempDir = '/tmp/test-project-nofile-' + Date.now();

      try {
        // Create the directory but no .xe/product.md
        fs.mkdirSync(tempDir, { recursive: true });

        // Set INIT_CWD to the temp directory
        process.env.INIT_CWD = tempDir;

        // Call createInitIssue
        createInitIssue();

        // Verify that createGitHubIssue WAS called (because product.md doesn't exist)
        expect(github.createGitHubIssue).toHaveBeenCalledWith(
          '[Catalyst][Init] test-project',
          'template content'
        );
      } finally {
        // Cleanup
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });

    it('should create issue when force flag is true even if product.md exists', () => {
      // Setup: Create a temporary directory structure
      const tempDir = '/tmp/test-project-force-' + Date.now();
      const xeDir = path.join(tempDir, '.xe');
      const productMdPath = path.join(xeDir, 'product.md');

      try {
        // Create the directory and file
        fs.mkdirSync(xeDir, { recursive: true });
        fs.writeFileSync(productMdPath, '# Test Product');

        // Set INIT_CWD to the temp directory
        process.env.INIT_CWD = tempDir;

        // Call createInitIssue with force=true
        createInitIssue(true);

        // Verify that createGitHubIssue WAS called (because force=true)
        expect(github.createGitHubIssue).toHaveBeenCalledWith(
          '[Catalyst][Init] test-project',
          'template content'
        );
      } finally {
        // Cleanup
        if (fs.existsSync(productMdPath)) {
          fs.unlinkSync(productMdPath);
        }
        if (fs.existsSync(xeDir)) {
          fs.rmdirSync(xeDir);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });
  });
});
