import type { PlaybookAction, PlaybookActionResult, PlaybookActionDependencies } from '../../../src/playbooks/scripts/playbooks/types';

/**
 * Test fixture: Action with CLI dependency
 */
export class TestBashAction implements PlaybookAction<string> {
  static readonly dependencies: PlaybookActionDependencies = {
    cli: [{
      name: 'bash',
      versionCommand: 'bash --version',
      platforms: ['linux', 'darwin'],
      installDocs: 'https://www.gnu.org/software/bash/'
    }]
  };

  async execute(config: string): Promise<PlaybookActionResult> {
    return {
      code: 'Success',
      value: 'test-output'
    };
  }
}
