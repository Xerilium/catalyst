import type { PlaybookAction, PlaybookActionResult } from '../../../src/playbooks/scripts/playbooks/types';

/**
 * Test fixture: Action without dependencies
 */
export class TestNoDepsAction implements PlaybookAction<string> {
  async execute(config: string): Promise<PlaybookActionResult> {
    return {
      code: 'Success',
      value: 'test-output'
    };
  }
}
