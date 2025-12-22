/**
 * Template Engine Core
 *
 * Provides secure template interpolation with dual syntax:
 * - {{variable}} for simple string substitution
 * - ${{ expression }} for JavaScript expression evaluation
 *
 * Security features:
 * - Context sanitization (prototype pollution prevention)
 * - Expression sandboxing (no eval/require)
 * - Secret masking (prevent exposure in output/errors)
 * - Path traversal prevention
 * - Expression timeout protection
 */

import { Parser } from 'expr-eval-fork';
import { CatalystError } from '@core/errors';
import { LoggerSingleton, getLogPrefixWidth } from '@core/logging';
import { sanitizeContext } from './sanitizer';
import { SecretManager } from './secret-manager';
import { PathProtocolResolver } from './path-resolver';
import { ModuleLoader } from './module-loader';

/**
 * Template Engine for secure string interpolation and expression evaluation.
 */
export class TemplateEngine {
  private secretManager: SecretManager;
  private pathResolver: PathProtocolResolver;
  private moduleLoader: ModuleLoader;
  private customFunctions: Map<string, Function>;
  private expressionParser: Parser;

  constructor() {
    this.secretManager = new SecretManager();
    this.pathResolver = new PathProtocolResolver();
    this.moduleLoader = new ModuleLoader();
    this.customFunctions = new Map();
    this.expressionParser = new Parser({
      operators: {
        // Allow standard operators
        add: true,
        concatenate: true,
        conditional: true,
        divide: true,
        factorial: true,
        multiply: true,
        power: true,
        remainder: true,
        subtract: true,
        logical: true,
        comparison: true,
        in: true,
        assignment: false // No assignments
      }
    });
  }

  /**
   * Interpolates a template string with the given context.
   *
   * Processing order:
   * 1. Evaluate ${{ expressions }} (with timeout)
   * 2. Replace {{variables}}
   * 3. Resolve path protocols (xe://, catalyst://)
   * 4. Mask secrets in output
   *
   * @param template - Template string with {{}} and/or ${{}} syntax
   * @param context - Context object for variable/expression evaluation
   * @returns Interpolated string with secrets masked
   * @throws CatalystError on syntax errors, undefined variables, or timeouts
   */
  async interpolate(template: string, context: Record<string, any>): Promise<string> {
    try {
      // Sanitize context to prevent security issues
      const safeContext = sanitizeContext(context);

      // Step 1: Evaluate ${{ expressions }}
      let result = await this.evaluateExpressions(template, safeContext);

      // Step 2: Replace {{variables}} and {{protocols}}
      result = await this.interpolateVariablesAndProtocols(result, safeContext);

      // Step 3: Mask secrets in output
      result = this.secretManager.mask(result);

      return result;
    } catch (error: any) {
      // Determine error code
      let code = 'TemplateError';
      if (error.message.includes('InvalidStringTemplate')) code = 'InvalidStringTemplate';
      if (error.message.includes('InvalidExpressionTemplate')) code = 'InvalidExpressionTemplate';
      if (error.message.includes('ExpressionTimeout')) code = 'ExpressionTimeout';
      if (error.message.includes('InvalidProtocol')) code = 'InvalidProtocol';

      // Mask secrets in error messages
      const maskedMessage = this.secretManager.mask(error.message);
      throw new CatalystError(maskedMessage, code, 'Check template syntax and context values', error);
    }
  }

