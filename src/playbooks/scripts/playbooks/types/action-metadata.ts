/**
 * Action metadata type definitions
 *
 * Defines metadata structure for playbook actions including dependencies,
 * YAML shorthand configuration, and JSON schemas for validation.
 */

import type { PlaybookActionDependencies } from './dependencies';

/**
 * JSON Schema object (draft-07 compatible)
 *
 * Represents a JSON Schema for validating action configuration.
 * Used by playbook-yaml feature to generate YAML JSON Schema.
 */
export interface JSONSchemaObject {
  /** Schema version */
  $schema?: string;
  /** Schema type (object, string, number, etc.) */
  type?: string | string[];
  /** Object properties */
  properties?: Record<string, JSONSchemaObject>;
  /** Required property names */
  required?: string[];
  /** Property descriptions */
  description?: string;
  /** Additional properties allowed */
  additionalProperties?: boolean | JSONSchemaObject;
  /** Schema title */
  title?: string;
  /** Enum values */
  enum?: unknown[];
  /** Array item schema */
  items?: JSONSchemaObject | JSONSchemaObject[];
  /** Pattern for string validation */
  pattern?: string;
  /** Minimum value */
  minimum?: number;
  /** Maximum value */
  maximum?: number;
  /** Any other valid JSON Schema properties */
  [key: string]: unknown;
}

/**
 * Action metadata
 *
 * Combines all metadata for a playbook action type:
 * - dependencies: External CLI tools and environment variables required
 * - primaryProperty: Property name for YAML shorthand syntax
 * - configSchema: JSON Schema for action configuration validation
 *
 * All properties are optional to support actions with varying metadata needs.
 *
 * @example
 * ```typescript
 * const bashMetadata: ActionMetadata = {
 *   dependencies: {
 *     cli: [{
 *       name: 'bash',
 *       versionCommand: 'bash --version',
 *       platforms: ['linux', 'darwin']
 *     }]
 *   },
 *   primaryProperty: 'code',
 *   configSchema: {
 *     type: 'object',
 *     properties: {
 *       code: { type: 'string', description: 'Bash script to execute' },
 *       env: { type: 'object', description: 'Environment variables' }
 *     },
 *     required: ['code']
 *   }
 * };
 * ```
 */
export interface ActionMetadata {
  /**
   * External dependencies required by this action
   *
   * Includes CLI tools and environment variables that must be present
   * for the action to execute successfully.
   */
  dependencies?: PlaybookActionDependencies;

  /**
   * Primary property name for YAML shorthand syntax
   *
   * Enables compact YAML syntax where a string value maps to this property:
   * ```yaml
   * # Shorthand (if primaryProperty = 'code')
   * - bash: echo "hello"
   *
   * # Equivalent to full syntax
   * - bash:
   *     code: echo "hello"
   * ```
   */
  primaryProperty?: string;

  /**
   * JSON Schema for action configuration
   *
   * Defines the structure and validation rules for this action's config object.
   * Generated from TypeScript config interfaces using typescript-json-schema.
   */
  configSchema?: JSONSchemaObject;
}
