/**
 * Timeout protection for async operations
 */

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    ),
  ]);
}
