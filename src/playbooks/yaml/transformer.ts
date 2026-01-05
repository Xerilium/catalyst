import type {
  Playbook,
  PlaybookStep,
  InputParameter,
  InputValidationRule,
} from '../types';
import { ACTION_CATALOG } from '../registry/action-catalog';

/**
 * Transform YAML playbook object to TypeScript Playbook interface
 *
 * @param yamlPlaybook - Parsed YAML object
 * @returns Transformed Playbook
 *
 * @req FR:playbook-yaml/transformation.interface
 * @req FR:playbook-yaml/transformation.loader
 * @req FR:playbook-yaml/structure.required
 * @req FR:playbook-yaml/structure.optional
 * @req FR:playbook-yaml/structure.output-naming
 * @req NFR:playbook-yaml/performance.transformation
 * @req NFR:playbook-yaml/maintainability.isolation
 */
export function transformPlaybook(yamlPlaybook: any): Playbook {
  const playbook: Playbook = {
    name: yamlPlaybook.name,
    description: yamlPlaybook.description,
    owner: yamlPlaybook.owner,
    steps: transformSteps(yamlPlaybook.steps),
  };

  // Optional properties
  if (yamlPlaybook.reviewers) {
    playbook.reviewers = yamlPlaybook.reviewers;
  }

  if (yamlPlaybook.triggers) {
    playbook.triggers = yamlPlaybook.triggers;
  }

  if (yamlPlaybook.inputs) {
    playbook.inputs = yamlPlaybook.inputs.map(transformInput);
  }

  if (yamlPlaybook.outputs) {
    playbook.outputs = yamlPlaybook.outputs;
  }

  if (yamlPlaybook.catch) {
    if (!Array.isArray(yamlPlaybook.catch)) {
      throw new Error('Playbook "catch" must be an array of catch blocks. Each catch block must have { code: "ErrorCode", steps: [...] }');
    }
    playbook.catch = yamlPlaybook.catch.map((catchBlock: any, index: number) => {
      if (!catchBlock.code) {
        throw new Error(`Catch block at index ${index} is missing required "code" property. Each catch block must have { code: "ErrorCode", steps: [...] }`);
      }
      if (!catchBlock.steps || !Array.isArray(catchBlock.steps)) {
        throw new Error(`Catch block "${catchBlock.code}" is missing required "steps" array`);
      }
      return {
        code: catchBlock.code,
        steps: transformSteps(catchBlock.steps),
      };
    });
  }

  if (yamlPlaybook.finally) {
    playbook.finally = transformSteps(yamlPlaybook.finally);
  }

  return playbook;
}

/**
 * Transform array of YAML steps to PlaybookStep[]
 *
 * @req FR:playbook-yaml/transformation.steps
 * @req FR:playbook-yaml/transformation.all-steps
 * @req FR:playbook-yaml/steps.unique-names
 */
function transformSteps(yamlSteps: any[]): PlaybookStep[] {
  return yamlSteps.map(transformStep);
}

/**
 * Transform single YAML step to PlaybookStep
 *
 * Implements three transformation patterns based on ACTION_CATALOG:
 * 1. Null value: { action: 'type', config: { ...additionalProps } }
 * 2. Non-null value with primaryProperty in registry: Map value to primary property
 * 3. Object value without primaryProperty: Use object as-is
 *
 * Per FR-5.4 in playbook-yaml spec, transformation MUST use ACTION_CATALOG
 * to determine the primaryProperty for each action type.
 *
 * Per FR-5.6 in playbook-yaml spec, transformation MUST recursively transform
 * nested steps in action configurations (e.g., if.then, if.else, for-each.steps).
 *
 * @req FR:playbook-yaml/transformation.patterns
 * @req FR:playbook-yaml/transformation.registry
 * @req FR:playbook-yaml/steps.action-key
 * @req FR:playbook-yaml/steps.patterns
 * @req FR:playbook-yaml/steps.error-policy
 */
