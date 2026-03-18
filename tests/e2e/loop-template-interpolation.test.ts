/**
 * Integration test for loop variable template interpolation
 * 
 * Tests that loop variables (item, index) are available in templates
 * within for-each loops after the template interpolation timing fix.
 * 
 * @group e2e
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Loop Variable Template Interpolation', () => {
  const testDir = '/tmp/catalyst-loop-tests';
  
  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should interpolate loop variables in log messages', async () => {
    const playbookPath = path.join(testDir, 'test-loop-log.yaml');
    const playbookContent = 'name: test-loop-log\n' +
      'description: Test loop vars in log messages\n' +
      'owner: test\n' +
      'steps:\n' +
      '  - for-each:\n' +
      '      item: fruit\n' +
      '      in: ["apple", "banana"]\n' +
      '      index: idx\n' +
      '      steps:\n' +
      '        - log-info:\n' +
      '            message: "Fruit at {{idx}}: {{fruit}}"\n' +
      '            action: test\n' +
      '  - return:\n' +
      '      done: true\n';
    
    fs.writeFileSync(playbookPath, playbookContent);
    
    const { stdout } = await execAsync('node dist/bin/catalyst.js run ' + playbookPath);
    
    expect(stdout).toContain('Fruit at 0: apple');
    expect(stdout).toContain('Fruit at 1: banana');
  });

  it('should interpolate item variable in conditional', async () => {
    const playbookPath = path.join(testDir, 'test-loop-if.yaml');
    const playbookContent = 'name: test-loop-if\n' +
      'description: Test loop vars in conditionals\n' +
      'owner: test\n' +
      'steps:\n' +
      '  - for-each:\n' +
      '      item: value\n' +
      '      in: ["skip", "match", "skip"]\n' +
      '      steps:\n' +
      '        - if: \'${{ get("value") === "match" }}\'\n' +
      '          then:\n' +
      '            - log-info:\n' +
      '                message: "Found: {{value}}"\n' +
      '                action: test\n' +
      '  - return:\n' +
      '      done: true\n';
    
    fs.writeFileSync(playbookPath, playbookContent);
    
    const { stdout } = await execAsync('node dist/bin/catalyst.js run ' + playbookPath);
    
    expect(stdout).toContain('Found: match');
    expect(stdout).not.toContain('Found: skip');
  });
});
