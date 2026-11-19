/**
 * Path Protocol Resolution Module
 *
 * Resolves custom protocol paths (xe://, catalyst://) to filesystem paths.
 * Provides security validation and auto-extension detection.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { findUp, isCatalystPackage } from './catalyst-package';

/** Package location never changes during a process, so it is cached per module folder. */
const packageDirsCache = new Map<string, string[]>();

/**
 * Folders holding the running Catalyst package's resources, located from this
 * module rather than the current folder.
 *
 * An installed package ships resources at its root. A source checkout keeps
 * them in `src/resources`, so a module under `src/` maps there.
 *
 * @req FR:playbook-template-engine/paths.protocols.catalyst
 */
export function catalystPackageDirs(moduleDir: string = __dirname): string[] {
  const cached = packageDirsCache.get(moduleDir);
  if (cached) {return cached;}

  const root = findUp(moduleDir, isCatalystPackage);
  let dirs: string[] = [];
  if (root) {
    const inSource = path.relative(root, path.resolve(moduleDir)).split(path.sep)[0] === 'src';
    dirs = [inSource ? path.join(root, 'src', 'resources') : root];
  }
  packageDirsCache.set(moduleDir, dirs);
  return dirs;
}

/**
 * Resolves custom protocol paths to filesystem paths.
 *
 * Supported protocols:
 * - xe:// → .xe/ directory (project-local)
 * - catalyst:// → the running Catalyst package's resources (found from this module),
 *   falling back to node_modules/@xerilium/catalyst/ in the current folder
 * - temp:// → OS temp directory (platform-agnostic)
 *
 * Security features:
 * - Path traversal prevention (rejects ../)
 * - Absolute path rejection
 * - Extension auto-detection (.md, .json, none)
 *
 * @req FR:playbook-template-engine/paths.protocols.xe
 * @req FR:playbook-template-engine/paths.protocols.catalyst
 * @req FR:playbook-template-engine/paths.protocols.catalyst.fallback
 * @req FR:playbook-template-engine/paths.protocols.temp
 * @req FR:playbook-template-engine/paths.protocols.extension
 * @req FR:playbook-template-engine/paths.protocols.timing
 * @req FR:playbook-template-engine/paths.conditionals.content
 * @req FR:playbook-template-engine/paths.conditionals.existence
 * @req FR:playbook-template-engine/paths.conditionals.missing
 * @req NFR:playbook-template-engine/performance.path
 */
export class PathProtocolResolver {
  private readonly protocolMap: Map<string, string>;

  constructor(private readonly moduleDir: string = __dirname) {
    this.protocolMap = new Map([
      ['xe', '.xe'],
      ['catalyst', 'node_modules/@xerilium/catalyst'],
      ['temp', os.tmpdir()],
    ]);
  }

  /**
   * Resolves a protocol path to a filesystem path.
   *
   * @param protocolPath - Path with protocol (e.g., "xe://features/spec.md")
   * @returns Resolved filesystem path
   * @throws Error with code 'InvalidProtocol' on security violations
   */
  async resolve(protocolPath: string): Promise<string> {
    const basePath = this.resolveBasePath(protocolPath);
    if (basePath === null) {return protocolPath;} // no protocol, return as-is
    return await this.autoDetectExtension(basePath);
  }

  /**
   * Synchronous variant of resolve(), used by the expression evaluator's get()
   * since jse-eval runs synchronously. Same security checks, same extension
   * auto-detection — just uses fs.existsSync instead of fs.promises.access.
   */
  resolveSync(protocolPath: string): string {
    const basePath = this.resolveBasePath(protocolPath);
    if (basePath === null) {return protocolPath;}
    return this.autoDetectExtensionSync(basePath);
  }

  /**
   * Shared validation + base-path construction for resolve() and resolveSync().
   * Returns null if the input has no protocol prefix (caller returns input as-is).
   *
   * A bare protocol with no path part (e.g. `temp://`) resolves to the base
   * directory itself. This is the natural form for directory-targeting actions
   * like file-list.
   */
  private resolveBasePath(protocolPath: string): string | null {
    if (!protocolPath.includes(':')) {return null;}

    // (.*) — allow empty path part. `temp://` is a valid reference to the base dir.
    const match = protocolPath.match(/^(\w+):\/\/(.*)$/);
    if (!match) {
      throw new Error('InvalidProtocol: Malformed protocol syntax');
    }

    const [, protocol, pathPart] = match;

    const baseDir = this.protocolMap.get(protocol);
    if (!baseDir) {
      throw new Error(`InvalidProtocol: Unsupported protocol '${protocol}://'`);
    }

    if (pathPart.includes('..')) {
      throw new Error('InvalidProtocol: Path traversal not allowed');
    }

    if (pathPart.startsWith('/')) {
      throw new Error('InvalidProtocol: Absolute paths not allowed');
    }

    if (protocol === 'catalyst') {
      return this.resolveCatalystPath(pathPart, baseDir);
    }
    const resolvedBase = path.isAbsolute(baseDir)
      ? baseDir
      : path.join(process.cwd(), baseDir);
    // Bare protocol (e.g. `temp://`) resolves to the base directory.
    return pathPart === '' ? resolvedBase : path.join(resolvedBase, pathPart);
  }

  /**
   * Resolves a catalyst:// path against the running package first, then the
   * current folder's node_modules. When nothing exists yet, returns the
   * current-folder candidate so callers see a stable "missing" path.
   *
   * @req FR:playbook-template-engine/paths.protocols.catalyst
   * @req FR:playbook-template-engine/paths.protocols.catalyst.fallback
   */
  private resolveCatalystPath(pathPart: string, cwdRelativeBase: string): string {
    const roots = [...catalystPackageDirs(this.moduleDir), path.join(process.cwd(), cwdRelativeBase)];
    const candidates = roots.map(root => (pathPart === '' ? root : path.join(root, pathPart)));
    const found = candidates.find(c => this.candidateExists(c));
    return found ?? candidates[candidates.length - 1];
  }

  /**
   * True when extension auto-detection would find `p`: the exact path when it
   * already has an extension, else the path itself or its `.md`/`.json` form.
   */
  private candidateExists(p: string): boolean {
    if (fs.existsSync(p)) {return true;}
    if (path.extname(p)) {return false;}
    return fs.existsSync(p + '.md') || fs.existsSync(p + '.json');
  }

  /**
   * Auto-detects file extension if not provided.
   * Tries: .md → .json → no extension.
   * Skipped when the basePath already points at an existing directory —
   * a directory is the intended target (e.g. for file-list), not a file stub.
   */
  private async autoDetectExtension(basePath: string): Promise<string> {
    if (path.extname(basePath)) {return basePath;}
    if (await this.isDirectory(basePath)) {return basePath;}

    const mdPath = basePath + '.md';
    if (await this.fileExists(mdPath)) {return mdPath;}

    const jsonPath = basePath + '.json';
    if (await this.fileExists(jsonPath)) {return jsonPath;}

    return basePath;
  }

  /** Synchronous variant of autoDetectExtension() — same lookup order. */
  private autoDetectExtensionSync(basePath: string): string {
    if (path.extname(basePath)) {return basePath;}
    if (this.isDirectorySync(basePath)) {return basePath;}

    const mdPath = basePath + '.md';
    if (fs.existsSync(mdPath)) {return mdPath;}

    const jsonPath = basePath + '.json';
    if (fs.existsSync(jsonPath)) {return jsonPath;}

    return basePath;
  }

  private async isDirectory(p: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(p);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private isDirectorySync(p: string): boolean {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Checks if a file exists.
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