  /**
   * Recursively interpolates all string values in an object.
   *
   * @param obj - Object with string values to interpolate
   * @param context - Context for interpolation
   * @returns New object with interpolated values
   */
  async interpolateObject(
    obj: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Interpolate string values
        result[key] = await this.interpolate(value, context);
      } else if (Array.isArray(value)) {
        // Recursively process arrays
        result[key] = await Promise.all(
          value.map((item) =>
            typeof item === 'string'
              ? this.interpolate(item, context)
              : item !== null && typeof item === 'object'
              ? this.interpolateObject(item, context)
              : item
          )
        );
      } else if (value !== null && typeof value === 'object') {
        // Recursively process nested objects
        result[key] = await this.interpolateObject(value, context);
      } else {
        // Preserve non-string values
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Loads custom functions from a JavaScript module alongside the playbook.
   *
   * @param playbookPath - Path to the playbook file
   * @returns Object with exported functions
   */
  async loadModule(playbookPath: string): Promise<Record<string, Function>> {
    const functions = await this.moduleLoader.loadModule(playbookPath);

    // Register functions for use in expressions
    for (const [name, func] of Object.entries(functions)) {
      this.registerFunction(name, func);
    }

    return functions;
  }

  /**
   * Registers a custom function for use in expressions.
   *
   * @param name - Function name
   * @param func - Function implementation
   */
  registerFunction(name: string, func: Function): void {
    this.customFunctions.set(name, func);
    // Also register with expr-eval-fork parser
    this.expressionParser.functions[name] = func;
  }

  /**
   * Registers a secret for masking.
   *
   * @param name - Secret name (e.g., 'GITHUB_TOKEN')
   * @param value - Secret value to mask
   */
  registerSecret(name: string, value: string): void {
    this.secretManager.register(name, value);
  }

  /**
   * Evaluates ${{ expression }} blocks in the template.
   *
   * CRITICAL: Expressions must contain valid JavaScript only.
   * {{}} syntax is NOT allowed inside ${{}} expressions.
   */
  private async evaluateExpressions(
    template: string,
    context: Record<string, any>
  ): Promise<string> {
    // Regex to find ${{ expression }} blocks
    const expressionRegex = /\$\{\{(.+?)\}\}/gs;

    let result = template;
    const matches = Array.from(template.matchAll(expressionRegex));

    for (const match of matches) {
      const [fullMatch, expression] = match;

      // CRITICAL: Reject {{}} syntax inside ${{}}
      if (expression.includes('{{') || expression.includes('}}')) {
        throw new Error(
          'InvalidExpressionTemplate: {{}} syntax not allowed inside ${{}} expressions'
        );
      }

      try {
        const logger = LoggerSingleton.getInstance();
        logger.debug('TemplateEngine', 'Evaluate', 'Evaluating expression', { expression: expression.trim() });

        // Evaluate expression with timeout protection
        const value = await this.evaluateExpressionWithTimeout(expression.trim(), context);

        logger.trace('TemplateEngine', 'Evaluate', 'Expression result', { expression: expression.trim(), result: value });

        // Replace expression with result
        result = result.replace(fullMatch, String(value));
      } catch (error: any) {
        // Include the expression in the error message for debugging
        const expr = expression.trim();
        const originalError = error.message || String(error);

        // Calculate indent width based on log prefix configuration
        const indentWidth = getLogPrefixWidth('CLI.Main');
        const indent = ' '.repeat(indentWidth);

        // Try to extract position from parse error and show problematic code
        const posMatch = originalError.match(/parse error \[\d+:(\d+)\]/);
        let errorDetail = originalError;
        if (posMatch) {
          // Parser uses 1-indexed columns, convert to 0-indexed for pointer
          const col = parseInt(posMatch[1], 10) - 1;
          // Show the expression with a pointer to where it failed
          const pointer = ' '.repeat(Math.max(0, col)) + '^';
          errorDetail = `${originalError}\n${indent}${expr}\n${indent}${pointer}`;
        }

        throw new Error(`InvalidExpressionTemplate: Failed to evaluate "$\{{ ${expr} }}":\n${indent}${errorDetail}`);
      }
    }

    return result;
  }

  /**
   * Evaluates a single expression with timeout protection.
   */
  private async evaluateExpressionWithTimeout(
    expression: string,
    context: Record<string, any>
  ): Promise<any> {
    const timeout = 10000; // 10 seconds

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('ExpressionTimeout: Expression took too long to evaluate'));
      }, timeout);

      try {
        // Register the get() function temporarily for this evaluation
        const originalGet = this.expressionParser.functions.get;
        this.expressionParser.functions.get = (path: string) => this.getNestedValue(context, path);

        // Parse and evaluate expression
        const parsed = this.expressionParser.parse(expression);
        const result = parsed.evaluate();

        // Restore original get function (if any)
        if (originalGet) {
          this.expressionParser.functions.get = originalGet;
        } else {
          delete this.expressionParser.functions.get;
        }

        clearTimeout(timer);
        resolve(result);
      } catch (error: any) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Interpolates {{variable}} and {{protocol://}} placeholders in the template.
   */
  private async interpolateVariablesAndProtocols(
    template: string,
    context: Record<string, any>
  ): Promise<string> {
    // Validate no unclosed {{
    if (template.includes('{{') && !template.match(/\{\{[^}]*\}\}/)) {
      throw new Error('InvalidStringTemplate: Unclosed {{ bracket');
    }

    // Regex to find {{...}} placeholders
    const regex = /\{\{([^}]+)\}\}/g;
    let result = template;
    const matches = Array.from(template.matchAll(regex));

    for (const match of matches) {
      const [fullMatch, content] = match;
      const trimmedContent = content.trim();

      // Check if this is a protocol reference
      if (trimmedContent.startsWith('xe://') || trimmedContent.startsWith('catalyst://')) {
        try {
          const resolvedPath = await this.pathResolver.resolve(trimmedContent);
          result = result.replace(fullMatch, resolvedPath);
        } catch (error: any) {
          throw new Error(`InvalidProtocol: ${error.message}`);
        }
      } else {
        // Regular variable substitution
        const value = this.getNestedValue(context, trimmedContent);

        if (value === undefined) {
          throw new Error(`InvalidStringTemplate: Variable '${trimmedContent}' is undefined`);
        }

        result = result.replace(fullMatch, String(value));
      }
    }

    return result;
  }

  /**
   * Gets a nested value from an object using dot notation.
   *
   * Example: getNestedValue({ a: { b: 'value' } }, 'a.b') → 'value'
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}
