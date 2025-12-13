import * as path from 'path';
import { CatalystError } from '@core/errors';
import type { Playbook } from '../types/playbook';
import type { PlaybookLoader } from '../types/playbook-loader';
import type { PlaybookAction, StepExecutor } from '../types/action';
import type { ActionMetadata } from '../types/action-metadata';

/**
 * Action constructor type
 */
export type ActionConstructor<TConfig = unknown> = new (...args: unknown[]) => PlaybookAction<TConfig>;

/**
 * Action catalog entry combining metadata with class constructor
 */
interface ActionCatalogEntry {
  metadata: ActionMetadata;
  ActionClass: ActionConstructor;
}

/**
 * Unified provider for playbooks and actions
 *
 * Manages:
 * - Playbook loading via registered loaders (YAML, etc.)
 * - Action instantiation from the action catalog
 * - Caching for both playbooks and action instances
 *
 * Supports dependency injection for testing via constructor parameters.
 *
 * **Usage**:
 * ```typescript
 * // Production: use singleton
 * const provider = PlaybookProvider.getInstance();
 * const playbook = await provider.loadPlaybook('my-playbook');
 * const action = provider.createAction('script', stepExecutor);
 *
 * // Testing: create isolated instance
 * const testProvider = new PlaybookProvider();
 * testProvider.registerAction('mock-action', MockAction);
 * ```
 *
 * @see {@link PlaybookLoader} Loader interface for playbook loading
 * @see {@link ActionMetadata} Metadata structure for actions
 */
export class PlaybookProvider {
  private static instance: PlaybookProvider | null = null;

  // Playbook loader management
  private loaders: Map<string, PlaybookLoader> = new Map();
  private loaderOrder: string[] = [];
  private loadersInitialized = false;

  // Action catalog management
  private actionCatalog: Map<string, ActionCatalogEntry> = new Map();

  // Caching
  private playbookCache: Map<string, Playbook> = new Map();

  /** Search paths for resolving relative playbook names */
  private readonly searchPaths = [
    '.xe/playbooks',
    'node_modules/@xerilium/catalyst/playbooks'
  ];

  /**
   * Create a new PlaybookProvider instance
   *
   * For production use, prefer getInstance() singleton.
   * For testing, create instances directly to isolate test state.
   */
  constructor() {
    // Instance is ready - loaders and actions registered lazily or via register methods
  }

  /**
   * Get singleton provider instance
   *
   * Initializes loaders and action catalog on first access.
   *
   * @returns The singleton PlaybookProvider instance
   */
  static getInstance(): PlaybookProvider {
    if (!PlaybookProvider.instance) {
      PlaybookProvider.instance = new PlaybookProvider();
    }
    return PlaybookProvider.instance;
  }

