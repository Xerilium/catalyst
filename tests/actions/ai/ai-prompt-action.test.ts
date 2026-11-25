/**
 * Tests for AIPromptAction
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AIPromptAction } from '@playbooks/actions/ai/ai-prompt-action';
import { MockAIProvider } from '@ai/providers/mock-provider';
import { getMockProvider, resetMockProvider } from '@ai/providers/factory';
import { CatalystError } from '@core/errors';
import type { AIPromptConfig } from '@playbooks/actions/ai/types';

/** Read the temp file path for a context entry from the prompt the provider got. */
function contextFilePath(prompt: string, name: string): string {
  const line = prompt.split('\n').find((l) => l.startsWith(`- ${name}: `));
  if (!line) {
    throw new Error(`No context entry for ${name}`);
  }
  return line.slice(`- ${name}: `.length);
}

/**
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
 * @req NFR:playbook-actions-ai/perf.instantiation
 * @req NFR:playbook-actions-ai/perf.overhead
 */
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

    // @req FR:ai-provider/factory.create
    // @req FR:playbook-actions-ai/ai-prompt.validation.provider-unknown
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

    // @req FR:playbook-actions-ai/ai-prompt.context.files
    it('should clean up context files after execution', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock',
        context: {
          'test-file': 'content'
        }
      };

      await action.execute(config);

      const contextFile = contextFilePath(mockProvider.getCalls()[0].prompt, 'test-file');
      await expect(fs.access(contextFile)).rejects.toThrow();
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.return
  describe('return value extraction', () => {
    it('should return response content when no return specified', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock'
        // No return specified — response content is used directly
      };

      const result = await action.execute(config);

      expect(result.value).toBe('Mock response');
    });

    it('should include headless return instruction for headless provider', async () => {
      // Mock provider is headless — should get output-only instruction, not file path
      const config: AIPromptConfig = {
        prompt: 'Generate something.',
        provider: 'mock',
        return: 'A JSON object with results.'
      };

      await action.execute(config);

      const calls = mockProvider.getCalls();
      expect(calls[0].prompt).toContain('## Required Output');
      expect(calls[0].prompt).toContain('A JSON object with results.');
      expect(calls[0].prompt).toContain('Respond with ONLY the requested output');
      expect(calls[0].prompt).not.toContain('Write your output to:');
    });

    it('should use response content as return value for headless provider', async () => {
      const config: AIPromptConfig = {
        prompt: 'Test',
        provider: 'mock',
        return: 'Expected output'
      };

      // Mock provider is headless — response.content is the return value
      const result = await action.execute(config);
      expect(result.value).toBe('Mock response');
    });

    // @req FR:playbook-actions-ai/ai-prompt.return.file
    it('should return file contents when output file exists', async () => {
      // An interactive provider writes the output to the file named in the prompt.
      // The mock provider is a shared singleton, so restore it after this test.
      const capabilities = mockProvider.capabilities;
      Object.defineProperty(mockProvider, 'capabilities', { value: [], configurable: true });
      let outputFile = '';
      const execute = jest.spyOn(mockProvider, 'execute').mockImplementation(async (request) => {
        outputFile = request.prompt.match(/Write your output to: (.+)$/m)![1].trim();
        await fs.writeFile(outputFile, 'Generated output content');
        return { content: 'Chat reply', model: 'mock-model' };
      });

      try {
        const result = await action.execute({ prompt: 'Test', provider: 'mock', return: 'A summary.' });

        expect(result.value).toBe('Generated output content');
        expect(path.dirname(outputFile)).toBe(os.tmpdir());
        await expect(fs.access(outputFile)).rejects.toThrow();
      } finally {
        execute.mockRestore();
        Object.defineProperty(mockProvider, 'capabilities', { value: capabilities, configurable: true });
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

      await expect(action.execute(config)).rejects.toThrow('Provider error');

      const contextFile = contextFilePath(mockProvider.getCalls()[0].prompt, 'file');
      await expect(fs.access(contextFile)).rejects.toThrow();
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
