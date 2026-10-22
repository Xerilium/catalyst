/**
 * ACP (Agent Client Protocol) AI provider implementation
 *
 * Launches any ACP-compatible agent (configured via CATALYST_ACP_COMMAND) and
 * speaks newline-delimited JSON-RPC 2.0 over its stdio. No SDK dependency.
 */

import { spawn as nodeSpawn } from 'child_process';
import { accessSync, constants } from 'fs';
import * as path from 'path';
import { CatalystError } from '@core/errors';
import { AIProviderErrors } from '../errors';
import type {
  AIProvider,
  AIProviderCapability,
  AIProviderRequest,
  AIProviderResponse
} from '../types';

type SpawnFn = typeof nodeSpawn;
type Json = Record<string, any>;

const SETUP_HINT = 'Set CATALYST_ACP_COMMAND to an ACP agent command (e.g. "gemini --experimental-acp").';

/**
 * ACP AI provider
 *
 * @req FR:ai-provider-acp/acp.interface
 * @req FR:ai-provider-acp/acp.protocol
 */
export class AcpProvider implements AIProvider {
  /** @req FR:ai-provider-acp/acp.interface */
  readonly name = 'acp';

  /** @req FR:ai-provider/provider.interface */
  readonly displayName = 'ACP Agent';

  /** @req FR:ai-provider-acp/acp.interface */
  readonly capabilities: AIProviderCapability[] = ['headless'];

  /** @req NFR:ai-provider-acp/acp.performance.instantiation */
  constructor(private readonly spawnFn: SpawnFn = nodeSpawn) {}

  /**
   * @req FR:ai-provider-acp/acp.config.command
   */
  private getCommand(): string[] {
    const parts = (process.env.CATALYST_ACP_COMMAND || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      throw new CatalystError('ACP agent command is not configured', 'AIProviderUnavailable', SETUP_HINT);
    }
    return parts;
  }

  /** @req FR:ai-provider-acp/acp.config.available */
  async isAvailable(): Promise<boolean> {
    try {
      return resolveExecutable(this.getCommand()[0]);
    } catch {
      return false;
    }
  }

  /** @req FR:ai-provider-acp/acp.config.signin */
  async signIn(): Promise<void> {
    const [exe] = this.getCommand();
    if (!resolveExecutable(exe)) {
      throw new CatalystError(`ACP agent "${exe}" not found`, 'AIProviderUnavailable', SETUP_HINT);
    }
  }

  /**
   * @req FR:ai-provider-acp/acp.execute
   * @req FR:ai-provider-acp/acp.cancel
   * @req FR:ai-provider-acp/acp.permissions.default
   * @req FR:ai-provider-acp/acp.permissions.allow
   * @req FR:ai-provider-acp/acp.permissions.unsupported
   * @req FR:ai-provider-acp/acp.errors.process
   * @req FR:ai-provider-acp/acp.errors.rpc
   */
  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    const [cmd, ...args] = this.getCommand();
    const allow = process.env.CATALYST_ACP_PERMISSIONS === 'allow';
    const proc = this.spawnFn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let nextId = 1;
    let stderrTail = '';
    let content = '';
    let sessionId: string | undefined;
    let timer: NodeJS.Timeout | undefined;
    let finished = false;
    const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
    let fail!: (e: Error) => void;
    const failed = new Promise<never>((_, rej) => { fail = rej; });
    failed.catch(() => undefined);

    const write = (m: Json): void => {
      if (!proc.stdin?.destroyed) {proc.stdin?.write(JSON.stringify({ jsonrpc: '2.0', ...m }) + '\n');}
    };
    const call = (method: string, params: Json): Promise<any> => {
      const id = nextId++;
      const p = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      write({ id, method, params });
      return p;
    };
    const arm = (): void => {
      if (timer) {clearTimeout(timer);}
      timer = setTimeout(() => {
        fail(new CatalystError(
          'ACP agent timed out due to inactivity',
          'AIProviderTimeout',
          'The request took too long. Try again or increase the timeout.'
        ));
      }, request.inactivityTimeout);
    };
    const procError = (reason: string): CatalystError => new CatalystError(
      `ACP agent ${reason}${stderrTail ? `: ${stderrTail.trim()}` : ''}`,
      'AIProviderError',
      'Check CATALYST_ACP_COMMAND and that the agent is signed in.'
    );

