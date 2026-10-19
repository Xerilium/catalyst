export { LABEL_CATALOG, findDefinition } from './catalog';
export { classifyLabel, labelName, matchLabel } from './naming';
export { discoverPattern, LOW_USE_THRESHOLD } from './pattern';
export { resolveLabel } from './resolver';
export { planLabels } from './plan';
export { createGhLabelAdapter } from './github';
export { createPrompt, createTerminalPrompt } from './prompt';
export { setupLabels } from './setup';
export * from './types';
