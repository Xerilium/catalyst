// @req FR:playbook-actions-io/http.base-class.header-masking
// @req FR:playbook-actions-io/security.http-data-masking
// @req NFR:playbook-actions-io/testability.error-coverage
// @req NFR:playbook-actions-io/testability.success-coverage

/**
 * Unit tests for masking utility
 */

import { describe, it, expect } from '@jest/globals';
import {
  isSensitiveHeader,
  maskSensitiveHeaders,
  maskSensitiveUrlParams
} from '@playbooks/actions/io/utils/masking';

describe('Masking Utility', () => {
  describe('isSensitiveHeader', () => {
    it('should identify authorization headers as sensitive', () => {
      expect(isSensitiveHeader('Authorization')).toBe(true);
      expect(isSensitiveHeader('authorization')).toBe(true);
      expect(isSensitiveHeader('AUTHORIZATION')).toBe(true);
    });

    it('should identify token headers as sensitive', () => {
      expect(isSensitiveHeader('Token')).toBe(true);
      expect(isSensitiveHeader('X-Auth-Token')).toBe(true);
      expect(isSensitiveHeader('Access-Token')).toBe(true);
      expect(isSensitiveHeader('bearer-token')).toBe(true);
    });

    it('should identify key headers as sensitive', () => {
      expect(isSensitiveHeader('API-Key')).toBe(true);
      expect(isSensitiveHeader('X-API-KEY')).toBe(true);
      expect(isSensitiveHeader('apikey')).toBe(true);
    });

    it('should identify secret headers as sensitive', () => {
      expect(isSensitiveHeader('Secret')).toBe(true);
      expect(isSensitiveHeader('Client-Secret')).toBe(true);
      expect(isSensitiveHeader('X-SECRET-VALUE')).toBe(true);
    });

    it('should identify password headers as sensitive', () => {
      expect(isSensitiveHeader('Password')).toBe(true);
      expect(isSensitiveHeader('X-Password')).toBe(true);
      expect(isSensitiveHeader('user-password')).toBe(true);
    });

    it('should not mark non-sensitive headers as sensitive', () => {
      expect(isSensitiveHeader('Content-Type')).toBe(false);
      expect(isSensitiveHeader('Accept')).toBe(false);
      expect(isSensitiveHeader('User-Agent')).toBe(false);
      expect(isSensitiveHeader('X-Request-ID')).toBe(false);
    });

    it('should handle empty and null header names', () => {
      expect(isSensitiveHeader('')).toBe(false);
    });
  });

  describe('maskSensitiveHeaders', () => {
    it('should mask sensitive headers', () => {
      const headers = {
        'Authorization': 'Bearer secret-token',
        'Content-Type': 'application/json',
        'X-API-Key': 'my-api-key'
      };

      const masked = maskSensitiveHeaders(headers);

      expect(masked['Authorization']).toBe('***');
      expect(masked['Content-Type']).toBe('application/json');
      expect(masked['X-API-Key']).toBe('***');
    });

    it('should handle case-insensitive header names', () => {
      const headers = {
        'authorization': 'Bearer token',
        'AUTHORIZATION': 'Bearer token2',
        'Authorization': 'Bearer token3'
      };

      const masked = maskSensitiveHeaders(headers);

      expect(masked['authorization']).toBe('***');
      expect(masked['AUTHORIZATION']).toBe('***');
      expect(masked['Authorization']).toBe('***');
    });

    it('should not modify original headers object', () => {
      const headers = {
        'Authorization': 'Bearer secret-token',
        'Content-Type': 'application/json'
      };

      const original = { ...headers };
      maskSensitiveHeaders(headers);

      expect(headers).toEqual(original);
    });

    it('should handle empty headers object', () => {
      const headers = {};
      const masked = maskSensitiveHeaders(headers);

      expect(masked).toEqual({});
    });

    it('should mask all common sensitive header patterns', () => {
      const headers = {
        'Authorization': 'Bearer token',
        'X-Auth-Token': 'token123',
        'API-Key': 'key456',
        'Client-Secret': 'secret789',
        'Password': 'pass123',
        'User-Agent': 'MyApp/1.0'
      };

      const masked = maskSensitiveHeaders(headers);

      expect(masked['Authorization']).toBe('***');
      expect(masked['X-Auth-Token']).toBe('***');
      expect(masked['API-Key']).toBe('***');
      expect(masked['Client-Secret']).toBe('***');
      expect(masked['Password']).toBe('***');
      expect(masked['User-Agent']).toBe('MyApp/1.0');
    });
  });

  describe('maskSensitiveUrlParams', () => {
    it('should mask sensitive query parameters', () => {
      const url = 'https://api.example.com/data?api_key=secret123&format=json';
      const masked = maskSensitiveUrlParams(url);

      expect(masked).toBe('https://api.example.com/data?api_key=***&format=json');
    });

    it('should handle multiple sensitive parameters', () => {
      const url = 'https://api.example.com/data?token=abc&key=def&format=json';
      const masked = maskSensitiveUrlParams(url);

      expect(masked).toContain('token=***');
      expect(masked).toContain('key=***');
      expect(masked).toContain('format=json');
    });

    it('should handle URLs without query parameters', () => {
      const url = 'https://api.example.com/data';
      const masked = maskSensitiveUrlParams(url);

      expect(masked).toBe('https://api.example.com/data');
    });

    it('should handle URLs with hash fragments', () => {
      const url = 'https://api.example.com/data?token=secret#section';
      const masked = maskSensitiveUrlParams(url);

      expect(masked).toContain('token=***');
      expect(masked).toContain('#section');
    });

    it('should preserve URL structure', () => {
      const url = 'https://user:pass@api.example.com:8080/path?query=value';
      const masked = maskSensitiveUrlParams(url);

      expect(masked).toContain('https://');
      expect(masked).toContain('api.example.com');
      expect(masked).toContain(':8080');
      expect(masked).toContain('/path');
    });

    it('should handle empty query parameter values', () => {
      const url = 'https://api.example.com/data?token=&format=json';
      const masked = maskSensitiveUrlParams(url);

      expect(masked).toContain('token=***');
      expect(masked).toContain('format=json');
    });

    it('should handle case-insensitive parameter names', () => {
      const url = 'https://api.example.com/data?API_KEY=secret&Token=abc';
      const masked = maskSensitiveUrlParams(url);

      expect(masked).toContain('API_KEY=***');
      expect(masked).toContain('Token=***');
    });

    it('should not modify non-sensitive parameters', () => {
      const url = 'https://api.example.com/data?page=1&limit=10&sort=desc';
      const masked = maskSensitiveUrlParams(url);

      expect(masked).toBe(url);
    });

    it('should handle URLs with encoded characters', () => {
      const url = 'https://api.example.com/data?token=abc%20def&name=test';
      const masked = maskSensitiveUrlParams(url);

      expect(masked).toContain('token=***');
      expect(masked).toContain('name=test');
    });

    it('should return relative URLs unchanged (URL parsing fails)', () => {
      const url = '/api/data?secret=hidden&public=visible';
      const masked = maskSensitiveUrlParams(url);

      // Relative URLs can't be parsed by URL constructor without a base
      // So they are returned unchanged
      expect(masked).toBe(url);
    });
  });
});
