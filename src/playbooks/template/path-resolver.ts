/**
 * Path Protocol Resolution Module
 *
 * Resolves custom protocol paths (xe://, catalyst://) to filesystem paths.
 * Provides security validation and auto-extension detection.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Resolves custom protocol paths to filesystem paths.
 *
 * Supported protocols:
 * - xe:// → .xe/ directory (project-local)
 * - catalyst:// → node_modules/@xerilium/catalyst/ (package resources)
 * - temp:// → OS temp directory (platform-agnostic)
 *
 * Security features:
 * - Path traversal prevention (rejects ../)
 * - Absolute path rejection
 * - Extension auto-detection (.md, .json, none)
 *
 * @req FR:playbook-template-engine/paths.protocols.xe
 * @req FR:playbook-template-engine/paths.protocols.catalyst
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

  constructor() {
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
    if (basePath === null) return protocolPath; // no protocol, return as-is
    return await this.autoDetectExtension(basePath);
  }

  /**
   * Synchronous variant of resolve(), used by the expression evaluator's get()
   * since jse-eval runs synchronously. Same security checks, same extension
   * auto-detection — just uses fs.existsSync instead of fs.promises.access.
   */
  resolveSync(protocolPath: string): string {
    const basePath = this.resolveBasePath(protocolPath);
    if (basePath === null) return protocolPath;
    return this.autoDetectExtensionSync(basePath);
  }

  /**
   * Shared validation + base-path construction for resolve() and resolveSync().
   * Returns null if the input has no protocol prefix (caller returns input as-is).
   */
  private resolveBasePath(protocolPath: string): string | null {
    if (!protocolPath.includes(':')) return null;

    const match = protocolPath.match(/^(\w+):\/\/(.+)$/);
    if (!match) {
      throw new Error('InvalidProtocol: Malformed protocol syntax');
    }

    const [, protocol, pathPart] = match;

    const baseDir = this.protocolMap.get(protocol);
    if (!baseDir) {
      throw new Error(`InvalidProtocol: Unsupported protocol '${protocol}://'`);
    }

    if (!pathPart || pathPart.trim() === '') {
      throw new Error('InvalidProtocol: Empty path after protocol');
    }

    if (pathPart.includes('..')) {
      throw new Error('InvalidProtocol: Path traversal not allowed');
    }

    if (pathPart.startsWith('/')) {
      throw new Error('InvalidProtocol: Absolute paths not allowed');
    }

    return path.isAbsolute(baseDir)
      ? path.join(baseDir, pathPart)
      : path.join(process.cwd(), baseDir, pathPart);
  }

  /**
   * Auto-detects file extension if not provided.
   * Tries: .md → .json → no extension
   */
  private async autoDetectExtension(basePath: string): Promise<string> {
    if (path.extname(basePath)) return basePath;

    const mdPath = basePath + '.md';
    if (await this.fileExists(mdPath)) return mdPath;

    const jsonPath = basePath + '.json';
    if (await this.fileExists(jsonPath)) return jsonPath;

    return basePath;
  }

  /** Synchronous variant of autoDetectExtension() — same lookup order. */
  private autoDetectExtensionSync(basePath: string): string {
    if (path.extname(basePath)) return basePath;

    const mdPath = basePath + '.md';
    if (fs.existsSync(mdPath)) return mdPath;

    const jsonPath = basePath + '.json';
    if (fs.existsSync(jsonPath)) return jsonPath;

    return basePath;
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
