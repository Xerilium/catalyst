/**
 * Data-format Actions for Playbook Workflows
 *
 * Native actions for reading and writing structured data files (currently
 * JSON). File I/O concerns are inherited from playbook-actions-io's file
 * actions; this module owns the parse/serialize layer.
 */

export type { JsonReadConfig, JsonWriteConfig, JsonWriteResult, JsonEncoding } from './types';
export { JsonReadAction } from './json-read-action';
export { JsonWriteAction } from './json-write-action';
