/**
 * Simple .gitignore file parser.
 * @req FR:req-traceability/scan.gitignore
 */

/**
 * Parse a .gitignore file content into glob patterns.
 * @req FR:req-traceability/scan.gitignore
 */
export function parseGitignore(content: string): string[] {
  const patterns: string[] = [];

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Skip negation patterns (not supported in our simple glob matching)
    if (trimmed.startsWith('!')) {
      continue;
    }

    // Convert gitignore pattern to glob pattern
    let pattern = trimmed;

    // If pattern doesn't start with /, it matches anywhere
    if (!pattern.startsWith('/')) {
      pattern = `**/${pattern}`;
    } else {
      // Remove leading /
      pattern = pattern.substring(1);
    }

    // If pattern ends with /, it's a directory - add **
    if (pattern.endsWith('/')) {
      pattern = `${pattern}**`;
    }

    patterns.push(pattern);
  }

  return patterns;
}
