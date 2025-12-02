#!/usr/bin/env tsx

/**
 * Build script: Generate playbook JSON Schema from ACTION_REGISTRY
 *
 * Generates IDE-friendly JSON Schema for YAML playbooks by incorporating
 * action config schemas from ACTION_REGISTRY. The generated schema provides
 * IntelliSense for all built-in actions with their actual configuration properties.
 *
 * Usage: tsx scripts/generate-playbook-schema.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ACTION_REGISTRY } from '../src/playbooks/scripts/playbooks/registry/action-registry';

interface JSONSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  required?: string[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  patternProperties?: Record<string, JSONSchema>;
  additionalProperties?: boolean | JSONSchema;
  definitions?: Record<string, JSONSchema>;
  enum?: any[];
  pattern?: string;
  minItems?: number;
  minLength?: number;
  minimum?: number;
  default?: any;
}

async function generatePlaybookSchema(): Promise<void> {
  console.log('[Schema] Generating playbook JSON Schema from ACTION_REGISTRY...');

  const actionCount = Object.keys(ACTION_REGISTRY).length;
  const actionsWithSchema = Object.entries(ACTION_REGISTRY).filter(([_, meta]) => meta.configSchema).length;
  console.log(`[Schema] Found ${actionCount} actions, ${actionsWithSchema} with configSchema`);

  // Generate step variants from ACTION_REGISTRY
  const stepVariants: JSONSchema[] = [];

  for (const [actionType, metadata] of Object.entries(ACTION_REGISTRY)) {
    if (metadata.configSchema) {
      // Create step variant for this action
      const variant: JSONSchema = {
        description: `${actionType} action step`,
        required: [actionType],
        properties: {
          name: { type: 'string', description: 'Optional step name' },
          errorPolicy: {
            description: 'Error handling policy for this step',
            oneOf: [
              { type: 'string' },
              { type: 'object' }
            ]
          },
          [actionType]: {
            description: metadata.configSchema.description || `Configuration for ${actionType} action`,
            oneOf: []
          }
        }
      };

      // Build action value oneOf patterns
      const actionValueOneOf: JSONSchema[] = [];

      // Pattern 1: Primary property value (if action has primaryProperty)
      if (metadata.primaryProperty) {
        // Primary value can be string, number, boolean, array, or object
        actionValueOneOf.push(
          { type: 'string', description: `Shorthand for ${metadata.primaryProperty} property` },
          { type: 'number', description: `Shorthand for ${metadata.primaryProperty} property` },
          { type: 'boolean', description: `Shorthand for ${metadata.primaryProperty} property` },
          { type: 'array', description: `Shorthand for ${metadata.primaryProperty} property` }
        );
      }

      // Pattern 2: Object with config properties (always supported)
      if (metadata.configSchema.properties) {
        actionValueOneOf.push({
          type: 'object',
          properties: metadata.configSchema.properties,
          required: metadata.configSchema.required,
          description: 'Full configuration object'
        });
      }

      // Pattern 3: Null value (no inputs, only additional properties)
      actionValueOneOf.push({
        type: 'null',
        description: 'No configuration (action uses additional properties or defaults)'
      });

      variant.properties![actionType].oneOf = actionValueOneOf;

      // Allow additional properties for config overrides
      variant.properties![actionType as any] = {
        ...variant.properties![actionType],
        // Additional properties from configSchema can be added at same level as action key
      };

      stepVariants.push(variant);
      console.log(`[Schema] ✓ Generated variant for ${actionType} action`);
    }
  }

  // Add custom-action variant for extensibility
  stepVariants.push({
    description: 'Custom action (extensibility)',
    required: ['custom-action'],
    properties: {
      name: { type: 'string' },
      errorPolicy: {
        oneOf: [
          { type: 'string' },
          { type: 'object' }
        ]
      },
      'custom-action': {
        oneOf: [
          { type: 'string' },
          { type: 'number' },
          { type: 'boolean' },
          { type: 'object' },
          { type: 'null' }
        ]
      }
    },
    additionalProperties: true
  });

  console.log(`[Schema] ✓ Added custom-action variant for extensibility`);

  // Build complete playbook schema
  const schema: JSONSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://catalyst.xerilium.com/schemas/playbook.schema.json',
    title: 'Catalyst Playbook',
    description: 'Schema for Catalyst YAML playbook format',
    type: 'object',
    required: ['name', 'description', 'owner', 'steps'],
    properties: {
      name: {
        type: 'string',
        pattern: '^[a-z][a-z0-9-]*$',
        description: 'Unique playbook identifier in kebab-case'
      },
      description: {
        type: 'string',
        minLength: 1,
        description: 'Human-readable purpose statement'
      },
      owner: {
        type: 'string',
        description: 'Responsible role (e.g., Engineer, Architect, Product Manager)'
      },
      steps: {
        type: 'array',
        minItems: 1,
        items: {
          $ref: '#/definitions/step'
        },
        description: 'Execution steps'
      },
      reviewers: {
        type: 'object',
        properties: {
          required: {
            type: 'array',
            items: { type: 'string' },
            description: 'Roles that must approve'
          },
          optional: {
            type: 'array',
            items: { type: 'string' },
            description: 'Roles that may review'
          }
        },
        description: 'Review requirements'
      },
      triggers: {
        type: 'array',
        items: {
          type: 'object',
          required: ['event', 'action'],
          properties: {
            event: {
              type: 'string',
              description: "GitHub event type (e.g., 'issues', 'pull_request')"
            },
            action: {
              type: 'string',
              description: "GitHub event action (e.g., 'opened', 'labeled')"
            },
            args: {
              type: 'object',
              description: 'Event-specific filters'
            }
          }
        },
        description: 'Event-based activation triggers'
      },
      inputs: {
        type: 'array',
        items: {
          $ref: '#/definitions/input'
        },
        description: 'Input parameters'
      },
      outputs: {
        type: 'object',
        patternProperties: {
          '^[a-z][a-z0-9-]*$': {
            type: 'string'
          }
        },
        additionalProperties: false,
        description: 'Expected outputs (kebab-case keys)'
      },
      catch: {
        type: 'array',
        items: {
          type: 'object',
          required: ['code', 'steps'],
          properties: {
            code: {
              type: 'string',
              description: 'Error code to catch'
            },
            steps: {
              type: 'array',
              items: {
                $ref: '#/definitions/step'
              },
              description: 'Recovery steps'
            }
          }
        },
        description: 'Error recovery handlers'
      },
      finally: {
        type: 'array',
        items: {
          $ref: '#/definitions/step'
        },
        description: 'Cleanup steps (always execute)'
      }
    },
    additionalProperties: false,
    definitions: {
      step: {
        type: 'object',
        oneOf: stepVariants
      },
      input: {
        type: 'object',
        oneOf: [
          {
            description: 'String parameter',
            required: ['string'],
            properties: {
              string: { type: 'string', description: 'Parameter name' },
              description: { type: 'string' },
              required: { type: 'boolean' },
              default: { type: 'string' },
              allowed: {
                type: 'array',
                items: { type: 'string' }
              },
              validation: {
                type: 'array',
                items: { $ref: '#/definitions/validation' }
              }
            },
            additionalProperties: false
          },
          {
            description: 'Number parameter',
            required: ['number'],
            properties: {
              number: { type: 'string', description: 'Parameter name' },
              description: { type: 'string' },
              required: { type: 'boolean' },
              default: { type: 'number' },
              allowed: {
                type: 'array',
                items: { type: 'number' }
              },
              validation: {
                type: 'array',
                items: { $ref: '#/definitions/validation' }
              }
            },
            additionalProperties: false
          },
          {
            description: 'Boolean parameter',
            required: ['boolean'],
            properties: {
              boolean: { type: 'string', description: 'Parameter name' },
              description: { type: 'string' },
              required: { type: 'boolean' },
              default: { type: 'boolean' },
              validation: {
                type: 'array',
                items: { $ref: '#/definitions/validation' }
              }
            },
            additionalProperties: false
          }
        ]
      },
      validation: {
        type: 'object',
        oneOf: [
          {
            description: 'Regex validation',
            required: ['regex'],
            properties: {
              regex: { type: 'string', description: 'Regular expression pattern' },
              code: { type: 'string' },
              message: { type: 'string' }
            },
            additionalProperties: false
          },
          {
            description: 'String length validation',
            properties: {
              minLength: { type: 'number', minimum: 0 },
              maxLength: { type: 'number', minimum: 0 },
              code: { type: 'string' },
              message: { type: 'string' }
            },
            anyOf: [
              { required: ['minLength'] },
              { required: ['maxLength'] }
            ],
            additionalProperties: false
          },
          {
            description: 'Number range validation',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              code: { type: 'string' },
              message: { type: 'string' }
            },
            anyOf: [
              { required: ['min'] },
              { required: ['max'] }
            ],
            additionalProperties: false
          },
          {
            description: 'Custom script validation',
            required: ['script'],
            properties: {
              script: { type: 'string', description: 'JavaScript expression' },
              code: { type: 'string' },
              message: { type: 'string' }
            },
            additionalProperties: false
          }
        ]
      }
    }
  };

  // Write schema to dist directory (build artifact)
  const outputPath = path.join('dist/playbooks/scripts/playbooks/yaml', 'schema.json');

  // Ensure directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  await fs.writeFile(outputPath, JSON.stringify(schema, null, 2), 'utf-8');

  console.log(`[Schema] Generated: ${outputPath}`);
  console.log(`[Schema] Step variants: ${stepVariants.length} (${actionsWithSchema} actions + 1 custom-action)`);
  console.log(`[Schema] Success!`);
}

// Run schema generation
generatePlaybookSchema()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Schema] Failed:', err);
    process.exit(1);
  });
