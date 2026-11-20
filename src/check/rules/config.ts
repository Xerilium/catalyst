/**
 * Config rules: settings mistakes caught before a live run reads them.
 * The severity loader already fails the command on invalid JSON, so rules skip it.
 */

import { validateAutonomy } from '../../autonomy/config';
import type { Rule } from '../types';

/** 1-based line of the first `"autonomy"` key, else 1. */
const keyLine = (content: string): number => {
  const i = content.split(/\r?\n/).findIndex((l) => /"autonomy"\s*:/.test(l));
  return i >= 0 ? i + 1 : 1;
};

export const CONFIG_RULES: Rule[] = [
  {
    id: 'config.autonomy',
    description: 'The full autonomy config is valid; an invalid one turns autonomy off',
    documents: 'config',
    // @req FR:cli-check/config.autonomy
    // @req FR:cli-check/config.autonomy.line
    // @req FR:cli-check/config.autonomy.json
    check: ({ content }) => {
      let json: unknown;
      try {
        json = JSON.parse(content);
      } catch {
        return [];
      }
      if (!json || typeof json !== 'object' || !('autonomy' in json)) {return [];}
      const line = keyLine(content);
      return validateAutonomy((json as { autonomy: unknown }).autonomy).map((text) => ({ line, text }));
    },
  },
];
