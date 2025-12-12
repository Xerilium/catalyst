import { StatePersistence } from '../../../src/playbooks/scripts/playbooks/persistence';
import { atomicWrite } from '../../../src/playbooks/scripts/playbooks/persistence/atomic-write';
import type { PlaybookState } from '../../../src/playbooks/scripts/playbooks/types/state';
import { unlink, rm } from 'fs/promises';
import { join } from 'path';

/**
 * Performance tests for state persistence
 *
 * Requirements:
 * - State serialization <100ms for 1MB
 * - Atomic write <50ms
 */

async function createLargeState(targetSizeKB: number): Promise<PlaybookState> {
  const state: PlaybookState = {
    playbookName: 'performance-test',
    runId: '20251129-000000-001',
    startTime: new Date().toISOString(),
    status: 'running',
    inputs: {},
    variables: {},
    completedSteps: [],
    currentStepName: 'test-step',
  };

  // Add data until we reach target size
  let currentSize = JSON.stringify(state).length;
  let counter = 0;

  while (currentSize < targetSizeKB * 1024) {
    const key = `var-${counter}`;
    const value = 'x'.repeat(1000); // 1KB chunks
    state.variables[key] = value;
    currentSize = JSON.stringify(state).length;
    counter++;
  }

  return state;
}

async function measureTime(fn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
}

async function runPerformanceTests() {
  const testDir = '.xe/runs-perf-test';
  const persistence = new StatePersistence(testDir);

  console.log('Running performance tests...\n');

  // Test 1: State serialization for 1MB state
  console.log('Test 1: State serialization <100ms for 1MB');
  const largeState = await createLargeState(1024); // 1MB
  const stateSize = JSON.stringify(largeState).length;
  console.log(`  State size: ${(stateSize / 1024).toFixed(2)} KB`);

  const serializationTime = await measureTime(async () => {
    await persistence.save(largeState);
  });

  console.log(`  Time: ${serializationTime.toFixed(2)}ms`);
  console.log(`  Status: ${serializationTime < 100 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 2: Atomic write <50ms
  console.log('Test 2: Atomic write <50ms');
  const testPath = join(testDir, 'atomic-write-test.txt');
  const content = 'x'.repeat(10 * 1024); // 10KB

  const atomicWriteTime = await measureTime(async () => {
    await atomicWrite(testPath, content);
  });

  console.log(`  Content size: ${(content.length / 1024).toFixed(2)} KB`);
  console.log(`  Time: ${atomicWriteTime.toFixed(2)}ms`);
  console.log(`  Status: ${atomicWriteTime < 50 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 3: Load performance
  console.log('Test 3: Load performance for 1MB state');
  const loadTime = await measureTime(async () => {
    await persistence.load(largeState.runId);
  });

  console.log(`  Time: ${loadTime.toFixed(2)}ms`);
  console.log(`  Status: ${loadTime < 100 ? '✓ PASS' : '✗ FAIL'}\n`);

  // Cleanup
  await rm(testDir, { recursive: true, force: true });

  console.log('Performance tests complete!');
}

// Run tests
runPerformanceTests().catch(console.error);