    proc.stderr?.on('data', (d: Buffer) => { stderrTail = (stderrTail + d.toString()).slice(-500); });
    proc.on('error', (e: NodeJS.ErrnoException) => {
      fail(e.code === 'ENOENT'
        ? new CatalystError(`ACP agent "${cmd}" not found`, 'AIProviderUnavailable', SETUP_HINT)
        : procError(`failed to start (${e.message})`));
    });
    proc.on('exit', (code: number | null) => {
      if (!finished) {setImmediate(() => fail(procError(`exited unexpectedly (code ${code})`)));}
    });

    const onMessage = (m: Json): void => {
      arm();
      if (m.method === 'session/update') {
        const u = m.params?.update;
        if (u?.sessionUpdate === 'agent_message_chunk' && u.content?.type === 'text') {content += u.content.text;}
      } else if (m.method === 'session/request_permission') {
        const opts: Json[] = m.params?.options || [];
        const pick = opts.find(o => o.kind === (allow ? 'allow_once' : 'reject_once'))
          ?? (allow ? undefined : opts.find(o => String(o.kind).startsWith('reject')));
        write({ id: m.id, result: { outcome: pick ? { outcome: 'selected', optionId: pick.optionId } : { outcome: 'cancelled' } } });
      } else if (m.method && m.id !== undefined) {
        write({ id: m.id, error: { code: -32601, message: `Method not supported: ${m.method}` } });
      } else if (m.id !== undefined && pending.has(m.id)) {
        const p = pending.get(m.id)!;
        pending.delete(m.id);
        if (m.error) {p.reject(new CatalystError(`ACP agent error: ${m.error.message}`, 'AIProviderError', 'Check the agent configuration and sign-in.'));}
        else {p.resolve(m.result);}
      }
    };

    let buf = '';
    proc.stdout?.on('data', (d: Buffer) => {
      buf += d.toString();
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) {continue;}
        try { onMessage(JSON.parse(line)); } catch { /* ignore non-JSON output */ }
      }
    });

    let aborted: (() => void) | undefined;
    const abort = new Promise<never>((_, rej) => {
      aborted = () => rej(new CatalystError('ACP request cancelled', 'AIProviderError', 'The request was aborted.'));
    });
    abort.catch(() => undefined);
    if (request.abortSignal?.aborted) {aborted!();}
    request.abortSignal?.addEventListener('abort', aborted!, { once: true });

    const run = async (): Promise<AIProviderResponse> => {
      await call('initialize', { protocolVersion: 1, clientCapabilities: {} });
      const session = await call('session/new', { cwd: process.cwd(), mcpServers: [] });
      sessionId = session.sessionId;
      const text = request.systemPrompt ? `${request.systemPrompt}\n\n${request.prompt}` : request.prompt;
      const res = await call('session/prompt', { sessionId, prompt: [{ type: 'text', text }] });
      if (res?.stopReason === 'refusal') {
        throw new CatalystError('ACP agent refused the request', 'AIProviderError', 'Rephrase the prompt or try another agent.');
      }
      return { content, model: request.model || 'acp', metadata: { stopReason: res?.stopReason } };
    };

    arm();
    try {
      return await Promise.race([run(), failed, abort]);
    } catch (e) {
      if (sessionId) {write({ method: 'session/cancel', params: { sessionId } });}
      throw e;
    } finally {
      finished = true;
      if (timer) {clearTimeout(timer);}
      request.abortSignal?.removeEventListener('abort', aborted!);
      proc.kill();
    }
  }
}

/** True when `exe` is an executable path or found on PATH */
function resolveExecutable(exe: string): boolean {
  const candidates = path.isAbsolute(exe) || exe.includes(path.sep)
    ? [exe]
    : (process.env.PATH || '').split(path.delimiter).filter(Boolean).map(d => path.join(d, exe));
  return candidates.some(c => {
    try { accessSync(c, constants.X_OK); return true; } catch { return false; }
  });
}
