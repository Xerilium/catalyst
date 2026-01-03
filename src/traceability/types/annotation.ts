/**
 * Types for code annotations and scanning options.
 */

import type { RequirementId } from './requirement.js';

/**
 * Location of an annotation in source code.
 * @req FR:req-traceability/annotation.tag
 * @req FR:req-traceability/scan.code
 * @req FR:req-traceability/scan.tests
 */
export interface AnnotationLocation {
  /** Path to source file */
  file: string;
  /** Line number (1-indexed) */
  line: number;
}

/**
 * @req annotation found in source code.
 * @req FR:req-traceability/annotation.tag
 * @req FR:req-traceability/annotation.partial
 */
export interface RequirementAnnotation {
  /** Parsed requirement identifier */
  id: RequirementId;
  /** Path to source file */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** True if uses @req:partial marker */
  isPartial: boolean;
  /** True if in test directory */
  isTest: boolean;
}

/**
 * Options for scanning source directories.
 * @req FR:req-traceability/scan.exclude
 * @req FR:req-traceability/scan.gitignore
 */
export interface ScanOptions {
  /** Glob patterns to exclude */
  exclude: string[];
  /** Directories considered as test directories */
  testDirs: string[];
  /** Whether to respect .gitignore patterns */
  respectGitignore: boolean;
}
