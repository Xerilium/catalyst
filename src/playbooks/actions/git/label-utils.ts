/**
 * Shared validation and argument building for label actions
 * @module playbooks/actions/git/label-utils
 */

// @req FR:playbook-actions-git/labels.create
// @req FR:playbook-actions-git/labels.edit
// @req FR:playbook-actions-git/common.validation

import { CatalystError } from '@core/errors';

/** Throw `{code}` unless `name` is a non-empty string. */
export function requireName(name: unknown, code: string): void {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new CatalystError('Label name is required', code, 'Provide a non-empty label name');
  }
}

/** Strip a leading `#`; throw `{code}` unless the result is 6-digit hex. */
export function normalizeColor(color: string | undefined, code: string): string | undefined {
  if (color === undefined || color === '') {
    return undefined;
  }
  const hex = String(color).replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    throw new CatalystError(
      `Label color must be 6-digit hex: ${color}`,
      code,
      'Use a color like B60205 or #B60205',
    );
  }
  return hex;
}

/** `--color` / `--description` flags for whichever values are set. */
export function styleArgs(color: string | undefined, description: string | undefined): string[] {
  return [
    ...(color ? ['--color', color] : []),
    ...(description !== undefined ? ['--description', description] : []),
  ];
}
