/**
 * CLI output formatting utilities
 * @req FR:cli.banner
 * @req NFR:ux.colors
 * @req NFR:ux.progress
 */

/**
 * Generate the ASCII art banner with Xerilium branding
 * Features periodic table element (Xe, atomic number 42) with optional blue/purple/pink gradient
 * @req FR:cli.banner
 */
export function generateBanner(): string {
  // Color helpers - return ANSI codes when colors enabled, empty string otherwise
  const useColors = shouldUseColors();
  const fg = (n: number) => useColors ? `\x1b[38;5;${n}m` : '';
  const reset = useColors ? '\x1b[0m' : '';

  // Gradient colors: dark blue (18, 19) → purple (54, 55, 56) → pink-purple (92)
  // Accent color (128) for "42" and "Xe", text gradient (213 → 33)
  const lines = [
    ``,
    `  ${fg(18)}╭──────────╮${reset}   ${fg(213)} ___       _        _           _${reset}`,
    `  ${fg(19)}│ ${fg(128)}42       ${fg(19)}│${reset}   ${fg(177)}/ __| __ _| |_ __ _| |_   _ ___| |_${reset}`,
    `  ${fg(54)}│          ${fg(54)}│${reset}  ${fg(141)}| |   / _\` | __/ _\` | | | | / __| __|${reset}`,
    `  ${fg(55)}│    ${fg(128)}Xe    ${fg(55)}│${reset}  ${fg(105)}| |__| (_| | || (_| | | |_| \\__ \\ |_${reset}`,
    `  ${fg(56)}│          ${fg(56)}│${reset}   ${fg(69)}\\____\\__,_|\\__\\__,_|_|\\__, |___/\\__|${reset}`,
    `  ${fg(92)}╰──────────╯${reset}                          ${fg(33)}|__/${reset}`,
    ``,
  ];

  return lines.join('\n') + '\n';
}

/**
 * Check if colors should be used in output
 * Respects NO_COLOR environment variable per spec
 * @req NFR:ux.colors
 */
export function shouldUseColors(): boolean {
  // NO_COLOR presence (even empty) disables colors
  if ('NO_COLOR' in process.env) {
    return false;
  }

  // Check if stdout is a TTY
  return process.stdout.isTTY === true;
}

/**
 * ANSI color codes
 */
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

/**
 * Apply color to text if colors are enabled
 */
function colorize(text: string, color: keyof typeof COLORS): string {
  if (!shouldUseColors()) {
    return text;
  }
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

/**
 * Format a success message
 */
export function formatSuccess(message: string): string {
  return colorize(`✓ ${message}`, 'green');
}

/**
 * Format an info message
 */
export function formatInfo(message: string): string {
  return colorize(`→ ${message}`, 'cyan');
}

/**
 * Format a warning message
 */
export function formatWarning(message: string): string {
  return colorize(`⚠ ${message}`, 'yellow');
}

/**
 * Format an error message
 */
export function formatErrorMessage(message: string): string {
  return colorize(`✗ ${message}`, 'red');
}

/**
 * Format dim/secondary text
 */
export function formatDim(text: string): string {
  return colorize(text, 'dim');
}

/**
 * Check if output is a TTY (for progress indicators)
 * @req NFR:ux.progress
 */
export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}