function transformStep(yamlStep: any): PlaybookStep {
  const reserved = ['name', 'errorPolicy', 'isolated'];

  // Extract action type (first non-reserved key)
  const actionType = Object.keys(yamlStep).find(key => !reserved.includes(key));

  if (!actionType) {
    throw new Error('Step missing action type (no non-reserved properties found)');
  }

  const actionValue = yamlStep[actionType];

  // Get action metadata from registry to determine primaryProperty and nestedStepProperties
  const actionMetadata = ACTION_CATALOG[actionType];
  const primaryProperty = actionMetadata?.primaryProperty;
  const nestedStepProperties = actionMetadata?.nestedStepProperties ?? [];

  // Extract additional properties (all except action type and reserved)
  const additionalProps: Record<string, unknown> = {};
  for (const key of Object.keys(yamlStep)) {
    if (key !== actionType && !reserved.includes(key)) {
      additionalProps[key] = yamlStep[key];
    }
  }

  // Build config based on value type and primaryProperty
  let config: Record<string, unknown>;

  if (actionValue === null || actionValue === undefined) {
    // Pattern 1: Null - use only additional props
    config = { ...additionalProps };
  } else if (typeof actionValue === 'object' && !Array.isArray(actionValue)) {
    // Pattern 2: Object value - use object as-is (full config form)
    // This is the expanded form: `action: { prop1: val, prop2: val }`
    config = { ...actionValue, ...additionalProps };
  } else if (primaryProperty) {
    // Pattern 3: Primitive/array value with primaryProperty - map to that property
    // This is the shorthand form: `action: "value"` → `{ [primaryProperty]: "value" }`
    config = { [primaryProperty]: actionValue, ...additionalProps };
  } else {
    // Fallback for primitives/arrays without primaryProperty - use 'value' as default
    config = { value: actionValue, ...additionalProps };
  }

  // Recursively transform nested step arrays (FR-5.6)
  // This enables YAML shorthand syntax inside control flow blocks
  for (const propName of nestedStepProperties) {
    if (config[propName] && Array.isArray(config[propName])) {
      config[propName] = transformSteps(config[propName]);
    }
  }

  const step: PlaybookStep = {
    action: actionType,
    config,
  };

  // Preserve optional metadata
  if (yamlStep.name) {
    step.name = yamlStep.name;
  }

  if (yamlStep.errorPolicy) {
    step.errorPolicy = yamlStep.errorPolicy;
  }

  if (yamlStep.isolated !== undefined) {
    step.isolated = yamlStep.isolated;
  }

  return step;
}

/**
 * Transform YAML input parameter to InputParameter
 *
 * Handles type-as-key pattern: { string: 'param-name', ... }
 *
 * @req FR:playbook-yaml/structure.input-types
 */
function transformInput(yamlInput: any): InputParameter {
  // Find type key (string, number, or boolean)
  const types = ['string', 'number', 'boolean'];
  const typeKey = types.find(t => yamlInput[t] !== undefined);

  if (!typeKey) {
    throw new Error('Input parameter missing type (string, number, or boolean)');
  }

  const paramName = yamlInput[typeKey];

  const input: InputParameter = {
    name: paramName,
    type: typeKey as 'string' | 'number' | 'boolean',
    required: yamlInput.required ?? false,
  };

  // Optional properties
  if (yamlInput.description) {
    input.description = yamlInput.description;
  }

  if (yamlInput.default !== undefined) {
    input.default = yamlInput.default;
  }

  if (yamlInput.allowed) {
    input.allowed = yamlInput.allowed;
  }

  if (yamlInput.validation) {
    input.validation = yamlInput.validation.map(transformValidationRule);
  }

  return input;
}

/**
 * Transform YAML validation rule to InputValidationRule
 *
 * Detects type from property keys and transforms to appropriate ValidationRule interface
 *
 * @req FR:playbook-yaml/structure.validation
 */
function transformValidationRule(yamlRule: any): InputValidationRule {
  // Regex validation
  if (yamlRule.regex !== undefined) {
    return {
      type: 'Regex',
      pattern: yamlRule.regex,
      code: yamlRule.code,
      message: yamlRule.message,
    };
  }

  // StringLength validation
  if (yamlRule.minLength !== undefined || yamlRule.maxLength !== undefined) {
    return {
      type: 'StringLength',
      minLength: yamlRule.minLength,
      maxLength: yamlRule.maxLength,
      code: yamlRule.code,
      message: yamlRule.message,
    };
  }

  // NumberRange validation
  if (yamlRule.min !== undefined || yamlRule.max !== undefined) {
    return {
      type: 'NumberRange',
      min: yamlRule.min,
      max: yamlRule.max,
      code: yamlRule.code,
      message: yamlRule.message,
    };
  }

  // Custom script validation
  if (yamlRule.script !== undefined) {
    return {
      type: 'Custom',
      script: yamlRule.script,
      code: yamlRule.code,
      message: yamlRule.message,
    };
  }

  throw new Error(`Unknown validation rule type in ${JSON.stringify(yamlRule)}`);
}
