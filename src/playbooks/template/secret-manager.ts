/**
 * Secret Management Module
 *
 * Provides secure secret masking for template interpolation.
 * Prevents secret values from appearing in output or error messages.
 */

/**
 * Manages secret registration and masking.
 *
 * Secrets are replaced with `[SECRET:name]` placeholders in all output
 * to prevent accidental exposure in logs, error messages, or responses.
 *
 * @req FR:playbook-template-engine/security.secrets.interface
 * @req FR:playbook-template-engine/security.secrets.masking
 * @req FR:playbook-template-engine/security.secrets.masking.pre
 * @req FR:playbook-template-engine/security.secrets.masking.logs
 * @req FR:playbook-template-engine/security.secrets.masking.state
 * @req FR:playbook-template-engine/security.secrets.masking.errors
 * @req FR:playbook-template-engine/security.secrets.encryption
 * @req FR:playbook-template-engine/security.secrets.plaintext
 * @req NFR:playbook-template-engine/security.masking
 * @req NFR:playbook-template-engine/testability.secrets
 */
export class SecretManager {
  private secrets: Map<string, string>;

  constructor() {
    this.secrets = new Map();
  }

  /**
   * Registers a secret value.
   *
   * @param name - The secret name (e.g., 'GITHUB_TOKEN')
   * @param value - The secret value to mask
   */
  register(name: string, value: string): void {
    this.secrets.set(name, value);
  }

  /**
   * Masks all registered secrets in the given text.
   *
   * Replaces secret values with `[SECRET:name]` placeholders.
   *
   * @param text - Text that may contain secret values
   * @returns Text with all secrets masked
   */
  mask(text: string): string {
    let masked = text;

    // Replace each secret value with its placeholder
    // Sort by length (longest first) to handle overlapping secrets correctly
    const sortedSecrets = Array.from(this.secrets.entries()).sort(
      (a, b) => b[1].length - a[1].length
    );

    for (const [name, value] of sortedSecrets) {
      if (value && value.length > 0) {
        // Use global replace to mask all occurrences
        masked = masked.split(value).join(`[SECRET:${name}]`);
      }
    }

    return masked;
  }

  /**
   * Resolves a secret name to its value.
   *
   * @param name - The secret name
   * @returns The secret value, or undefined if not found
   */
  resolve(name: string): string | undefined {
    return this.secrets.get(name);
  }

  /**
   * Clears all registered secrets.
   */
  clear(): void {
    this.secrets.clear();
  }
}
