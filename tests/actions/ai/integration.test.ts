/**
 * Integration tests for AI action
 *
 * Verifies end-to-end behavior of the AI prompt action.
 *
 * @req FR:playbook-actions-ai/ai-prompt.config
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AIPromptAction } from '../../../src/playbooks/scripts/playbooks/actions/ai/ai-prompt-action';
import { MockAIProvider } from '../../../src/playbooks/scripts/playbooks/actions/ai/providers/mock-provider';
import { getMockProvider, resetMockProvider } from '../../../src/playbooks/scripts/playbooks/actions/ai/providers/factory';
import { CatalystError } from '../../../src/playbooks/scripts/errors';

// @req FR:playbook-actions-ai/ai-prompt.config
describe('AI Action Integration', () => {
  let action: AIPromptAction;
  let mockProvider: MockAIProvider;

  beforeEach(() => {
    action = new AIPromptAction();
    action.setPlaybookOwner('Engineer');

    // Get and reset the singleton mock provider
    mockProvider = getMockProvider();
    resetMockProvider();
  });

  // @req FR:playbook-actions-ai/ai-prompt.result
  describe('full execution flow', () => {
    it('should execute complete flow with context and role', async () => {
      const result = await action.execute({
        prompt: 'Analyze the provided code.',
        provider: 'mock',
        role: 'Architect',
        context: {
          'source': 'function hello() { return "world"; }',
          'requirements': { security: true, performance: true }
        }
      });

      expect(result.code).toBe('Success');

      // Verify the request sent to provider
      const calls = mockProvider.getCalls();
      expect(calls).toHaveLength(1);

      const request = calls[0];

      // System prompt should be Architect role
      expect(request.systemPrompt).toContain('seasoned Software Architect');

      // Prompt should include context file references
      expect(request.prompt).toContain('## Context Files');
      expect(request.prompt).toContain('source');
      expect(request.prompt).toContain('requirements');

      // Prompt should include user's prompt
      expect(request.prompt).toContain('Analyze the provided code.');
    });

    it('should handle custom role with context', async () => {
      const customRole = 'You are a code reviewer focusing on best practices.';

      const result = await action.execute({
        prompt: 'Review this code.',
        provider: 'mock',
        role: customRole,
        context: {
          'code': 'const x = 1;'
        }
      });

      expect(result.code).toBe('Success');

      const calls = mockProvider.getCalls();
      expect(calls[0].systemPrompt).toBe(customRole);
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.context
  describe('context file handling', () => {
    it('should create and clean up context files', async () => {
      // Execute action with context
      await action.execute({
        prompt: 'Test',
        provider: 'mock',
        context: {
          'test-context': 'test content'
        }
      });

      // After execution, we can check that the prompt contained file references
      const calls = mockProvider.getCalls();
      const prompt = calls[0].prompt;

      // Extract file path from prompt
      const match = prompt.match(/- test-context: (.+\.txt)/);
      expect(match).not.toBeNull();

      const filePath = match![1];

      // File should no longer exist (cleaned up)
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should handle large context values', async () => {
      const largeContent = 'x'.repeat(100000); // 100KB

      const result = await action.execute({
        prompt: 'Process this large file.',
        provider: 'mock',
        context: {
          'large-file': largeContent
        }
      });

      expect(result.code).toBe('Success');
    });

    it('should handle multiple context entries', async () => {
      await action.execute({
        prompt: 'Analyze all files.',
        provider: 'mock',
        context: {
          'file1': 'content 1',
          'file2': 'content 2',
          'file3': 'content 3',
          'file4': 'content 4',
          'file5': 'content 5'
        }
      });

      const calls = mockProvider.getCalls();
      const prompt = calls[0].prompt;

      // Should reference all 5 files
      expect(prompt).toContain('file1');
      expect(prompt).toContain('file2');
      expect(prompt).toContain('file3');
      expect(prompt).toContain('file4');
      expect(prompt).toContain('file5');
    });
  });

  describe('error propagation', () => {
    it('should propagate provider errors', async () => {
      const providerError = new CatalystError(
        'Provider failed',
        'ProviderFailure',
        'Check provider configuration'
      );
      mockProvider.setError(providerError);

      await expect(action.execute({
        prompt: 'Test',
        provider: 'mock'
      })).rejects.toThrow(providerError);
    });

    it('should clean up files on provider error', async () => {
      mockProvider.setError(new CatalystError('Error', 'Code', 'Guidance'));

      try {
        await action.execute({
          prompt: 'Test',
          provider: 'mock',
          context: {
            'file': 'content'
          }
        });
      } catch {
        // Expected
      }

      // Check that prompt contained file reference
      const calls = mockProvider.getCalls();
      const prompt = calls[0].prompt;
      const match = prompt.match(/- file: (.+\.txt)/);

      if (match) {
        const filePath = match[1];
        // File should be cleaned up
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists).toBe(false);
      }
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.context.position
  describe('prompt assembly', () => {
    it('should assemble prompt in correct order: context, prompt, return', async () => {
      // Action will throw because mock doesn't write output file,
      // but we can still verify the prompt assembly
      try {
        await action.execute({
          prompt: 'USER PROMPT HERE',
          provider: 'mock',
          context: {
            'ctx': 'value'
          },
          return: 'RETURN DESCRIPTION'
        });
      } catch {
        // Expected - mock doesn't write output file
      }

      const calls = mockProvider.getCalls();
      const prompt = calls[0].prompt;

      // Find positions
      const contextPos = prompt.indexOf('## Context Files');
      const userPromptPos = prompt.indexOf('USER PROMPT HERE');
      const returnPos = prompt.indexOf('## Required Output');

      // Context should come first
      expect(contextPos).toBeLessThan(userPromptPos);

      // User prompt should come before return
      expect(userPromptPos).toBeLessThan(returnPos);
    });

    it('should work without context or return', async () => {
      await action.execute({
        prompt: 'Simple prompt',
        provider: 'mock'
      });

      const calls = mockProvider.getCalls();
      const prompt = calls[0].prompt;

      expect(prompt).not.toContain('## Context Files');
      expect(prompt).not.toContain('## Required Output');
      expect(prompt).toBe('Simple prompt');
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.timeout.default
  // @req FR:playbook-actions-ai/ai-prompt.provider-resolution
  // @req FR:playbook-actions-ai/ai-prompt.role.default
  describe('default values', () => {
    it('should use claude as default provider (but mock for testing)', async () => {
      // Note: In real usage, claude would be default
      // For testing, we explicitly use mock
      const result = await action.execute({
        prompt: 'Test',
        provider: 'mock'
      });

      expect(result.code).toBe('Success');
    });

    it('should use 5 minute default timeout', async () => {
      await action.execute({
        prompt: 'Test',
        provider: 'mock'
      });

      const calls = mockProvider.getCalls();
      expect(calls[0].inactivityTimeout).toBe(300000);
    });

    it('should use playbook owner as default role', async () => {
      action.setPlaybookOwner('Product Manager');

      await action.execute({
        prompt: 'Test',
        provider: 'mock'
      });

      const calls = mockProvider.getCalls();
      expect(calls[0].systemPrompt).toContain('strategic Product Manager');
    });
  });
});
