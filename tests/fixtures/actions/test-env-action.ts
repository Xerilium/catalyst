import type { PlaybookAction, PlaybookActionResult, PlaybookActionDependencies } from '@playbooks/types';

/**
 * Test fixture: Action with environment variable dependency
 */
export class TestEnvAction implements PlaybookAction<Record<string, unknown>> {
  static readonly dependencies: PlaybookActionDependencies = {
    env: [{
      name: 'GITHUB_TOKEN',
      required: true,
      description: 'GitHub API authentication token'
    }]
  };

  async execute(config: Record<string, unknown>): Promise<PlaybookActionResult> {
    return {
      code: 'Success',
      value: 'test-output'
    };
  }
}
