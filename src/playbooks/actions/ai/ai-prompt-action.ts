/**
 * AI Prompt Action implementation
 *
 * Executes AI prompts using configured providers with role-based system prompts,
 * context file assembly, and return value extraction via output files.
 */

import type {
  PlaybookAction,
  PlaybookActionResult
} from '../../types/action';
import type { AIPromptConfig } from './types';
import type { AIProviderRequest } from '@ai/types';
import { AIPromptErrors } from './errors';
import { LoggerSingleton } from '@core/logging';
import { resolveSystemPrompt } from './roles';
import {
  assembleContext,
  assembleReturnInstruction,
  cleanupTempFiles,
  readOutputFile
} from './context';
import { createAIProvider } from '../../../ai/providers/factory';

// @req FR:playbook-actions-ai/ai-prompt.timeout.default
const DEFAULT_INACTIVITY_TIMEOUT = 300000;

// @req FR:playbook-actions-ai/ai-prompt.provider-resolution
const DEFAULT_PROVIDER = 'claude';

/**
 * AI Prompt Action
 *
 * Executes AI prompts with:
 * - Role-based system prompt generation (known roles or custom)
 * - Context file assembly (writes values to temp files)
 * - Return value extraction via output files
 * - Inactivity-based timeout handling
 *
 * @example
 * ```typescript
 * const action = new AIPromptAction();
 *
 * const result = await action.execute({
 *   prompt: 'Analyze this code for security issues.',
 *   role: 'Architect',
 *   context: { 'source-code': fileContent },
 *   return: 'A list of security vulnerabilities found.'
 * });
 *
 * console.log(result.value); // Contents of output file
 * ```
 *
 * @req FR:playbook-actions-ai/ai-prompt.config
 */
export class AIPromptAction implements PlaybookAction<AIPromptConfig> {
  /** @req FR:playbook-actions-ai/ai-prompt.metadata */
  static readonly actionType = 'ai-prompt';

  /** @req FR:playbook-actions-ai/ai-prompt.metadata */
  readonly primaryProperty = 'prompt';

  /**
   * Playbook owner for default role resolution
   * Set by the engine before execution
   */
  private playbookOwner = 'Engineer';

  /**
   * Set the playbook owner for default role resolution
   *
   * Called by the engine before execute() to provide context.
   *
   * @param owner - Playbook owner property value
   */
  setPlaybookOwner(owner: string): void {
    this.playbookOwner = owner;
  }

  /**
   * Execute the AI prompt action
   *
   * @param config - Action configuration
   * @returns Promise resolving to action result
   *
   * @req FR:playbook-actions-ai/ai-prompt.role
   * @req FR:playbook-actions-ai/ai-prompt.context
   * @req FR:playbook-actions-ai/ai-prompt.context.position
   * @req FR:playbook-actions-ai/ai-prompt.return
   * @req FR:playbook-actions-ai/ai-prompt.result
   * @req FR:playbook-actions-ai/ai-prompt.provider-resolution
   * @req FR:playbook-actions-ai/ai-prompt.timeout.default
   * @req NFR:playbook-actions-ai/reliability.errors
   */
  async execute(config: AIPromptConfig): Promise<PlaybookActionResult> {
    const logger = LoggerSingleton.getInstance();
    this.validateConfig(config);

    const filesToCleanup: string[] = [];

    try {
      // @req FR:playbook-actions-ai/ai-prompt.role
      const systemPrompt = resolveSystemPrompt(config.role, this.playbookOwner);
      logger.debug('AIPromptAction', 'Execute', 'Executing AI prompt', { role: config.role || this.playbookOwner, provider: config.provider || DEFAULT_PROVIDER });
      logger.trace('AIPromptAction', 'Execute', 'System prompt', { systemPrompt: systemPrompt.substring(0, 200) });

      // @req FR:playbook-actions-ai/ai-prompt.context.position
      const { instruction: contextInstruction, cleanupFiles: contextFiles } =
        await assembleContext(config.context);
      filesToCleanup.push(...contextFiles);
      logger.trace('AIPromptAction', 'Execute', 'Context assembled', { contextFileCount: contextFiles.length });

      const { instruction: returnInstruction, outputFile } =
        assembleReturnInstruction(config.return);
      if (outputFile) {
        filesToCleanup.push(outputFile);
      }

      // @req FR:playbook-actions-ai/ai-prompt.context.position
      const prompt = contextInstruction + config.prompt + returnInstruction;
      logger.trace('AIPromptAction', 'Execute', 'Final prompt', { promptLength: prompt.length, hasReturn: !!config.return });

      // @req FR:playbook-actions-ai/ai-prompt.provider-resolution
      const providerName = config.provider || DEFAULT_PROVIDER;
      const provider = createAIProvider(providerName);

      // @req FR:playbook-actions-ai/ai-prompt.timeout.activity
      // @req FR:playbook-actions-ai/ai-prompt.timeout.cancel
      // @req NFR:playbook-actions-ai/reliability.timeout
      const request: AIProviderRequest = {
        model: config.model,
        systemPrompt,
        prompt,
        maxTokens: config.maxTokens,
        inactivityTimeout: config.inactivityTimeout ?? DEFAULT_INACTIVITY_TIMEOUT
      };

      logger.verbose('AIPromptAction', 'Execute', 'Executing provider', { provider: providerName, model: config.model, maxTokens: config.maxTokens });
      await provider.execute(request);

      // @req FR:playbook-actions-ai/ai-prompt.return
      let value: unknown = null;
      if (outputFile) {
        const outputContent = await readOutputFile(outputFile);
        if (outputContent === null) {
          throw AIPromptErrors.outputFileMissing(outputFile);
        }
        value = outputContent;
        logger.trace('AIPromptAction', 'Execute', 'Output file read', { outputFile, contentLength: typeof outputContent === 'string' ? outputContent.length : 0 });
      }

      logger.verbose('AIPromptAction', 'Execute', 'Completed', { provider: providerName, hasOutput: value !== null });

      return {
        code: 'Success',
        message: `AI prompt executed successfully using ${providerName}`,
        value,
        error: undefined
      };
    } catch (error) {
      logger.debug('AIPromptAction', 'Execute', 'Failed', { error: (error as Error).message });
      throw error;
    } finally {
      await cleanupTempFiles(filesToCleanup);
    }
  }

  /**
   * Validate action configuration
   *
   * @param config - Configuration to validate
   * @throws CatalystError if validation fails
   *
   * @req FR:playbook-actions-ai/ai-prompt.validation
   */
  private validateConfig(config: AIPromptConfig): void {
    // @req FR:playbook-actions-ai/ai-prompt.validation.prompt-missing
    if (config.prompt === undefined || config.prompt === null) {
      throw AIPromptErrors.promptMissing();
    }

    // @req FR:playbook-actions-ai/ai-prompt.validation.prompt-empty
    if (typeof config.prompt !== 'string' || config.prompt.trim() === '') {
      throw AIPromptErrors.promptEmpty();
    }

    // @req FR:playbook-actions-ai/ai-prompt.validation.timeout-invalid
    if (
      config.inactivityTimeout !== undefined &&
      (typeof config.inactivityTimeout !== 'number' ||
        config.inactivityTimeout < 0)
    ) {
      throw AIPromptErrors.timeoutInvalid(config.inactivityTimeout as number);
    }
  }
}
