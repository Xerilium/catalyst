// @req FR:playbook-yaml/parsing
// @req FR:playbook-yaml/transformation
// @req FR:playbook-yaml/discovery
// @req FR:playbook-yaml/provider

/**
 * Playbook YAML Format
 *
 * @req FR:playbook-yaml/parsing - YAML parsing and validation
 * @req FR:playbook-yaml/transformation - YAML to TypeScript transformation
 * @req FR:playbook-yaml/discovery - Playbook file discovery
 * @req FR:playbook-yaml/provider - YAML playbook provider
 *
 * This module provides YAML format support for Catalyst playbooks.
 * It handles parsing, validation, and transformation of YAML playbooks
 * to TypeScript interfaces.
 */

export { PlaybookDiscovery } from './discovery';
export { ValidationError } from './validator';
export type { ValidationResult, ValidationErrorDetail } from './validator';
export { YamlPlaybookLoader, registerYamlLoader as registerYamlLoader } from './loader';
