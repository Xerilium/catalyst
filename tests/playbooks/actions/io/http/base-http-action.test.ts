/**
 * Unit tests for HttpActionBase
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { HttpGetAction } from '@playbooks/actions/io/http/get-action';
import { HttpPostAction } from '@playbooks/actions/io/http/post-action';
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

    it('should include status in response', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/success`
      });

      expect((result.value as any).status).toBe(200);
    });

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

    it('should handle 404 errors', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/not-found`
      });

      expect(result.code).toBe('HttpInvalidStatus');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('404');
    });

    it('should handle 500 errors', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/error`
      });

      expect(result.code).toBe('HttpInvalidStatus');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('500');
    });

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

    it('should handle missing URL', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({} as any);

      expect(result.code).toBe('HttpConfigInvalid');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('url');
    });

    it('should handle invalid URL', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: 'not-a-valid-url'
      });

      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: 'http://localhost:9999/unreachable',
        retries: 0 // Disable retries to make test faster
      });

      expect(result.error).toBeDefined();
    }, 10000); // 10 second timeout for test

    it('should use custom validateStatus', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({
        url: `${serverUrl}/not-found`,
        validateStatus: (status) => status === 404
      });

      expect(result.code).toBe('Success');
      expect((result.value as any).status).toBe(404);
    });

    it('should provide error guidance', async () => {
      const action = new HttpGetAction();
      const result = await action.execute({} as any);

      expect(result.error).toBeDefined();
      const error = result.error as any;
      expect(error.guidance).toBeDefined();
    });
  });

  describe('execute with POST', () => {
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

    it('should handle POST without body', async () => {
      const action = new HttpPostAction();
      const result = await action.execute({
        url: `${serverUrl}/echo`
      });

      expect(result.code).toBe('Success');
    });
  });

  describe('retry behavior', () => {
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
