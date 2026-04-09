/**
 * Function Definition Action (Built-in)
 *
 * Privileged action that registers reusable, parameterized step sequences
 * in the execution context. Defined functions become callable as custom
 * action types in subsequent steps within the same playbook scope.
 *
 * @example
 * ```yaml
 * steps:
 *   # Define a function
 *   - function: write-header
 *     inputs:
 *       - string: emoji
 *       - string: title
 *     steps:
 *       - log-info: "{{emoji}} {{title}}"
 *
 *   # Invoke it by name
 *   - write-header:
 *       emoji: "📁"
 *       title: "File Operations"
 * ```
 *
 * @req FR:playbook-engine/actions.builtin.function - Inline function definition
 * @req FR:playbook-engine/actions.builtin.function.interface
 */

import type { PlaybookAction, PlaybookActionResult, PlaybookStep, InputParameter } from '../../types';
import type { PlaybookContext } from '../../types/state';
import { PlaybookProvider } from '../../registry/playbook-provider';
import { CatalystError } from '@core/errors';

/**
 * Definition of a registered function (stored in PlaybookContext.functions)
 *
 * Inputs are stored as parsed InputParameter objects (from playbook-definition).
 * Parsing happens at definition time in FunctionAction.execute() so that
 * FunctionInvocationAction only depends on playbook-definition types, not
 * on YAML format knowledge owned by the playbook-yaml feature.
 */
export interface FunctionDefinition {
  /** Function name in kebab-case */
  name: string;
  /** Parsed input parameters (optional) */
  inputs?: InputParameter[];
  /** Steps to execute when function is invoked */
  steps: PlaybookStep[];
}

/**
 * Configuration for function action (raw YAML form before parsing)
 */
export interface FunctionConfig {
  /** Function name in kebab-case (becomes the callable action type) */
  name: string;
  /** Raw input specs in YAML type-as-key format (optional) */
  inputs?: unknown[];
  /** Steps to execute when function is invoked */
  steps: PlaybookStep[];
}

/**
 * Extend PlaybookContext to include functions registry
 */
declare module '../../types/state' {
  interface PlaybookContext {
    /** Registry of inline function definitions (scoped to current playbook) */
    functions?: Record<string, FunctionDefinition>;
  }
}

/**
 * Parse a raw YAML input spec (`{ string: 'name', required: true }`) into InputParameter.
 *
 * This parsing lives here (at definition time) so that FunctionInvocationAction
 * works only with the InputParameter type from playbook-definition and has no
 * coupling to YAML format conventions owned by the playbook-yaml feature.
 *
 * @req FR:playbook-engine/actions.builtin.function.inputs
 */
function parseRawInputSpec(raw: unknown, functionName: string): InputParameter {
  if (!raw || typeof raw !== 'object') {
    throw new CatalystError(
      `Function "${functionName}" has invalid input spec: must be an object`,
      'FunctionConfigInvalid',
      'Each input should be { string: "name" } or { number: "name" }'
    );
  }

  const spec = raw as Record<string, unknown>;
  const typeKeys: Array<InputParameter['type']> = ['string', 'number', 'boolean'];
  const typeKey = typeKeys.find(t => spec[t] !== undefined);

  if (!typeKey || typeof spec[typeKey] !== 'string') {
    throw new CatalystError(
      `Function "${functionName}" has input spec missing type key`,
      'FunctionConfigInvalid',
      'Each input should be { string: "name" } or { number: "name" }'
    );
  }

  const param: InputParameter = {
    name: spec[typeKey] as string,
    type: typeKey,
    required: (spec.required as boolean) ?? false,
  };

  if (spec.description !== undefined) param.description = spec.description as string;
  if (spec.default !== undefined) param.default = spec.default;
  if (spec.allowed !== undefined) param.allowed = spec.allowed as unknown[];

  return param;
}

/**
 * FunctionAction - Built-in action for inline function definition
 *
 * This action has privileged access to PlaybookContext and can register
 * function definitions that become callable action types.
 *
 * Security: Context is injected via property after instantiation by Engine.
 * External actions cannot spoof this - Engine uses instanceof validation.
 *
 * @req FR:playbook-engine/actions.builtin.function - Inline function definition
 * @req FR:playbook-engine/actions.builtin.function.interface
 */
export class FunctionAction implements PlaybookAction<FunctionConfig> {
  static readonly actionType = 'function';
  static readonly primaryProperty = 'name';

  /**
   * Privileged context access (injected by Engine after instantiation)
   * @internal
   */
  private __context?: PlaybookContext;

  constructor() {
    // No constructor parameters - Engine injects context via __context property
  }

  /**
   * Register a function definition in the execution context
   *
   * Parses raw YAML input specs into InputParameter objects at definition time.
   * This ensures FunctionInvocationAction works with clean typed data.
   *
   * @req FR:playbook-engine/actions.builtin.function.validation - Validate configuration
   * @req FR:playbook-engine/actions.builtin.function.collision - Check naming collisions
   *
   * @param config - Function definition configuration
   * @returns Success result with function name
   * @throws CatalystError if config invalid, name collides, or context not injected
   */
  async execute(config: FunctionConfig): Promise<PlaybookActionResult> {
    // Validate privileged context access
    if (!this.__context) {
      throw new CatalystError(
        'FunctionAction requires privileged context access',
        'MissingPrivilegedAccess',
        'This action must be instantiated by Engine with context injection'
      );
    }

    // Validate config structure
    if (!config || typeof config !== 'object') {
      throw new CatalystError(
        'Function configuration must be an object',
        'FunctionConfigInvalid',
        'Provide config with "name" and "steps" properties'
      );
    }

    // Validate name
    if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
      throw new CatalystError(
        'Function name is required and must be a non-empty string',
        'FunctionConfigInvalid',
        'Provide a valid function name in kebab-case format'
      );
    }

    // Validate steps
    if (!config.steps || !Array.isArray(config.steps) || config.steps.length === 0) {
      throw new CatalystError(
        'Function steps are required and must be a non-empty array',
        'FunctionConfigInvalid',
        'Provide at least one step in the function body'
      );
    }

    const { name, inputs, steps } = config;

    // @req FR:playbook-engine/actions.builtin.function.collision
    // Check collision with built-in action types
    const provider = PlaybookProvider.getInstance();
    if (provider.getActionInfo(name)) {
      throw new CatalystError(
        `Function name "${name}" conflicts with a built-in action type`,
        'FunctionConfigInvalid',
        `Choose a different name — "${name}" is reserved as a built-in action`
      );
    }

    // Check collision with already-registered functions
    if (this.__context.functions?.[name]) {
      throw new CatalystError(
        `Function "${name}" is already defined in this scope`,
        'FunctionConfigInvalid',
        'Each function name must be unique within the defining playbook scope'
      );
    }

    // @req FR:playbook-engine/actions.builtin.function.inputs
    // Parse raw YAML input specs into typed InputParameter objects at definition time
    const parsedInputs = inputs?.map(raw => parseRawInputSpec(raw, name));

    // Register function in context with parsed inputs
    this.__context.functions = this.__context.functions ?? {};
    this.__context.functions[name] = { name, inputs: parsedInputs, steps };

    return {
      code: 'Success',
      message: `Function "${name}" registered`,
      value: { name },
      error: undefined
    };
  }
}
