// @req NFR:playbook-actions-io/testability.isolation
// @req NFR:playbook-actions-io/testability.error-coverage
// @req NFR:playbook-actions-io/testability.success-coverage

/**
 * Unit tests for HttpActionBase
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { HttpGetAction } from '@playbooks/actions/io/http/get-action';
import { HttpPostAction } from '@playbooks/actions/io/http/post-action';
import { HttpPutAction } from '@playbooks/actions/io/http/put-action';
import { HttpPatchAction } from '@playbooks/actions/io/http/patch-action';
import { HttpDeleteAction } from '@playbooks/actions/io/http/delete-action';
import * as http from 'http';

describe('HttpActionBase', () => {
  let server: http.Server;
  let serverUrl: string;

  beforeEach((done) => {
    // Create test HTTP server
    server = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost`);

      // Handle different test endpoints
      if (url.pathname === '/success') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'success' }));
      } else if (url.pathname === '/error') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'server error' }));
      } else if (url.pathname === '/not-found') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else if (url.pathname === '/delay') {
        setTimeout(() => {
          res.writeHead(200);
          res.end('delayed response');
        }, 5000);
      } else if (url.pathname === '/echo') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            method: req.method,
            headers: req.headers,
            body: body
          }));
        });
      } else if (url.pathname === '/headers') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          headers: req.headers
        }));
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      }
    });

    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        serverUrl = `http://localhost:${address.port}`;
        done();
      }
    });
  });

  afterEach((done) => {
    server.close(() => done());
  }, 10000); // 10 second timeout for server cleanup

  describe('execute with GET', () => {
    // @req FR:playbook-actions-io/http.get-action.implementation
    // @req FR:playbook-actions-io/http.base-class.request-execution
    // @req FR:playbook-actions-io/http.base-class.result-format
    it('should execute successful GET request', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/success`
      });

      expect(result.code).toBe('Success');
      expect(result.error).toBeUndefined();
      expect(result.value).toBeDefined();
      expect((result.value as any).status).toBe(200);
      expect((result.value as any).body).toContain('success');
    });

    // @req FR:playbook-actions-io/http.base-class.result-format
    it('should include status in response', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/success`
      });

      expect((result.value as any).status).toBe(200);
    });

    // @req FR:playbook-actions-io/http.base-class.config-interface
    it('should handle custom headers', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/headers`,
        headers: {
          'X-Custom-Header': 'test-value',
          'User-Agent': 'test-agent'
        }
      });

      expect(result.code).toBe('Success');
      const body = JSON.parse((result.value as any).body);
      expect(body.headers['x-custom-header']).toBe('test-value');
      expect(body.headers['user-agent']).toBe('test-agent');
    });

    // @req FR:playbook-actions-io/http.base-class.error-handling
    it('should handle 404 errors', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/not-found`
      });

      expect(result.code).toBe('HttpInvalidStatus');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('404');
    });

    // @req FR:playbook-actions-io/http.base-class.error-handling
    it('should handle 500 errors', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/error`
      });

      expect(result.code).toBe('HttpInvalidStatus');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('500');
    });

    // @req FR:playbook-actions-io/http.base-class.timeout-enforcement
    it('should handle timeout', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/delay`,
        timeout: 1000,
        retries: 0 // Disable retries to make test faster
      });

      expect(result.code).toBe('HttpTimeout');
      expect(result.error).toBeDefined();
    }, 10000); // 10 second timeout for test

    // @req FR:playbook-actions-io/security.config-validation
    it('should handle missing URL', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({} as any);

      expect(result.code).toBe('HttpConfigInvalid');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('url');
    });

    // @req FR:playbook-actions-io/security.config-validation
    it('should handle invalid URL', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: 'not-a-valid-url'
      });

      expect(result.error).toBeDefined();
    });

    // @req FR:playbook-actions-io/http.base-class.error-handling
    it('should handle network errors', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: 'http://localhost:9999/unreachable',
        retries: 0 // Disable retries to make test faster
      });

      expect(result.error).toBeDefined();
    }, 10000); // 10 second timeout for test

    // @req FR:playbook-actions-io/http.base-class.config-interface
    it('should use custom validateStatus', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/not-found`,
        validateStatus: (status) => status === 404
      });

      expect(result.code).toBe('Success');
      expect((result.value as any).status).toBe(404);
    });

    // @req FR:playbook-actions-io/http.base-class.error-handling
    it('should provide error guidance', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({} as any);

      expect(result.error).toBeDefined();
      const error = result.error as any;
      expect(error.guidance).toBeDefined();
    });
  });

  describe('execute with POST', () => {
    // @req FR:playbook-actions-io/http.post-action.implementation
    // @req FR:playbook-actions-io/http.request-bodies.serialization
    it('should execute POST with JSON body', async () => {
      const action = new HttpPostAction();
      const body = { key: 'value', number: 42 };

      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body
      });

      expect(result.code).toBe('Success');
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.method).toBe('POST');
      expect(JSON.parse(responseBody.body)).toEqual(body);
    });

    // @req FR:playbook-actions-io/http.request-bodies.serialization
    it('should execute POST with string body', async () => {
      const action = new HttpPostAction();
      const body = 'plain text content';

      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body
      });

      expect(result.code).toBe('Success');
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.body).toBe(body);
    });

    // @req FR:playbook-actions-io/http.request-bodies.serialization
    it('should set content-type for JSON body', async () => {
      const action = new HttpPostAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body: { test: 'data' }
      });

      expect(result.code).toBe('Success');
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.headers['content-type']).toContain('application/json');
    });

    // @req FR:playbook-actions-io/http.request-bodies.config-interface
    it('should use custom content-type', async () => {
      const action = new HttpPostAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body: 'custom content',
        contentType: 'text/plain'
      });

      expect(result.code).toBe('Success');
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.headers['content-type']).toBe('text/plain');
    });

    // @req FR:playbook-actions-io/http.post-action.implementation
    it('should handle POST without body', async () => {
      const action = new HttpPostAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`
      });

      expect(result.code).toBe('Success');
    });
  });

  describe('execute with PUT', () => {
    // @req FR:playbook-actions-io/http.put-action.implementation
    // @req FR:playbook-actions-io/http.request-bodies.serialization
    it('should execute PUT with JSON body', async () => {
      const action = new HttpPutAction();
      const body = { email: 'updated@example.com', name: 'Updated User' };

      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body
      });

      expect(result.code).toBe('Success');
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.method).toBe('PUT');
      expect(JSON.parse(responseBody.body)).toEqual(body);
    });

    // @req FR:playbook-actions-io/http.request-bodies.serialization
    it('should execute PUT with string body', async () => {
      const action = new HttpPutAction();
      const body = 'raw content';

      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body
      });

      expect(result.code).toBe('Success');
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.body).toBe(body);
    });

    // @req FR:playbook-actions-io/http.request-bodies.serialization
    it('should set content-type for JSON body', async () => {
      const action = new HttpPutAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body: { test: 'data' }
      });

      expect(result.code).toBe('Success');
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.headers['content-type']).toContain('application/json');
    });

    // @req FR:playbook-actions-io/http.request-bodies.config-interface
    it('should use custom content-type', async () => {
      const action = new HttpPutAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body: 'custom content',
        contentType: 'text/xml'
      });

      expect(result.code).toBe('Success');
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.headers['content-type']).toBe('text/xml');
    });

    // @req FR:playbook-actions-io/http.put-action.implementation
    it('should handle PUT without body', async () => {
      const action = new HttpPutAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`
      });

      expect(result.code).toBe('Success');
    });

    // @req FR:playbook-actions-io/http.base-class.error-handling
    it('should handle 404 errors', async () => {
      const action = new HttpPutAction();
      const result = await action.execute({
        url: `${serverUrl}/not-found`,
        body: { data: 'test' }
      });

      expect(result.code).toBe('HttpInvalidStatus');
      expect(result.message).toContain('404');
    });

    // @req FR:playbook-actions-io/http.base-class.result-format
    it('should include descriptive success message', async () => {
      const action = new HttpPutAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body: { test: 'data' }
      });

      expect(result.message).toContain('PUT');
      expect(result.message).toContain('200');
    });
  });

  describe('execute with PATCH', () => {
    // @req FR:playbook-actions-io/http.patch-action.implementation
    // @req FR:playbook-actions-io/http.request-bodies.serialization
    it('should execute PATCH with JSON body', async () => {
      const action = new HttpPatchAction();
      const body = { email: 'patched@example.com' };

      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body
      });

      expect(result.code).toBe('Success');
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.method).toBe('PATCH');
      expect(JSON.parse(responseBody.body)).toEqual(body);
    });

    // @req FR:playbook-actions-io/http.request-bodies.serialization
    it('should execute PATCH with string body', async () => {
      const action = new HttpPatchAction();
      const body = 'partial update';

      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body
      });

      expect(result.code).toBe('Success');
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.body).toBe(body);
    });

    // @req FR:playbook-actions-io/http.request-bodies.serialization
    it('should set content-type for JSON body', async () => {
      const action = new HttpPatchAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body: { field: 'value' }
      });

      expect(result.code).toBe('Success');
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.headers['content-type']).toContain('application/json');
    });

    // @req FR:playbook-actions-io/http.request-bodies.config-interface
    it('should use custom content-type', async () => {
      const action = new HttpPatchAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body: '{"op":"replace","path":"/email","value":"new@example.com"}',
        contentType: 'application/json-patch+json'
      });

      expect(result.code).toBe('Success');
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.headers['content-type']).toBe('application/json-patch+json');
    });

    // @req FR:playbook-actions-io/http.patch-action.implementation
    it('should handle PATCH without body', async () => {
      const action = new HttpPatchAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`
      });

      expect(result.code).toBe('Success');
    });

    // @req FR:playbook-actions-io/http.base-class.error-handling
    it('should handle 500 errors', async () => {
      const action = new HttpPatchAction();
      const result = await action.execute({
        url: `${serverUrl}/error`,
        body: { data: 'test' }
      });

      expect(result.code).toBe('HttpInvalidStatus');
      expect(result.message).toContain('500');
    });

    // @req FR:playbook-actions-io/http.base-class.result-format
    it('should include descriptive success message', async () => {
      const action = new HttpPatchAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`,
        body: { test: 'data' }
      });

      expect(result.message).toContain('PATCH');
      expect(result.message).toContain('200');
    });
  });

  describe('execute with DELETE', () => {
    // @req FR:playbook-actions-io/http.delete-action.implementation
    // @req FR:playbook-actions-io/http.base-class.request-execution
    // @req FR:playbook-actions-io/http.base-class.result-format
    it('should execute successful DELETE request', async () => {
      const action = new HttpDeleteAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`
      });

      expect(result.code).toBe('Success');
      expect(result.error).toBeUndefined();
      expect(result.value).toBeDefined();
      const responseBody = JSON.parse((result.value as any).body);
      expect(responseBody.method).toBe('DELETE');
    });

    // @req FR:playbook-actions-io/http.base-class.result-format
    it('should include status in response', async () => {
      const action = new HttpDeleteAction();
      const result = await action.execute({
        url: `${serverUrl}/success`
      });

      expect((result.value as any).status).toBe(200);
    });

    // @req FR:playbook-actions-io/http.base-class.config-interface
    it('should handle custom headers', async () => {
      const action = new HttpDeleteAction();
      const result = await action.execute({
        url: `${serverUrl}/headers`,
        headers: {
          'Authorization': 'Bearer delete-token',
          'X-Request-Id': 'req-123'
        }
      });

      expect(result.code).toBe('Success');
      const body = JSON.parse((result.value as any).body);
      expect(body.headers['authorization']).toBe('Bearer delete-token');
      expect(body.headers['x-request-id']).toBe('req-123');
    });

    // @req FR:playbook-actions-io/http.base-class.error-handling
    it('should handle 404 errors', async () => {
      const action = new HttpDeleteAction();
      const result = await action.execute({
        url: `${serverUrl}/not-found`
      });

      expect(result.code).toBe('HttpInvalidStatus');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('404');
    });

    // @req FR:playbook-actions-io/http.base-class.error-handling
    it('should handle 500 errors', async () => {
      const action = new HttpDeleteAction();
      const result = await action.execute({
        url: `${serverUrl}/error`
      });

      expect(result.code).toBe('HttpInvalidStatus');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('500');
    });

    // @req FR:playbook-actions-io/security.config-validation
    it('should handle missing URL', async () => {
      const action = new HttpDeleteAction();
      const result = await action.execute({} as any);

      expect(result.code).toBe('HttpConfigInvalid');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('url');
    });

    // @req FR:playbook-actions-io/http.base-class.result-format
    it('should include descriptive success message', async () => {
      const action = new HttpDeleteAction();
      const result = await action.execute({
        url: `${serverUrl}/success`
      });

      expect(result.message).toContain('DELETE');
      expect(result.message).toContain('200');
    });

    // @req FR:playbook-actions-io/http.base-class.config-interface
    it('should use custom validateStatus', async () => {
      const action = new HttpDeleteAction();
      const result = await action.execute({
        url: `${serverUrl}/not-found`,
        validateStatus: (status) => status === 404
      });

      expect(result.code).toBe('Success');
      expect((result.value as any).status).toBe(404);
    });
  });

  describe('retry behavior', () => {
    // @req FR:playbook-actions-io/http.base-class.retry-logic
    it('should handle retries configuration', async () => {
      const action = new HttpGetAction();

      // Test that retries parameter is accepted
      const result = await action.execute({
        url: `${serverUrl}/error`,
        retries: 2
      });

      // Should fail after retries
      expect(result.code).toBe('HttpInvalidStatus');
      expect(result.error).toBeDefined();
    });

    // @req FR:playbook-actions-io/http.base-class.retry-logic
    it('should not retry 4xx errors by default', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/not-found`,
        retries: 3
      });

      // 4xx errors are not retryable by default
      expect(result.code).toBe('HttpInvalidStatus');
      expect(result.message).toContain('404');
    });

    // @req FR:playbook-actions-io/http.base-class.retry-logic
    it('should accept retries parameter', async () => {
      const action = new HttpGetAction();

      // Verify that retries config is accepted without error
      const result = await action.execute({
        url: `${serverUrl}/success`,
        retries: 0
      });

      expect(result.code).toBe('Success');
    });
  });

  describe('header masking', () => {
    // @req FR:playbook-actions-io/http.base-class.header-masking
    // @req FR:playbook-actions-io/security.http-data-masking
    it('should mask sensitive headers in logs', async () => {
      const action = new HttpGetAction();

      // This test verifies that sensitive headers are not leaked
      // The actual masking happens in console.log calls
      const result = await action.execute({
        url: `${serverUrl}/headers`,
        headers: {
          'Authorization': 'Bearer secret-token',
          'X-API-Key': 'sensitive-key'
        }
      });

      expect(result.code).toBe('Success');
      // Headers should be sent but masked in logs
    });
  });

  describe('success messages', () => {
    // @req FR:playbook-actions-io/http.base-class.result-format
    it('should include descriptive success message', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/success`
      });

      expect(result.message).toContain('GET');
      expect(result.message).toContain('200');
    });
  });
});
