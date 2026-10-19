/**
 * Label naming, classification, and matching (pure)
 */

import { LABEL_CATALOG } from './catalog';
import type { LabelDefinition, LabelStyle } from './types';

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]+/gu;

/**
 * @req FR:pr-labels/naming.@function
 * @req FR:pr-labels/naming.input
 * @req FR:pr-labels/naming.key-value
 * @req FR:pr-labels/naming.simple
 * @req FR:pr-labels/naming.emoji-trailing
 */
export function labelName(definition: LabelDefinition, style: LabelStyle): string {
  if (style === 'simple') {
    return definition.simple;
  }
  const prefix = definition.group ? `${definition.group}: ` : '';
  return `${prefix}${definition.value} ${definition.emoji}`;
}

/**
 * @req FR:pr-labels/naming.classify
 * @req FR:pr-labels/naming.classify.style
 * @req FR:pr-labels/naming.classify.emoji
 */
export function classifyLabel(name: string): {
  style: LabelStyle;
  emoji: 'leading' | 'trailing' | 'none';
} {
  const matches = [...name.matchAll(EMOJI)];
  const last = matches[matches.length - 1];
  let emoji: 'leading' | 'trailing' | 'none' = 'none';
  if (last) {
    const after = name.slice((last.index ?? 0) + last[0].length);
    emoji = /[\p{L}\p{N}]/u.test(after) ? 'leading' : 'trailing';
  }
  const style = emoji !== 'none' || /^[^:]+:/.test(name) ? 'key-value' : 'simple';
  return { style, emoji };
}

function normalize(name: string): string {
  return name
    .replace(EMOJI, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * @req FR:pr-labels/naming.match
 * @req FR:pr-labels/naming.match.forms
 */
export function matchLabel(name: string): LabelDefinition | undefined {
  const key = normalize(name);
  if (!key) {
    return undefined;
  }
  return LABEL_CATALOG.find(
    d => key === normalize(labelName(d, 'key-value')) || key === normalize(labelName(d, 'simple')),
  );
}
