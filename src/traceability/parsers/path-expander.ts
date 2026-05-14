/**
 * Expands path patterns (mixing directory prefixes and glob patterns) into
 * concrete directory paths usable as scan roots.
 */

import { glob } from 'glob';

/**
 * Resolve a list of path patterns to concrete paths.
 *
 * Entries containing `*` or `?` are expanded via `glob`. Other entries pass
 * through unchanged. Results are deduplicated while preserving first-seen order.
 *
 * @req FR:req-traceability/scan.code
 * @req FR:req-traceability/scan.tests
 */
export async function expandPathPatterns(patterns: string[]): Promise<string[]> {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const pattern of patterns) {
    if (pattern.includes('*') || pattern.includes('?')) {
      const matches = await glob(pattern);
      for (const match of matches) {
        if (!seen.has(match)) {
          seen.add(match);
          result.push(match);
        }
      }
    } else {
      if (!seen.has(pattern)) {
        seen.add(pattern);
        result.push(pattern);
      }
    }
  }

  return result;
}
