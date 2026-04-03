/**
 * CLI output formatting utilities
 * @req FR:cli.banner
 * @req NFR:ux.colors
 * @req NFR:ux.progress
 */

import pc from 'picocolors';

/**
 * Generate the ASCII art banner with Xerilium branding
 * Features periodic table element (Xe, atomic number 42) with optional blue/purple/pink gradient
 * @req FR:cli.banner
 */
export function generateBanner(): string {
  // 256-color helpers - picocolors doesn't support 256-color, use raw ANSI with pc.isColorSupported
  const fg = (n: number) => pc.isColorSupported ? `\x1b[38;5;${n}m` : '';
  const reset = pc.isColorSupported ? '\x1b[0m' : '';

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
 * Check if colors should be used in output.
 * Delegates to picocolors which respects NO_COLOR, FORCE_COLOR, and TTY detection.
 * @req NFR:ux.colors
 */
export function shouldUseColors(): boolean {
  return pc.isColorSupported;
}

/**
 * Format a success message
 */
export function formatSuccess(message: string): string {
  return pc.green(`✓ ${message}`);
}

/**
 * Format an info message
 */
export function formatInfo(message: string): string {
  return pc.cyan(`→ ${message}`);
}

/**
 * Format a warning message
 */
export function formatWarning(message: string): string {
  return pc.yellow(`⚠ ${message}`);
}

/**
 * Format an error message
 */
export function formatErrorMessage(message: string): string {
  return pc.red(`✗ ${message}`);
}

/**
 * Format dim/secondary text
 */
export function formatDim(text: string): string {
  return pc.dim(text);
}

/**
 * Format bold text
 */
export function formatBold(text: string): string {
  return pc.bold(text);
}

/**
 * Check if output is a TTY (for progress indicators)
 * @req NFR:ux.progress
 */
export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}
