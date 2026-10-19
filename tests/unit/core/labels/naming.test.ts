/**
 * Unit tests for label naming, classification, and matching
 */

import { findDefinition } from '../../../../src/core/labels/catalog';
import { classifyLabel, labelName, matchLabel } from '../../../../src/core/labels/naming';

const def = (id: string) => findDefinition(id)!;

describe('label naming', () => {
  // @req FR:pr-labels/naming.@function
  // @req FR:pr-labels/naming.input
  it('exposes labelName, classifyLabel, and matchLabel', () => {
    expect(typeof labelName).toBe('function');
    expect(typeof classifyLabel).toBe('function');
    expect(typeof matchLabel).toBe('function');
  });

  // @req FR:pr-labels/naming.key-value
  it('formats key/value names with a group prefix', () => {
    expect(labelName(def('wip'), 'key-value')).toBe('Status: WIP 🚧');
    expect(labelName(def('needs-attention'), 'key-value')).toBe('Needs: Attention 👋');
  });

  // @req FR:pr-labels/naming.key-value
  it('omits the group prefix for group-less definitions', () => {
    expect(labelName(def('help-wanted'), 'key-value')).toBe('Help wanted ✨');
  });

  // @req FR:pr-labels/naming.simple
  it('formats simple names without group or emoji', () => {
    expect(labelName(def('wip'), 'simple')).toBe('wip');
    expect(labelName(def('needs-review'), 'simple')).toBe('needs review');
    expect(labelName(def('help-wanted'), 'simple')).toBe('help wanted');
  });

  // @req FR:pr-labels/naming.emoji-trailing
  it('places the emoji last in every key/value name', () => {
    for (const id of ['wip', 'paused', 'ready', 'help-wanted', 'release-stretch']) {
      const name = labelName(def(id), 'key-value');
      expect(name.endsWith(def(id).emoji)).toBe(true);
    }
  });

  // @req FR:pr-labels/naming.classify.style
  it('classifies group-prefixed and emoji names as key-value', () => {
    expect(classifyLabel('Status: WIP').style).toBe('key-value');
    expect(classifyLabel('Help wanted ✨').style).toBe('key-value');
  });

  // @req FR:pr-labels/naming.classify.style
  it('classifies plain names as simple', () => {
    expect(classifyLabel('wip').style).toBe('simple');
    expect(classifyLabel('help wanted').style).toBe('simple');
  });

  // @req FR:pr-labels/naming.classify.emoji
  it('classifies emoji placement', () => {
    expect(classifyLabel('Status: WIP 🚧').emoji).toBe('trailing');
    expect(classifyLabel('Status: 🚧 WIP').emoji).toBe('leading');
    expect(classifyLabel('🚧 WIP').emoji).toBe('leading');
    expect(classifyLabel('Status: WIP').emoji).toBe('none');
    expect(classifyLabel('⏸️').emoji).toBe('trailing');
  });

  // @req FR:pr-labels/naming.match
  it('matches ignoring case, emoji, punctuation, and spacing', () => {
    for (const name of ['Status: 🚧 WIP', 'status:wip', 'STATUS -  WIP 🚧']) {
      expect(matchLabel(name)?.id).toBe('wip');
    }
    expect(matchLabel('Needs: Review 👀')?.id).toBe('needs-review');
  });

  // @req FR:pr-labels/naming.match.forms
  it('matches both the simple and the key/value form', () => {
    expect(matchLabel('wip')?.id).toBe('wip');
    expect(matchLabel('Status: WIP 🚧')?.id).toBe('wip');
    expect(matchLabel('help wanted')?.id).toBe('help-wanted');
    expect(matchLabel('Help wanted ✨')?.id).toBe('help-wanted');
  });

  // @req FR:pr-labels/naming.match
  it('returns undefined for unrelated labels', () => {
    expect(matchLabel('bug')).toBeUndefined();
    expect(matchLabel('')).toBeUndefined();
  });
});
