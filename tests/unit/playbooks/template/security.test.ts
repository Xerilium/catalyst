/**
 * Security tests for Template Engine
 */

import { TemplateEngine } from '@playbooks/template/engine';
import { SecretManager } from '@playbooks/template/secret-manager';

describe('TemplateEngine Security', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  describe('Context Sanitization', () => {
    /**
     * @req FR:playbook-template-engine/security-sandbox.allowlist.reject
     * @req NFR:playbook-template-engine/security.cve
     * @req NFR:playbook-template-engine/testability.sanitization
     */
    test('should reject function objects in context', async () => {
      const maliciousContext = {
        evilFunc: () => require('child_process').execSync('rm -rf /'),
        normalValue: 'safe'
      };

      await expect(async () => {
        await engine.interpolate('{{normalValue}}', maliciousContext);
      }).rejects.toThrow('Functions not allowed in context');
    });

    /**
     * @req FR:playbook-template-engine/security-sandbox.allowlist.reject
     * @req NFR:playbook-template-engine/testability.sanitization
     */
    test('should reject function objects nested in context', async () => {
      const context = { outer: { inner: () => 'escape' } };

      await expect(engine.interpolate('ok', context)).rejects.toThrow('Functions not allowed in context');
    });

    /**
     * @req FR:playbook-template-engine/security-sandbox.isolation.proto
     * @req NFR:playbook-template-engine/security.prototype
     */
    test('should block __proto__ property access', async () => {
      const context = {
        '__proto__': { polluted: true },
        value: 'test'
      };

      // Should not pollute prototype
      await engine.interpolate('{{value}}', context);
      expect(({}as any).polluted).toBeUndefined();
    });

    /**
     * @req FR:playbook-template-engine/security-sandbox.isolation.proto
     * @req NFR:playbook-template-engine/security.prototype
     */
    test('should block constructor property access', async () => {
      const context = {
        'constructor': { polluted: true },
        value: 'test'
      };

      await engine.interpolate('{{value}}', context);
      expect(({}as any).constructor.polluted).toBeUndefined();
    });

    /**
     * @req FR:playbook-template-engine/security-sandbox.isolation.proto
     * @req NFR:playbook-template-engine/security.prototype
     */
    test('should block prototype property access', async () => {
      const context = {
        'prototype': { polluted: true },
        value: 'test'
      };

      await engine.interpolate('{{value}}', context);
      expect(Object.prototype).not.toHaveProperty('polluted');
    });

    /**
     * @req FR:playbook-template-engine/security-sandbox.isolation.proto
     * @req NFR:playbook-template-engine/security.sandbox
     */
    test('should reject __proto__ access in expressions', async () => {
      await expect(engine.interpolate("${{ get('x').__proto__ }}", { x: 'a' })).rejects.toThrow(
        /InvalidExpressionTemplate/
      );
    });
  });

  describe('Expression Injection Prevention', () => {
    /**
     * @req FR:playbook-template-engine/security-sandbox.isolation.eval
     * @req NFR:playbook-template-engine/testability.security
     */
    test('should reject eval() calls in expressions', async () => {
      const template = "${{ eval('1 + 1') }}";
      const context = {};

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow();
    });

    /**
     * @req FR:playbook-template-engine/security-sandbox.isolation.eval
     * @req NFR:playbook-template-engine/security.sandbox
     */
    test.each([
      "Function('return process')()",
      "constructor.constructor('return process')()",
      "get('x').constructor.constructor('return process')()",
    ])('should reject code construction via %s', async (expression) => {
      await expect(engine.interpolate(`\${{ ${expression} }}`, { x: 'a' })).rejects.toThrow(
        /InvalidExpressionTemplate/
      );
    });

    /**
     * @req FR:playbook-template-engine/security-sandbox.isolation.nodejs
     * @req NFR:playbook-template-engine/testability.security
     */
    test('should reject require() calls in expressions', async () => {
      const template = "${{ require('fs').readFileSync('/etc/passwd') }}";
      const context = {};

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow();
    });

    /**
     * @req FR:playbook-template-engine/security-sandbox.isolation.nodejs
     * @req NFR:playbook-template-engine/security.sandbox
     */
    test('should reject process access in expressions', async () => {
      await expect(engine.interpolate('${{ process.env }}', {})).rejects.toThrow(/InvalidExpressionTemplate/);
    });

    /**
     * @req FR:playbook-template-engine/security-sandbox.isolation.globals
     * @req NFR:playbook-template-engine/security.sandbox
     */
    test.each(['globalThis', 'global', 'window'])('should not expose %s to expressions', async (name) => {
      const result = await engine.interpolate(`\${{ ${name} }}`, {});

      expect(result).toBe('undefined');
    });

    /**
     * @req FR:playbook-template-engine/syntax.js.valid
     */
    test('should reject {{}} syntax inside ${{}} expressions', async () => {
      // CRITICAL: This must fail - {{}} is NOT allowed inside ${{}}
      const template = "${{ {{variable}} > 0 }}";
      const context = { variable: 5 };

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow(/InvalidExpressionTemplate|syntax error/i);
    });

    /**
     * @req FR:playbook-template-engine/syntax.js.valid
     */
    test('should only allow valid JavaScript in ${{}} expressions', async () => {
      const invalidTemplates = [
        "${{ {{x}} }}",           // Double braces
        "${{ var x = 5; x }}",    // Statement, not expression
        "${{ if (true) 1 }}",     // Statement
        "${{ for (;;) {} }}"      // Statement
      ];

      for (const template of invalidTemplates) {
        await expect(async () => {
          await engine.interpolate(template, { x: 1 });
        }).rejects.toThrow();
      }
    });
  });

  describe('Function Allow-listing', () => {
    /**
     * @req FR:playbook-template-engine/security-sandbox.allowlist.explicit
     */
    test('should reject calls to functions that are not registered', async () => {
      await expect(engine.interpolate('${{ notRegistered(1) }}', {})).rejects.toThrow(
        /InvalidExpressionTemplate/
      );
    });

    /**
     * @req FR:playbook-template-engine/security-sandbox.allowlist.explicit
     * @req FR:playbook-template-engine/security-sandbox.allowlist.custom
     */
    test('should allow calls to explicitly registered functions', async () => {
      engine.registerFunction('double', (n: number) => n * 2);

      const result = await engine.interpolate("${{ double(get('n')) }}", { n: 21 });

      expect(result).toBe('42');
    });
  });

  describe('Secret Masking', () => {
    /**
     * @req FR:playbook-template-engine/security-secrets.masking
     * @req NFR:playbook-template-engine/security.masking
     */
    test('should mask secrets in interpolated output', async () => {
      engine.registerSecret('GITHUB_TOKEN', 'ghp_secretvalue123');

      const template = 'Token: {{token}}';
      const context = { token: 'ghp_secretvalue123' };

      const result = await engine.interpolate(template, context);

      expect(result).toBe('Token: [SECRET:GITHUB_TOKEN]');
      expect(result).not.toContain('ghp_secretvalue123');
    });

    /**
     * @req FR:playbook-template-engine/security-secrets.masking.errors
     * @req NFR:playbook-template-engine/security.masking
     */
    test('should mask secrets in error messages', async () => {
      engine.registerSecret('API_KEY', 'secret_key_abc123');

      await expect(engine.interpolate('{{secret_key_abc123}}', {})).rejects.toThrow(
        "Variable '[SECRET:API_KEY]' is undefined"
      );
    });

    /**
     * @req FR:playbook-template-engine/security-secrets.masking
     * @req NFR:playbook-template-engine/testability.secrets
     */
    test('should mask multiple secrets correctly', async () => {
      engine.registerSecret('TOKEN_1', 'token1value');
      engine.registerSecret('TOKEN_2', 'token2value');

      const template = '{{value}}';
      const context = { value: 'token1value and token2value' };

      const result = await engine.interpolate(template, context);

      expect(result).toContain('[SECRET:TOKEN_1]');
      expect(result).toContain('[SECRET:TOKEN_2]');
      expect(result).not.toContain('token1value');
      expect(result).not.toContain('token2value');
    });
  });

  describe('SecretManager', () => {
    let secrets: SecretManager;

    beforeEach(() => {
      secrets = new SecretManager();
    });

    /**
     * @req FR:playbook-template-engine/security-secrets.interface.register
     * @req FR:playbook-template-engine/security-secrets.interface.resolve
     * @req NFR:playbook-template-engine/testability.secrets
     */
    test('should resolve a registered secret by name', () => {
      secrets.register('TOKEN', 'abc');

      expect(secrets.resolve('TOKEN')).toBe('abc');
    });

    /**
     * @req FR:playbook-template-engine/security-secrets.interface.resolve
     * @req NFR:playbook-template-engine/testability.secrets
     */
    test('should throw when resolving a secret that is not registered', () => {
      let error: unknown;
      try {
        secrets.resolve('MISSING');
      } catch (e) {
        error = e;
      }

      expect(error).toMatchObject({ code: 'SecretNotFound' });
    });

    /**
     * @req FR:playbook-template-engine/security-secrets.interface.mask
     * @req NFR:playbook-template-engine/testability.secrets
     */
    test('should replace every occurrence of a secret with its placeholder', () => {
      secrets.register('TOKEN', 'abc');

      expect(secrets.mask('abc-abc')).toBe('[SECRET:TOKEN]-[SECRET:TOKEN]');
    });

    /**
     * @req FR:playbook-template-engine/security-secrets.interface.mask
     * @req NFR:playbook-template-engine/testability.secrets
     */
    test('should mask the longest secret first when secrets overlap', () => {
      secrets.register('SHORT', 'abc');
      secrets.register('LONG', 'abcdef');

      expect(secrets.mask('abcdef')).toBe('[SECRET:LONG]');
    });

    /**
     * @req FR:playbook-template-engine/security-secrets.interface.mask
     * @req NFR:playbook-template-engine/testability.secrets
     */
    test('should leave text unchanged for an empty secret value', () => {
      secrets.register('EMPTY', '');

      expect(secrets.mask('plain text')).toBe('plain text');
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should reject path traversal in xe:// protocol', async () => {
      const template = '{{xe://../../../etc/passwd}}';
      const context = {};

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow(/InvalidProtocol|path traversal/i);
    });

    test('should reject path traversal in catalyst:// protocol', async () => {
      const template = '{{catalyst://../../../etc/passwd}}';
      const context = {};

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow(/InvalidProtocol|path traversal/i);
    });

    test('should reject absolute paths in protocols', async () => {
      const template = '{{xe:///etc/passwd}}';
      const context = {};

      await expect(async () => {
        await engine.interpolate(template, context);
      }).rejects.toThrow(/InvalidProtocol/i);
    });
  });

  describe('Expression Timeout', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    /**
     * @req FR:playbook-template-engine/security-sandbox.timeout.max
     * @req FR:playbook-template-engine/security-sandbox.timeout.error
     * @req NFR:playbook-template-engine/reliability.timeout
     */
    test('should throw ExpressionTimeout after 10 seconds', async () => {
      jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
      let called = false;
      engine.registerFunction('hang', () => {
        called = true;
        return new Promise(() => {});
      });

      let settled = false;
      const promise = engine.interpolate('${{ hang() }}', {});
      promise.catch(() => {}).finally(() => { settled = true; });

      // Wait until the engine calls the function; earlier steps use real I/O.
      for (let i = 0; i < 1_000 && !called; i++) {
        await new Promise((resolve) => setImmediate(resolve));
      }
      expect(called).toBe(true);

      await jest.advanceTimersByTimeAsync(9_999);
      expect(settled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      await expect(promise).rejects.toMatchObject({ code: 'ExpressionTimeout' });
    });
  });
});