  /**
   * Reset singleton instance (testing only)
   *
   * @internal
   */
  static resetInstance(): void {
    PlaybookProvider.instance = null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Playbook Loading
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Load playbook by name or path
   *
   * Automatically initializes loaders on first call if needed.
   * Results are cached - subsequent calls for same identifier return cached playbook.
   *
   * **Path Resolution**:
   * 1. If identifier is absolute or starts with ./ or ../, use as-is
   * 2. Otherwise, resolve against search paths with extension variants
   * 3. Try each candidate path with each loader in registration order
   * 4. Return first successful load
   *
   * @param identifier - Playbook identifier (file path or name)
   * @returns Loaded playbook
   * @throws {CatalystError} If playbook not found
   *
   * @example
   * ```typescript
   * const playbook = await provider.loadPlaybook('deploy-service');
   * const playbook2 = await provider.loadPlaybook('./custom/playbook.yaml');
   * ```
   */
  async loadPlaybook(identifier: string): Promise<Playbook> {
    // Check cache first
    const cached = this.playbookCache.get(identifier);
    if (cached) {
      return cached;
    }

    // Initialize loaders if not done
    this.initializeLoaders();

    // Load playbook
    const playbook = await this.loadPlaybookInternal(identifier);
    if (!playbook) {
      throw new CatalystError(
        `Playbook "${identifier}" not found`,
        'PlaybookNotFound',
        `Searched paths: ${this.searchPaths.join(', ')}. ` +
          `Registered loaders: ${this.loaderOrder.join(', ') || 'none'}`
      );
    }

    // Cache and return
    this.playbookCache.set(identifier, playbook);
    return playbook;
  }

  /**
   * Register a playbook loader
   *
   * Loaders are checked in registration order during loadPlaybook().
   * First loader that supports and successfully loads a playbook wins.
   *
   * @param loader - Loader implementation to register
   * @throws {CatalystError} If loader with same name already registered
   */
  registerLoader(loader: PlaybookLoader): void {
    if (this.loaders.has(loader.name)) {
      throw new CatalystError(
        `Loader '${loader.name}' is already registered`,
        'DuplicateLoaderName',
        `A loader with name '${loader.name}' has already been registered.`
      );
    }

    this.loaders.set(loader.name, loader);
    this.loaderOrder.push(loader.name);
  }

  /**
   * Initialize all loaders from generated catalog
   *
   * Called automatically on first loadPlaybook() call.
   * Can be called explicitly to pre-initialize.
   */
  initializeLoaders(): void {
    if (this.loadersInitialized) {
      return;
    }

    // Import and register loaders from generated catalog
    // Using require to avoid circular dependency issues
    try {
      const { LOADER_CLASSES } = require('./loader-catalog');
      for (const [, LoaderClass] of Object.entries(LOADER_CLASSES)) {
        const loader = new (LoaderClass as new () => PlaybookLoader)();
        if (!this.loaders.has(loader.name)) {
          this.registerLoader(loader);
        }
      }
    } catch {
      // Loader catalog not generated yet - that's OK for testing
    }

    this.loadersInitialized = true;
  }

  /**
   * Internal playbook loading without caching
   */
  private async loadPlaybookInternal(identifier: string): Promise<Playbook | undefined> {
    const candidates = this.resolveCandidates(identifier);

    for (const candidatePath of candidates) {
      for (const loaderName of this.loaderOrder) {
        const loader = this.loaders.get(loaderName)!;

        if (loader.supports(candidatePath)) {
          const playbook = await loader.load(candidatePath);
          if (playbook) {
            return playbook;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Resolve identifier to candidate file paths
   *
   * Candidates are tried in order:
   * 1. Original identifier (for programmatic loaders that match by name)
   * 2. Identifier with .yaml/.yml extensions
   * 3. Search path combinations with extensions
   */
  private resolveCandidates(identifier: string): string[] {
    if (path.isAbsolute(identifier) || identifier.startsWith('./') || identifier.startsWith('../')) {
      return [identifier];
    }

    const candidates: string[] = [];

    // First try the identifier as-is (for programmatic loaders)
    candidates.push(identifier);

    // Then try with extensions
    candidates.push(`${identifier}.yaml`);
    candidates.push(`${identifier}.yml`);

    // Finally try search paths
    for (const searchPath of this.searchPaths) {
      const basePath = path.join(searchPath, identifier);
      candidates.push(`${basePath}.yaml`);
      candidates.push(`${basePath}.yml`);
      candidates.push(basePath);
    }

    return candidates;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Action Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get action metadata
   *
   * @param actionType - Action type identifier (kebab-case)
   * @returns Action metadata or undefined if not found
   *
   * @example
   * ```typescript
   * const info = provider.getActionInfo('script');
   * console.log(info?.configSchema);
   * ```
   */
  getActionInfo(actionType: string): ActionMetadata | undefined {
    this.initializeActions();
    return this.actionCatalog.get(actionType)?.metadata;
  }

  /**
   * Get all registered action types
   *
   * @returns Array of action type identifiers
   */
  getActionTypes(): string[] {
    this.initializeActions();
    return Array.from(this.actionCatalog.keys());
  }

  /**
   * Create action instance
   *
   * Instantiates the action class with appropriate dependencies based on
   * whether it extends PlaybookActionWithSteps.
   *
   * @param actionType - Action type identifier (kebab-case)
   * @param stepExecutor - StepExecutor for actions that need nested execution
   * @returns Instantiated action
   * @throws {CatalystError} If action type not found
   *
   * @example
   * ```typescript
   * const action = provider.createAction('script', stepExecutor);
   * const result = await action.execute({ code: 'return 42' });
   * ```
   */
  createAction<TConfig = unknown>(
    actionType: string,
    stepExecutor?: StepExecutor
  ): PlaybookAction<TConfig> {
    this.initializeActions();

    const entry = this.actionCatalog.get(actionType);
    if (!entry) {
      throw new CatalystError(
        `Action "${actionType}" not found`,
        'ActionNotFound',
        `Available actions: ${this.getActionTypes().join(', ')}`
      );
    }

    const { ActionClass } = entry;

    // Determine if action needs StepExecutor
    if (this.extendsPlaybookActionWithSteps(ActionClass)) {
      if (!stepExecutor) {
        throw new CatalystError(
          `Action "${actionType}" requires a StepExecutor`,
          'MissingStepExecutor',
          'Control flow actions need a StepExecutor for nested step execution'
        );
      }
      return new ActionClass(stepExecutor) as PlaybookAction<TConfig>;
    }

    return new ActionClass() as PlaybookAction<TConfig>;
  }

  /**
   * Register an action class
   *
   * For production, actions are registered via generated catalog.
   * This method enables testing with mock actions.
   *
   * @param actionType - Action type identifier (kebab-case)
   * @param ActionClass - Action class constructor
   * @param metadata - Optional metadata (defaults to minimal metadata)
   *
   * @example
   * ```typescript
   * // Testing with mock action
   * provider.registerAction('mock-action', MockAction);
   *
   * // With custom metadata
   * provider.registerAction('custom-action', CustomAction, {
   *   actionType: 'custom-action',
   *   className: 'CustomAction',
   *   primaryProperty: 'value'
   * });
   * ```
   */
  registerAction(
    actionType: string,
    ActionClass: ActionConstructor,
    metadata?: Partial<ActionMetadata>
  ): void {
    const fullMetadata: ActionMetadata = {
      actionType,
      className: ActionClass.name,
      ...metadata
    };

    this.actionCatalog.set(actionType, {
      metadata: fullMetadata,
      ActionClass
    });
  }

  /**
   * Unregister an action (testing only)
   *
   * @param actionType - Action type to remove
   */
  unregisterAction(actionType: string): void {
    this.actionCatalog.delete(actionType);
  }

  /**
   * Initialize actions from generated catalog
   *
   * Called automatically on first action access.
   */
  private initializeActions(): void {
    if (this.actionCatalog.size > 0) {
      return; // Already initialized
    }

    // Import from generated catalog
    try {
      const catalog = require('./action-catalog');
      const { ACTION_CATALOG, ACTION_CLASSES } = catalog;

      for (const [actionType, metadata] of Object.entries(ACTION_CATALOG)) {
        const className = (metadata as ActionMetadata).className;
        const ActionClass = ACTION_CLASSES[className];
        if (ActionClass) {
          this.actionCatalog.set(actionType, {
            metadata: metadata as ActionMetadata,
            ActionClass
          });
        }
      }
    } catch {
      // Catalog not generated yet - that's OK for testing
    }
  }

  /**
   * Check if a class extends PlaybookActionWithSteps
   *
   * Uses prototype chain inspection to detect if the class needs StepExecutor.
   * Compares constructor names to avoid circular dependency issues.
   */
  private extendsPlaybookActionWithSteps(ActionClass: ActionConstructor): boolean {
    let proto = ActionClass.prototype;
    while (proto) {
      // Check constructor name to avoid circular import issues
      // PlaybookActionWithSteps is the base class name
      if (proto.constructor?.name === 'PlaybookActionWithSteps') {
        return true;
      }
      proto = Object.getPrototypeOf(proto);
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cache Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Clear playbook cache
   *
   * Forces reload of playbooks on next access.
   */
  clearPlaybookCache(): void {
    this.playbookCache.clear();
  }

  /**
   * Clear all state (testing only)
   *
   * Resets loaders, actions, and caches.
   */
  clearAll(): void {
    this.loaders.clear();
    this.loaderOrder = [];
    this.loadersInitialized = false;
    this.actionCatalog.clear();
    this.playbookCache.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Legacy Compatibility (deprecated)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * @deprecated Use registerLoader() instead
   */
  register(loader: PlaybookLoader): void {
    this.registerLoader(loader);
  }

  /**
   * @deprecated Use loadPlaybook() instead
   */
  async load(identifier: string): Promise<Playbook | undefined> {
    try {
      return await this.loadPlaybook(identifier);
    } catch {
      return undefined;
    }
  }

  /**
   * @deprecated Use getActionTypes() or check loaders directly
   */
  getProviderNames(): string[] {
    return [...this.loaderOrder];
  }

  /**
   * @deprecated Use clearAll() instead
   */
  unregister(loaderName: string): void {
    this.loaders.delete(loaderName);
    this.loaderOrder = this.loaderOrder.filter(name => name !== loaderName);
  }
}
