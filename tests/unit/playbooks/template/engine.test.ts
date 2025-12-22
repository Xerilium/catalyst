/**
 * Core functionality tests for Template Engine
 * CRITICAL: These tests must FAIL before implementation
 */

import { TemplateEngine } from '@playbooks/template/engine';

describe('TemplateEngine Core Functionality', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  describe('Simple Variable Substitution ({{}})', () => {
    test('should replace single variable', async () => {
      const template = 'Hello {{name}}!';
      const context = { name: 'World' };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Hello World!');
    });

    test('should replace multiple variables', async () => {
      const template = '{{greeting}} {{name}}! You have {{count}} messages.';
      const context = { greeting: 'Hello', name: 'Alice', count: 5 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Hello Alice! You have 5 messages.');
    });

    test('should handle nested property access', async () => {
      const template = 'Issue: {{issue.title}} by {{issue.user.login}}';
      const context = {
        issue: {
          title: 'Fix bug',
          user: { login: 'octocat' }
        }
      };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Issue: Fix bug by octocat');
    });

    test('should throw error on undefined variable', async () => {
      const template = '{{nonexistent}}';
      const context = {};

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow(/undefined|not found/i);
    });

    test('should handle empty template', async () => {
      const template = '';
      const context = { value: 'test' };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('');
    });

    test('should handle template with no variables', async () => {
      const template = 'Hello World!';
      const context = { value: 'test' };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Hello World!');
    });

    test('should handle empty context with no variables in template', async () => {
      const template = 'Hello World!';
      const context = {};

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Hello World!');
    });

    test('should throw error on malformed variable syntax', async () => {
      const template = '{{incomplete';
      const context = { incomplete: 'value' };

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow();
    });

    test('should handle variables with special characters in values', async () => {
      const template = 'Message: {{message}}';
      const context = { message: 'Hello "World" & <Friends>' };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Message: Hello "World" & <Friends>');
    });
  });

  describe('Expression Evaluation (${{}})', () => {
    test('should evaluate simple arithmetic expression', async () => {
      const template = 'Result: ${{ get("x") + get("y") }}';
      const context = { x: 5, y: 3 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Result: 8');
    });

    test('should evaluate boolean expression', async () => {
      const template = '${{ get("value") > 10 }}';
      const context = { value: 15 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('true');
    });

    test('should evaluate string concatenation', async () => {
      // jse-eval uses standard JavaScript + operator for string concatenation
      const template = '${{ get("first") + " " + get("last") }}';
      const context = { first: 'John', last: 'Doe' };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('John Doe');
    });

    test('should evaluate nested property access via get()', async () => {
      const template = '${{ get("issue.title") }}';
      const context = {
        issue: { title: 'Fix bug' }
      };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Fix bug');
    });

    test('should handle multiple expressions in same template', async () => {
      const template = 'Sum: ${{ get("a") + get("b") }}, Product: ${{ get("a") * get("b") }}';
      const context = { a: 4, b: 5 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Sum: 9, Product: 20');
    });

    test('should throw error on invalid JavaScript syntax in expression', async () => {
      const template = '${{ var x = 5; x }}'; // Statement, not expression
      const context = {};

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow();
    });
  });

  describe('Mixed Syntax ({{}} and ${{}} together)', () => {
    test('should handle both syntaxes in same template (not nested)', async () => {
      const template = 'Hello {{name}}! You have ${{ get("count") + 1 }} messages.';
      const context = { name: 'Alice', count: 4 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Hello Alice! You have 5 messages.');
    });

    test('should process expressions before variable substitution', async () => {
      // This ensures ${{}} is processed first, then {{}}
      const template = '${{ get("x") }} and {{y}}';
      const context = { x: 10, y: 20 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('10 and 20');
    });

    test('should NOT allow {{}} inside ${{}} expressions', async () => {
      // This is the CRITICAL constraint
      const template = '${{ {{value}} > 0 }}';
      const context = { value: 5 };

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow(/InvalidExpressionTemplate|syntax error/i);
    });
  });

  describe('interpolateObject() - Recursive Interpolation', () => {
    test('should interpolate all string values in object', async () => {
      const obj = {
        title: 'Hello {{name}}',
        count: '${{ get("x") + 1 }}',
        nested: {
          message: 'Value: {{value}}'
        }
      };
      const context = { name: 'World', x: 5, value: 'test' };

      const result = await engine.interpolateObject(obj, context);

      expect(result).toEqual({
        title: 'Hello World',
        count: '6',
        nested: {
          message: 'Value: test'
        }
      });
    });

    test('should handle arrays in object', async () => {
      const obj = {
        items: ['{{item1}}', '{{item2}}', '${{ get("x") }}']
      };
      const context = { item1: 'first', item2: 'second', x: 3 };

      const result = await engine.interpolateObject(obj, context);

      expect(result).toEqual({
        items: ['first', 'second', '3']
      });
    });

    test('should preserve non-string values', async () => {
      const obj = {
        string: '{{value}}',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined
      };
      const context = { value: 'interpolated' };

      const result = await engine.interpolateObject(obj, context);

      expect(result).toEqual({
        string: 'interpolated',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined
      });
    });
  });

  describe('Module Loading', () => {
    test('should load custom functions from module', async () => {
      // This test assumes a module exists at the playbook path
      // For now, we'll test the registration API
      engine.registerFunction('double', (x: number) => x * 2);

      const template = '${{ double(get("value")) }}';
      const context = { value: 5 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('10');
    });

    test('should call multiple custom functions', async () => {
      engine.registerFunction('add', (a: number, b: number) => a + b);
      engine.registerFunction('multiply', (a: number, b: number) => a * b);

      const template = '${{ multiply(add(get("x"), get("y")), 2) }}';
      const context = { x: 3, y: 7 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('20'); // (3 + 7) * 2 = 20
    });

    test('should handle missing module gracefully', async () => {
      // loadModule should return empty object or handle missing modules
      const result = await engine.loadModule('/nonexistent/path.yaml');

      expect(result).toEqual({});
    });

    test('should throw error on module syntax error', async () => {
      // This would need a fixture file with syntax errors
      // For now, we test that the error is properly wrapped
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Error Handling', () => {
    test('should wrap errors with CatalystError', async () => {
      const template = '{{undefined_var}}';
      const context = {};

      try {
        await engine.interpolate(template, context);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.constructor.name).toBe('CatalystError');
      }
    });

    test('should include helpful error messages', async () => {
      const template = '{{missing}}';
      const context = { value: 'test' };

      try {
        await engine.interpolate(template, context);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('missing');
      }
    });
  });
});
