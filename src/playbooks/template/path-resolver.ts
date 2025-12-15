/**
 * Path Protocol Resolution Module
 *
 * Resolves custom protocol paths (xe://, catalyst://) to filesystem paths.
 * Provides security validation and auto-extension detection.
 *
 * @req FR:playbook-template-engine/paths.protocols.xe
 * @req FR:playbook-template-engine/paths.protocols.catalyst
 * @req FR:playbook-template-engine/paths.protocols.extension
 * @req FR:playbook-template-engine/paths.protocols.timing
 * @req NFR:playbook-template-engine/performance.path
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolves custom protocol paths to filesystem paths.
 *
 * Supported protocols:
 * - xe:// → .xe/ directory (project-local)
 * - catalyst:// → node_modules/@xerilium/catalyst/ (package resources)
 *
 * Security features:
 * - Path traversal prevention (rejects ../)
 * - Absolute path rejection
 * - Extension auto-detection (.md, .json, none)
 */
export class PathProtocolResolver {
  private readonly protocolMap: Map<string, string>;

  constructor() {
    this.protocolMap = new Map([
      ['xe', '.xe'],
      ['catalyst', 'node_modules/@xerilium/catalyst'],
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
    // Check if there's a protocol prefix at all
    if (!protocolPath.includes(':')) {
      // No protocol, return as-is
      return protocolPath;
    }

    // Parse protocol and path
    const match = protocolPath.match(/^(\w+):\/\/(.+)$/);
    if (!match) {
      // Has colon but malformed syntax (e.g., 'xe:' or 'xe:invalid')
      throw new Error('InvalidProtocol: Malformed protocol syntax');
    }

    const [, protocol, pathPart] = match;

    // Validate protocol
    const baseDir = this.protocolMap.get(protocol);
    if (!baseDir) {
      throw new Error(`InvalidProtocol: Unsupported protocol '${protocol}://'`);
    }

    // Validate path is not empty
    if (!pathPart || pathPart.trim() === '') {
      throw new Error('InvalidProtocol: Empty path after protocol');
    }

    // Security: Prevent path traversal
    if (pathPart.includes('..')) {
      throw new Error('InvalidProtocol: Path traversal not allowed');
    }

    // Security: Prevent absolute paths
    if (pathPart.startsWith('/')) {
      throw new Error('InvalidProtocol: Absolute paths not allowed');
    }

    // Construct base path
    const basePath = path.join(process.cwd(), baseDir, pathPart);

    // Auto-detect extension
    return await this.autoDetectExtension(basePath);
  }

  /**
   * Auto-detects file extension if not provided.
   * Tries: .md → .json → no extension
   */
  private async autoDetectExtension(basePath: string): Promise<string> {
    // If path already has extension, return as-is
    if (path.extname(basePath)) {
      return basePath;
    }

    // Try .md first
    const mdPath = basePath + '.md';
    if (await this.fileExists(mdPath)) {
      return mdPath;
    }

    // Try .json second
    const jsonPath = basePath + '.json';
    if (await this.fileExists(jsonPath)) {
      return jsonPath;
    }

    // Return without extension (may not exist, but that's okay)
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
