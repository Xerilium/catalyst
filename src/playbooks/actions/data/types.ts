// @req FR:playbook-actions-data/json-read.input
// @req FR:playbook-actions-data/json-write.input

/** Supported file encodings — matches FileReadConfig/FileWriteConfig. */
export type JsonEncoding = 'utf8' | 'utf-8' | 'ascii' | 'base64' | 'binary' | 'hex';

/**
 * Configuration for json-read action
 * @req FR:playbook-actions-data/json-read.@action
 */
export interface JsonReadConfig {
  /** File path to read (supports template interpolation) */
  path: string;
  /** File encoding. Default: 'utf8' */
  encoding?: JsonEncoding;
}

/**
 * Configuration for json-write action
 * @req FR:playbook-actions-data/json-write.@action
 */
export interface JsonWriteConfig {
  /** File path to write (supports template interpolation) */
  path: string;
  /** Data to serialize; any JSON-serializable value */
  value: unknown;
  /** Pretty-print with 2-space indentation. Default: true */
  pretty?: boolean;
  /** File encoding. Default: 'utf8' */
  encoding?: JsonEncoding;
}

/**
 * Result value for json-write action — mirrors file-write's shape.
 * @req FR:playbook-actions-data/json-write.output
 */
export interface JsonWriteResult {
  /** Written file path */
  path: string;
  /** Bytes written to disk */
  bytesWritten: number;
}
