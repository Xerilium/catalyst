/**
 * Front matter utility
 *
 * Serializes JavaScript objects to YAML front matter for markdown files.
 */

/**
 * Add YAML front matter to content
 *
 * Serializes the front matter object to YAML and prepends it to the content
 * between '---' delimiters.
 *
 * @param content - Content to prepend front matter to
 * @param frontMatter - Object to serialize as YAML front matter
 * @param filePath - File path (used to check if .md file)
 * @returns Content with front matter prepended
 *
 * @example
 * ```typescript
 * const content = '# Hello\n\nWorld';
 * const withFrontMatter = addFrontMatter(
 *   content,
 *   { title: 'My Doc', author: 'Me' },
 *   'doc.md'
 * );
 * // Returns:
 * // ---
 * // title: My Doc
 * // author: Me
 * // ---
 * //
 * // # Hello
 * //
 * // World
 * ```
 */
export function addFrontMatter(
  content: string,
  frontMatter: Record<string, unknown>,
  filePath: string
): string {
  // Only add front matter to .md files
  if (!filePath.endsWith('.md')) {
    return content;
  }

  // Serialize front matter to YAML
  const yaml = serializeToYaml(frontMatter);

  // Prepend front matter with delimiters
  return `---\n${yaml}---\n\n${content}`;
}

/**
 * Simple YAML serializer for front matter
 *
 * Converts a JavaScript object to YAML format suitable for front matter.
 * Supports strings, numbers, booleans, and arrays.
 *
 * @param obj - Object to serialize
 * @param indent - Current indentation level (internal use)
 * @returns YAML string
 */
function serializeToYaml(obj: Record<string, unknown>, indent: number = 0): string {
  const lines: string[] = [];
  const indentStr = '  '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      lines.push(`${indentStr}${key}: null`);
    } else if (typeof value === 'string') {
      // Escape quotes and handle multiline strings
      if (value.includes('\n')) {
        lines.push(`${indentStr}${key}: |`);
        value.split('\n').forEach(line => {
          lines.push(`${indentStr}  ${line}`);
        });
      } else if (value.includes('"') || value.includes("'") || value.includes(':')) {
        // Quote strings that contain special characters
        const escaped = value.replace(/"/g, '\\"');
        lines.push(`${indentStr}${key}: "${escaped}"`);
      } else {
        lines.push(`${indentStr}${key}: ${value}`);
      }
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${indentStr}${key}: ${value}`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${indentStr}${key}: []`);
      } else {
        lines.push(`${indentStr}${key}:`);
        value.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            lines.push(`${indentStr}- `);
            const itemYaml = serializeToYaml(item as Record<string, unknown>, indent + 1);
            lines.push(itemYaml.trim());
          } else {
            lines.push(`${indentStr}- ${item}`);
          }
        });
      }
    } else if (typeof value === 'object') {
      lines.push(`${indentStr}${key}:`);
      lines.push(serializeToYaml(value as Record<string, unknown>, indent + 1));
    }
  }

  return lines.join('\n') + (indent === 0 ? '\n' : '');
}
