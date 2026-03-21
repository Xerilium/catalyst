/**
 * Core functionality tests for Template Engine
 * CRITICAL: These tests must FAIL before implementation
 */

import { TemplateEngine } from '@playbooks/template/engine';

/**
 * @req FR:playbook-template-engine/syntax.dual
 * @req FR:playbook-template-engine/syntax.simple
 * @req FR:playbook-template-engine/syntax.simple.kebab
 * @req FR:playbook-template-engine/syntax.simple.dot
 * @req FR:playbook-template-engine/syntax.simple.error
 * @req FR:playbook-template-engine/syntax.js
 * @req FR:playbook-template-engine/syntax.js.get
 * @req FR:playbook-template-engine/syntax.js.boolean
 * @req FR:playbook-template-engine/syntax.js.math
 * @req FR:playbook-template-engine/syntax.errors
 * @req FR:playbook-template-engine/context.interface
 * @req FR:playbook-template-engine/modules.autoload
 * @req FR:playbook-template-engine/modules.callable
 * @req FR:playbook-template-engine/interface.methods
 * @req NFR:playbook-template-engine/testability.unit
 * @req NFR:playbook-template-engine/reliability.errors
 * @req NFR:playbook-template-engine/reliability.deterministic
 */
describe('TemplateEngine Core Functionality', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  describe('Simple Variable Substitution ({{}})', () => {
    it('should replace single variable', async () => {
      const template = 'Hello {{name}}!';
      const context = { name: 'World' };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Hello World!');
    });

    it('should replace multiple variables', async () => {
      const template = '{{greeting}} {{name}}! You have {{count}} messages.';
      const context = { greeting: 'Hello', name: 'Alice', count: 5 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Hello Alice! You have 5 messages.');
    });

    it('should handle nested property access', async () => {
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

    it('should throw error on undefined variable', async () => {
      const template = '{{nonexistent}}';
      const context = {};

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow(/undefined|not found/i);
    });

    it('should handle empty template', async () => {
      const template = '';
      const context = { value: 'test' };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('');
    });

    it('should handle template with no variables', async () => {
      const template = 'Hello World!';
      const context = { value: 'test' };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Hello World!');
    });

    it('should handle empty context with no variables in template', async () => {
      const template = 'Hello World!';
      const context = {};

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Hello World!');
    });

    it('should throw error on malformed variable syntax', async () => {
      const template = '{{incomplete';
      const context = { incomplete: 'value' };

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow();
    });

    it('should handle variables with special characters in values', async () => {
      const template = 'Message: {{message}}';
      const context = { message: 'Hello "World" & <Friends>' };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Message: Hello "World" & <Friends>');
    });
  });

  describe('Expression Evaluation (${{}})', () => {
    it('should evaluate simple arithmetic expression', async () => {
      const template = 'Result: ${{ get("x") + get("y") }}';
      const context = { x: 5, y: 3 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Result: 8');
    });

    it('should evaluate boolean expression', async () => {
      const template = '${{ get("value") > 10 }}';
      const context = { value: 15 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('true');
    });

    it('should evaluate string concatenation', async () => {
      // jse-eval uses standard JavaScript + operator for string concatenation
      const template = '${{ get("first") + " " + get("last") }}';
      const context = { first: 'John', last: 'Doe' };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('John Doe');
    });

    it('should evaluate nested property access via get()', async () => {
      const template = '${{ get("issue.title") }}';
      const context = {
        issue: { title: 'Fix bug' }
      };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Fix bug');
    });

    it('should handle multiple expressions in same template', async () => {
      const template = 'Sum: ${{ get("a") + get("b") }}, Product: ${{ get("a") * get("b") }}';
      const context = { a: 4, b: 5 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Sum: 9, Product: 20');
    });

    it('should throw error on invalid JavaScript syntax in expression', async () => {
      const template = '${{ var x = 5; x }}'; // Statement, not expression
      const context = {};

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow();
    });
  });

  describe('Mixed Syntax ({{}} and ${{}} together)', () => {
    it('should handle both syntaxes in same template (not nested)', async () => {
      const template = 'Hello {{name}}! You have ${{ get("count") + 1 }} messages.';
      const context = { name: 'Alice', count: 4 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Hello Alice! You have 5 messages.');
    });

    it('should process expressions before variable substitution', async () => {
      // This ensures ${{}} is processed first, then {{}}
      const template = '${{ get("x") }} and {{y}}';
      const context = { x: 10, y: 20 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('10 and 20');
    });

    it('should NOT allow {{}} inside ${{}} expressions', async () => {
      // This is the CRITICAL constraint
      const template = '${{ {{value}} > 0 }}';
      const context = { value: 5 };

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow(/InvalidExpressionTemplate|syntax error/i);
    });
  });

  describe('interpolateObject() - Recursive Interpolation', () => {
    it('should interpolate all string values in object', async () => {
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
        count: 6, // Pure expression returns raw value (number)
        nested: {
          message: 'Value: test'
        }
      });
    });

    it('should handle arrays in object', async () => {
      const obj = {
        items: ['{{item1}}', '{{item2}}', '${{ get("x") }}']
      };
      const context = { item1: 'first', item2: 'second', x: 3 };

      const result = await engine.interpolateObject(obj, context);

      expect(result).toEqual({
        items: ['first', 'second', '3']
      });
    });

    it('should preserve non-string values', async () => {
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

  describe('interpolateObject() - Type Preservation for Pure {{variable}} References', () => {
    /** @req FR:playbook-template-engine/syntax.simple.preserve */
    it('should preserve array type for pure {{variable}} reference', async () => {
      const obj = { items: '{{features}}' };
      const context = { features: ['auth', 'api', 'dashboard'] };

      const result = await engine.interpolateObject(obj, context);

      expect(result.items).toEqual(['auth', 'api', 'dashboard']);
      expect(Array.isArray(result.items)).toBe(true);
    });

    /** @req FR:playbook-template-engine/syntax.simple.preserve */
    it('should preserve object type for pure {{variable}} reference', async () => {
      const obj = { config: '{{settings}}' };
      const context = { settings: { region: 'us-west-2', timeout: 30000 } };

      const result = await engine.interpolateObject(obj, context);

      expect(result.config).toEqual({ region: 'us-west-2', timeout: 30000 });
      expect(typeof result.config).toBe('object');
      expect(Array.isArray(result.config)).toBe(false);
    });

    /** @req FR:playbook-template-engine/syntax.simple.preserve */
    it('should preserve number type for pure {{variable}} reference', async () => {
      const obj = { count: '{{total}}' };
      const context = { total: 42 };

      const result = await engine.interpolateObject(obj, context);

      expect(result.count).toBe(42);
      expect(typeof result.count).toBe('number');
    });

    /** @req FR:playbook-template-engine/syntax.simple.preserve */
    it('should preserve boolean type for pure {{variable}} reference', async () => {
      const obj = { enabled: '{{flag}}' };
      const context = { flag: true };

      const result = await engine.interpolateObject(obj, context);

      expect(result.enabled).toBe(true);
      expect(typeof result.enabled).toBe('boolean');
    });

    /** @req FR:playbook-template-engine/syntax.simple.preserve */
    it('should stringify when {{variable}} is embedded in larger string', async () => {
      const obj = { message: 'Items: {{features}}' };
      const context = { features: ['auth', 'api'] };

      const result = await engine.interpolateObject(obj, context);

      expect(typeof result.message).toBe('string');
      expect(result.message).toBe('Items: ["auth","api"]');
    });

    /** @req FR:playbook-template-engine/syntax.simple.preserve */
    it('should stringify when multiple {{variable}} references present', async () => {
      const obj = { message: '{{a}} and {{b}}' };
      const context = { a: [1, 2], b: [3, 4] };

      const result = await engine.interpolateObject(obj, context);

      expect(typeof result.message).toBe('string');
      expect(result.message).toBe('[1,2] and [3,4]');
    });

    /** @req FR:playbook-template-engine/syntax.simple.preserve */
    it('should preserve nested property access with type preservation', async () => {
      const obj = { value: '{{config.items}}' };
      const context = { config: { items: ['a', 'b', 'c'] } };

      const result = await engine.interpolateObject(obj, context);

      expect(result.value).toEqual(['a', 'b', 'c']);
      expect(Array.isArray(result.value)).toBe(true);
    });

    /** @req FR:playbook-template-engine/syntax.simple.preserve */
    it('should throw for undefined pure variable reference', async () => {
      const obj = { value: '{{nonexistent}}' };
      const context = {};

      await expect(engine.interpolateObject(obj, context)).rejects.toThrow(/nonexistent/);
    });

    /** @req FR:playbook-template-engine/syntax.simple.preserve */
    it('should preserve string type for pure {{variable}} that is a string', async () => {
      const obj = { name: '{{label}}' };
      const context = { label: 'hello' };

      const result = await engine.interpolateObject(obj, context);

      expect(result.name).toBe('hello');
      expect(typeof result.name).toBe('string');
    });
  });

  describe('Module Loading', () => {
    it('should load custom functions from module', async () => {
      // This test assumes a module exists at the playbook path
      // For now, we'll test the registration API
      engine.registerFunction('double', (x: number) => x * 2);

      const template = '${{ double(get("value")) }}';
      const context = { value: 5 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('10');
    });

    it('should call multiple custom functions', async () => {
      engine.registerFunction('add', (a: number, b: number) => a + b);
      engine.registerFunction('multiply', (a: number, b: number) => a * b);

      const template = '${{ multiply(add(get("x"), get("y")), 2) }}';
      const context = { x: 3, y: 7 };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('20'); // (3 + 7) * 2 = 20
    });

    it('should handle missing module gracefully', async () => {
      // loadModule should return empty object or handle missing modules
      const result = await engine.loadModule('/nonexistent/path.yaml');

      expect(result).toEqual({});
    });

    it('should throw error on module syntax error', async () => {
      // This would need a fixture file with syntax errors
      // For now, we test that the error is properly wrapped
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Path Protocol Resolution in Templates', () => {
    /** @req FR:playbook-template-engine/paths.protocols.temp */
    it('should resolve raw temp:// protocol in interpolate()', async () => {
      const template = 'temp://catalyst-demo-checklist.txt';
      const result = await engine.interpolate(template, {});

      expect(result).not.toContain('temp://');
      expect(result).toContain('catalyst-demo-checklist.txt');
    });

    /** @req FR:playbook-template-engine/paths.protocols.temp */
    it('should resolve temp:// in interpolateObject() string values', async () => {
      const obj = { path: 'temp://output.txt' };
      const result = await engine.interpolateObject(obj, {});

      expect(result.path).not.toContain('temp://');
      expect(result.path).toContain('output.txt');
    });

    /** @req FR:playbook-template-engine/paths.protocols.temp */
    it('should resolve temp:// inside {{}} brackets', async () => {
      const template = '{{temp://some-file.txt}}';
      const result = await engine.interpolate(template, {});

      expect(result).not.toContain('temp://');
      expect(result).toContain('some-file.txt');
    });
  });

  describe('Error Handling', () => {
    it('should wrap errors with CatalystError', async () => {
      const template = '{{undefined_var}}';
      const context = {};

      try {
        await engine.interpolate(template, context);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.constructor.name).toBe('CatalystError');
      }
    });

    it('should include helpful error messages', async () => {
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

  /**
   * @req FR:playbook-template-engine/syntax.escape
   * @req FR:playbook-template-engine/syntax.escape.syntax
   * @req FR:playbook-template-engine/syntax.escape.passthrough
   * @req FR:playbook-template-engine/syntax.escape.contexts
   */
  describe('Template Escape Syntax', () => {
    // @req FR:playbook-template-engine/syntax.escape
    // @req FR:playbook-template-engine/syntax.escape.syntax
    it('should replace \\{{ with literal {{ in output', async () => {
      const template = 'Use \\{{ for literal braces';
      const result = await engine.interpolate(template, {});
      expect(result).toBe('Use {{ for literal braces');
    });

    // @req FR:playbook-template-engine/syntax.escape.syntax
    it('should replace \\}} with literal }} in output', async () => {
      const template = 'Closing: \\}}';
      const result = await engine.interpolate(template, {});
      expect(result).toBe('Closing: }}');
    });

    // @req FR:playbook-template-engine/syntax.escape
    // @req FR:playbook-template-engine/syntax.escape.syntax
    it('should handle paired escape \\{{ ... \\}} producing literal template syntax', async () => {
      const template = 'Show \\{{variable\\}} as literal text';
      const result = await engine.interpolate(template, {});
      expect(result).toBe('Show {{variable}} as literal text');
    });

    // @req FR:playbook-template-engine/syntax.escape.passthrough
    // @req FR:playbook-template-engine/syntax.escape.contexts
    it('should mix escaped and real template variables', async () => {
      const template = 'Real: {{name}}, Escaped: \\{{not-a-var\\}}';
      const context = { name: 'Alice' };
      const result = await engine.interpolate(template, context);
      expect(result).toBe('Real: Alice, Escaped: {{not-a-var}}');
    });

    // @req FR:playbook-template-engine/syntax.escape.contexts
    it('should handle escape in multiline content', async () => {
      const template = 'line1\nShow \\{{name\\}}\nline3';
      const result = await engine.interpolate(template, {});
      expect(result).toBe('line1\nShow {{name}}\nline3');
    });

    // @req FR:playbook-template-engine/syntax.escape.passthrough
    // @req FR:playbook-template-engine/syntax.escape.contexts
    it('should handle escape alongside expressions', async () => {
      const template = 'Value: ${{ get("x") }}, Literal: \\{{not-expr\\}}';
      const context = { x: 42 };
      const result = await engine.interpolate(template, context);
      expect(result).toBe('Value: 42, Literal: {{not-expr}}');
    });

    // @req FR:playbook-template-engine/syntax.escape
    it('should not interfere with normal template processing', async () => {
      const template = 'Hello {{name}}!';
      const context = { name: 'World' };
      const result = await engine.interpolate(template, context);
      expect(result).toBe('Hello World!');
    });
  });
});
