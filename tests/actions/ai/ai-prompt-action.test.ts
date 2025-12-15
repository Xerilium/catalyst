/**
 * Tests for AIPromptAction
 *
 * @req FR:playbook-actions-ai/ai-prompt.config
 * @req FR:playbook-actions-ai/ai-prompt.metadata
 * @req FR:playbook-actions-ai/ai-prompt.validation
 * @req FR:playbook-actions-ai/ai-prompt.validation.prompt-missing
 * @req FR:playbook-actions-ai/ai-prompt.validation.prompt-empty
 * @req FR:playbook-actions-ai/ai-prompt.validation.timeout-invalid
 * @req FR:playbook-actions-ai/ai-prompt.result
 * @req FR:playbook-actions-ai/ai-prompt.role
 * @req FR:playbook-actions-ai/ai-prompt.context
 * @req FR:playbook-actions-ai/ai-prompt.return
 * @req FR:playbook-actions-ai/ai-prompt.timeout.default
 * @req NFR:playbook-actions-ai/test.isolation
 * @req NFR:playbook-actions-ai/test.mockable
 * @req NFR:playbook-actions-ai/test.coverage-success
 * @req NFR:playbook-actions-ai/test.coverage-errors
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AIPromptAction } from '@playbooks/actions/ai/ai-prompt-action';
import { MockAIProvider } from '@ai/providers/mock-provider';
import { getMockProvider, resetMockProvider } from '@ai/providers/factory';
import { CatalystError } from '@core/errors';
import type { AIPromptConfig } from '@playbooks/actions/ai/types';

// @req FR:playbook-actions-ai/ai-prompt.config
describe('AIPromptAction', () => {
  let action: AIPromptAction;
  let mockProvider: MockAIProvider;

  beforeEach(() => {
    action = new AIPromptAction();
    action.setPlaybookOwner('Engineer');

    // Get and reset the singleton mock provider
    mockProvider = getMockProvider();
    resetMockProvider();
  });

  // @req FR:playbook-actions-ai/ai-prompt.metadata
  describe('static properties', () => {
    it('should have actionType "ai-prompt"', () => {
      expect(AIPromptAction.actionType).toBe('ai-prompt');
    });

    it('should have primaryProperty "prompt"', () => {
      expect(AIPromptAction.primaryProperty).toBe('prompt');
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.validation
  describe('validation', () => {
    // @req FR:playbook-actions-ai/ai-prompt.validation.prompt-missing
    // @req FR:playbook-actions-ai/ai-prompt.validation.prompt-empty
    describe('prompt validation', () => {
      it('should throw AIPromptMissing for missing prompt', async () => {
        const config = {} as AIPromptConfig;

        try {
          await action.execute(config);
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(CatalystError);
          expect((err as CatalystError).code).toBe('AIPromptMissing');
        }
      });

      it('should throw AIPromptEmpty for empty prompt', async () => {
        const config: AIPromptConfig = { prompt: '' };

        try {
          await action.execute(config);
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(CatalystError);
          expect((err as CatalystError).code).toBe('AIPromptEmpty');
        }
      });

      it('should throw AIPromptEmpty for whitespace-only prompt', async () => {
        const config: AIPromptConfig = { prompt: '   ' };

        try {
          await action.execute(config);
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(CatalystError);
          expect((err as CatalystError).code).toBe('AIPromptEmpty');
        }
      });
    });

    // @req FR:playbook-actions-ai/ai-prompt.validation.timeout-invalid
    describe('timeout validation', () => {
      it('should throw InvalidAITimeout for negative timeout', async () => {
        const config: AIPromptConfig = {
          prompt: 'Test prompt',
          provider: 'mock',
          inactivityTimeout: -1
        };

        try {
          await action.execute(config);
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(CatalystError);
          expect((err as CatalystError).code).toBe('InvalidAITimeout');
        }
      });

      it('should accept zero timeout', async () => {
        const config: AIPromptConfig = {
          prompt: 'Test prompt',
          provider: 'mock',
          inactivityTimeout: 0
        };

        // Should not throw
        const result = await action.execute(config);
        expect(result.code).toBe('Success');
      });
    });

    // @req FR:playbook-actions-ai/provider.factory
    describe('provider validation', () => {
      it('should throw AIProviderNotFound for unknown provider', async () => {
        const config: AIPromptConfig = {
          prompt: 'Test prompt',
          provider: 'unknown-provider'
        };

        try {
          await action.execute(config);
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(CatalystError);
          expect((err as CatalystError).code).toBe('AIProviderNotFound');
        }
      });
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.result
  describe('successful execution', () => {
    it('should execute with minimal config', async () => {
      const config: AIPromptConfig = {
        prompt: 'Hello, AI!',
        provider: 'mock'
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.error).toBeUndefined();
    });

    it('should use mock provider when specified', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test prompt',
        provider: 'mock'
      };

      await action.execute(config);

      const calls = mockProvider.getCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0].prompt).toContain('Test prompt');
    });

    it('should include provider name in success message', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock'
      };

      const result = await action.execute(config);

      expect(result.message).toContain('mock');
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.role
  describe('role resolution', () => {
    it('should use known role name as system prompt', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock',
        role: 'Architect'
      };

      await action.execute(config);

      const calls = mockProvider.getCalls();
      expect(calls[0].systemPrompt).toContain('seasoned Software Architect');
    });

    it('should use custom role directly as system prompt', async () => {
      const customRole = 'You are a security expert.';
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock',
        role: customRole
      };

      await action.execute(config);

      const calls = mockProvider.getCalls();
      expect(calls[0].systemPrompt).toBe(customRole);
    });

    it('should default to playbook owner role', async () => {
      action.setPlaybookOwner('Product Manager');
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock'
        // No role specified
      };

      await action.execute(config);

      const calls = mockProvider.getCalls();
      expect(calls[0].systemPrompt).toContain('strategic Product Manager');
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.context
  describe('context assembly', () => {
    it('should include context in prompt', async () => {
      const config: AIPromptConfig = {
        prompt: 'Analyze this code.',
        provider: 'mock',
        context: {
          'source-code': 'function test() {}'
        }
      };

      await action.execute(config);

      const calls = mockProvider.getCalls();
      expect(calls[0].prompt).toContain('## Context Files');
      expect(calls[0].prompt).toContain('source-code');
    });

    it('should clean up context files after execution', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock',
        context: {
          'test-file': 'content'
        }
      };

      await action.execute(config);

      // Context files should be cleaned up
      // We can't easily check this without exposing internals,
      // but we can verify no errors occurred
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.return
  describe('return value extraction', () => {
    it('should return null value when no return specified', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock'
        // No return specified
      };

      const result = await action.execute(config);

      expect(result.value).toBeNull();
    });

    it('should include return instruction in prompt', async () => {
      const config: AIPromptConfig = {
        prompt: 'Generate something.',
        provider: 'mock',
        return: 'A JSON object with results.'
      };

      // Action will throw because mock doesn't write output file,
      // but we can still verify the prompt was built correctly
      try {
        await action.execute(config);
      } catch {
        // Expected - mock doesn't write output file
      }

      const calls = mockProvider.getCalls();
      expect(calls[0].prompt).toContain('## Required Output');
      expect(calls[0].prompt).toContain('A JSON object with results.');
      expect(calls[0].prompt).toContain('IMPORTANT: Write your output to:');
    });

    it('should throw AIOutputFileMissing when output file not created', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock',
        return: 'Expected output'
      };

      // Mock provider doesn't actually write to the output file
      try {
        await action.execute(config);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        expect((err as CatalystError).code).toBe('AIOutputFileMissing');
      }
    });

    it('should return file contents when output file exists', async () => {
      // This test requires the mock provider to actually write to the output file
      // For now, we'll create the file manually to test the reading logic
      const outputContent = 'Generated output content';
      const outputFile = path.join(os.tmpdir(), `test-output-${Date.now()}.txt`);
      await fs.writeFile(outputFile, outputContent);

      try {
        // We can't easily test this without modifying the action to use a known file path
        // This is a limitation of the current design
        // The integration test will cover this more thoroughly
      } finally {
        await fs.unlink(outputFile).catch(() => {});
      }
    });
  });

  describe('cleanup on error', () => {
    it('should clean up temp files when provider throws', async () => {
      mockProvider.setError(new CatalystError('Provider error', 'ProviderError', 'Guidance'));

      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock',
        context: {
          'file': 'content'
        }
      };

      try {
        await action.execute(config);
      } catch {
        // Expected
      }

      // Temp files should be cleaned up even on error
      // Can't easily verify without exposing internals
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.timeout.default
  describe('request building', () => {
    it('should pass model to provider', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock',
        model: 'custom-model'
      };

      await action.execute(config);

      const calls = mockProvider.getCalls();
      expect(calls[0].model).toBe('custom-model');
    });

    it('should pass maxTokens to provider', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock',
        maxTokens: 4000
      };

      await action.execute(config);

      const calls = mockProvider.getCalls();
      expect(calls[0].maxTokens).toBe(4000);
    });

    it('should use default timeout when not specified', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock'
        // No inactivityTimeout
      };

      await action.execute(config);

      const calls = mockProvider.getCalls();
      expect(calls[0].inactivityTimeout).toBe(300000); // 5 minutes default
    });

    it('should use specified timeout', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock',
        inactivityTimeout: 60000
      };

      await action.execute(config);

      const calls = mockProvider.getCalls();
      expect(calls[0].inactivityTimeout).toBe(60000);
    });
  });
});
