import * as yaml from 'js-yaml';

/**
 * Parse YAML content to JavaScript object
 *
 * @param yamlContent - YAML string to parse
 * @returns Parsed JavaScript object
 * @throws Error with line/column details on syntax errors
 */
export function parseYAML(yamlContent: string): any {
  if (!yamlContent || yamlContent.trim().length === 0) {
    throw new Error('YAML content is empty');
  }

  try {
    const parsed = yaml.load(yamlContent, {
      // Safe loading - no arbitrary code execution
      schema: yaml.DEFAULT_SCHEMA,
      // Include position information for error reporting
      filename: 'playbook.yaml',
    });

    if (parsed === null || parsed === undefined) {
      throw new Error('YAML content is empty or invalid');
    }

    return parsed;
  } catch (err) {
    if (err instanceof yaml.YAMLException) {
      // Enhance error message with line/column information
      const line = err.mark?.line !== undefined ? err.mark.line + 1 : 'unknown';
      const column = err.mark?.column !== undefined ? err.mark.column + 1 : 'unknown';
      throw new Error(
        `YAML syntax error at line ${line}, column ${column}: ${err.reason || err.message}`
      );
    }
    throw err;
  }
}
