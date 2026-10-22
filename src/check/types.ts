/**
 * Types for the check rule registry.
 * @req FR:cli-check/registry.id
 * @req FR:cli-check/registry.output
 */

/** Configured severity for a rule. */
export type Severity = 'error' | 'warning' | 'disable';

/** A document a rule inspects. */
export interface Document {
  /** Repo-relative POSIX path */
  path: string;
  content: string;
}

/** A violation as a rule reports it, before severity is applied. */
export interface RawFinding {
  /** 1-based line number */
  line: number;
  /** Offending text */
  text: string;
}

/**
 * One rule violation in one document.
 * @req FR:cli-check/$finding
 */
export interface Finding {
  file: string;
  line: number;
  rule: string;
  severity: 'error' | 'warning';
  text: string;
}

/** A check rule. Pure function of document content. */
export interface Rule {
  /** `{namespace}.{rule}` in lowercase kebab-case */
  id: string;
  description: string;
  /** Kind of document the rule inspects */
  documents: 'spec';
  /** @req FR:cli-check/registry.pure */
  check(doc: Document): RawFinding[];
}
