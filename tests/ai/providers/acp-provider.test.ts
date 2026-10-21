/**
 * Tests for AcpProvider using a scripted fake agent over in-memory streams
 */

import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { AcpProvider } from '@ai/providers/acp-provider';
import { CatalystError } from '@core/errors';
import type { AIProviderRequest } from '@ai/types';

type Msg = Record<string, any>;

/** Fake agent process; `onMessage` scripts replies to each client message */
function fakeSpawn(onMessage: (m: Msg, send: (m: Msg) => void, proc: any) => void) {
  const spawned: { cmd?: string; args?: string[]; proc?: any; received: Msg[] } = { received: [] };
  const spawn = jest.fn((cmd: string, args: string[]) => {
    const proc: any = new EventEmitter();
    proc.stdin = new PassThrough();
    proc.stdout = new PassThrough();
    proc.stderr = new PassThrough();
    proc.kill = jest.fn(() => { proc.emit('exit', null, 'SIGTERM'); return true; });
    const send = (m: Msg) => proc.stdout.write(JSON.stringify(m) + '\n');
    let buf = '';
    proc.stdin.on('data', (d: Buffer) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        const m = JSON.parse(line);
        spawned.received.push(m);
        onMessage(m, send, proc);
      }
    });
    Object.assign(spawned, { cmd, args, proc });
    return proc;
  });
  return { spawn, spawned };
}

/** Standard happy-path script */
const happy = (chunks: string[], stopReason = 'end_turn') => (m: Msg, send: any) => {
  if (m.method === 'initialize') send({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: 1 } });
  else if (m.method === 'session/new') send({ jsonrpc: '2.0', id: m.id, result: { sessionId: 's1' } });
  else if (m.method === 'session/prompt') {
    for (const text of chunks) {
      send({ jsonrpc: '2.0', method: 'session/update', params: { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } } } });
    }
    send({ jsonrpc: '2.0', id: m.id, result: { stopReason } });
  }
};

const req = (o?: Partial<AIProviderRequest>): AIProviderRequest => ({
  systemPrompt: 'SYS', prompt: 'USER', inactivityTimeout: 5000, ...o
});

/**
 * @req FR:ai-provider-acp/acp
 */
describe('AcpProvider', () => {
  const OLD = { ...process.env };
  beforeEach(() => { process.env.CATALYST_ACP_COMMAND = 'myagent --acp'; delete process.env.CATALYST_ACP_PERMISSIONS; });
  afterEach(() => { process.env = { ...OLD }; });

  /** @req FR:ai-provider-acp/acp.interface */
  it('implements AIProvider', () => {
    const p = new AcpProvider();
    expect(p.name).toBe('acp');
    expect(p.capabilities).toContain('headless');
    expect(typeof p.execute).toBe('function');
  });

  /** @req FR:ai-provider-acp/acp.config.command @req FR:ai-provider-acp/acp.protocol */
  it('spawns configured command and runs initialize/new/prompt', async () => {
    const { spawn, spawned } = fakeSpawn(happy(['ok']));
    const p = new AcpProvider(spawn as any);
    await p.execute(req());
    expect(spawned.cmd).toBe('myagent');
    expect(spawned.args).toEqual(['--acp']);
    expect(spawned.received.map(m => m.method)).toEqual(['initialize', 'session/new', 'session/prompt']);
    expect(spawned.received[0].params).toMatchObject({ protocolVersion: 1, clientCapabilities: {} });
    expect(spawned.received[1].params.mcpServers).toEqual([]);
  });

  /** @req FR:ai-provider-acp/acp.execute */
  it('sends system+user prompt, joins chunks, kills agent', async () => {
    const { spawn, spawned } = fakeSpawn(happy(['Hel', 'lo']));
    const res = await new AcpProvider(spawn as any).execute(req({ model: 'm1' }));
    expect(res.content).toBe('Hello');
    expect(res.model).toBe('m1');
    const text = spawned.received[2].params.prompt[0];
    expect(text.type).toBe('text');
    expect(text.text).toContain('SYS');
    expect(text.text).toContain('USER');
    expect(spawned.proc.kill).toHaveBeenCalled();
  });

  /** @req FR:ai-provider-acp/acp.execute */
  it('defaults model to acp', async () => {
    const { spawn } = fakeSpawn(happy(['x']));
    expect((await new AcpProvider(spawn as any).execute(req())).model).toBe('acp');
  });

  /** @req FR:ai-provider-acp/acp.execute */
  it('throws AIProviderError on refusal', async () => {
    const { spawn } = fakeSpawn(happy([], 'refusal'));
    await expect(new AcpProvider(spawn as any).execute(req())).rejects.toMatchObject({ code: 'AIProviderError' });
  });

  /** @req FR:ai-provider-acp/acp.errors.rpc */
  it('throws AIProviderError on JSON-RPC error', async () => {
    const { spawn, spawned } = fakeSpawn((m, send) => {
      if (m.method === 'initialize') send({ jsonrpc: '2.0', id: m.id, error: { code: -32000, message: 'auth required' } });
    });
    await expect(new AcpProvider(spawn as any).execute(req())).rejects.toThrow(/auth required/);
    expect(spawned.proc.kill).toHaveBeenCalled();
  });

  /** @req FR:ai-provider-acp/acp.config.command @req FR:ai-provider-acp/acp.config.signin */
  it('throws AIProviderUnavailable when command unset', async () => {
    delete process.env.CATALYST_ACP_COMMAND;
    const p = new AcpProvider(jest.fn() as any);
    await expect(p.execute(req())).rejects.toMatchObject({ code: 'AIProviderUnavailable' });
    await expect(p.signIn()).rejects.toMatchObject({ code: 'AIProviderUnavailable' });
    expect(await p.isAvailable()).toBe(false);
  });

  /** @req FR:ai-provider-acp/acp.errors.process */
  it('throws when agent exits early, including stderr', async () => {
    const { spawn } = fakeSpawn((m, _s, proc) => {
      proc.stderr.write('boom: bad flag\n');
      setImmediate(() => proc.emit('exit', 2, null));
    });
    const err = await new AcpProvider(spawn as any).execute(req()).catch(e => e);
    expect(err).toBeInstanceOf(CatalystError);
    expect(err.message).toContain('boom: bad flag');
  });

  /** @req FR:ai-provider-acp/acp.errors.process */
  it('throws AIProviderUnavailable on spawn error', async () => {
    const spawn = jest.fn(() => {
      const proc: any = new EventEmitter();
      proc.stdin = new PassThrough(); proc.stdout = new PassThrough(); proc.stderr = new PassThrough();
      proc.kill = jest.fn();
      setImmediate(() => proc.emit('error', Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' })));
      return proc;
    });
    await expect(new AcpProvider(spawn as any).execute(req())).rejects.toMatchObject({ code: 'AIProviderUnavailable' });
  });

  /** @req FR:ai-provider-acp/acp.cancel */
  it('times out on inactivity and sends session/cancel', async () => {
    const { spawn, spawned } = fakeSpawn((m, send) => {
      if (m.method === 'initialize') send({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: 1 } });
      else if (m.method === 'session/new') send({ jsonrpc: '2.0', id: m.id, result: { sessionId: 's1' } });
      // never answer session/prompt
    });
    await expect(new AcpProvider(spawn as any).execute(req({ inactivityTimeout: 50 })))
      .rejects.toMatchObject({ code: 'AIProviderTimeout' });
    expect(spawned.received.some(m => m.method === 'session/cancel')).toBe(true);
    expect(spawned.proc.kill).toHaveBeenCalled();
  });

  /** @req FR:ai-provider-acp/acp.cancel */
  it('aborts via abortSignal', async () => {
    const ac = new AbortController();
    const { spawn, spawned } = fakeSpawn((m, send) => {
      if (m.method === 'initialize') send({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: 1 } });
      else if (m.method === 'session/new') { send({ jsonrpc: '2.0', id: m.id, result: { sessionId: 's1' } }); setTimeout(() => ac.abort(), 10); }
    });
    await expect(new AcpProvider(spawn as any).execute(req({ abortSignal: ac.signal }))).rejects.toBeInstanceOf(CatalystError);
    expect(spawned.proc.kill).toHaveBeenCalled();
  });

  const permScript = (answers: Msg[]) => (m: Msg, send: any) => {
    if (m.method === 'initialize') send({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: 1 } });
    else if (m.method === 'session/new') send({ jsonrpc: '2.0', id: m.id, result: { sessionId: 's1' } });
    else if (m.method === 'session/prompt') {
      send({ jsonrpc: '2.0', id: 99, method: 'session/request_permission', params: { sessionId: 's1', toolCall: { toolCallId: 't' }, options: [
        { optionId: 'a', kind: 'allow_once', name: 'Allow' }, { optionId: 'r', kind: 'reject_once', name: 'Reject' }] } });
      send({ jsonrpc: '2.0', id: 100, method: 'fs/read_text_file', params: { path: '/x' } });
      (send as any).pending = m.id;
      setTimeout(() => send({ jsonrpc: '2.0', id: m.id, result: { stopReason: 'end_turn' } }), 20);
    } else if (m.id === 99 || m.id === 100) answers.push(m);
  };

  /** @req FR:ai-provider-acp/acp.permissions.default @req FR:ai-provider-acp/acp.permissions.unsupported */
  it('rejects permissions by default and errors on unsupported requests', async () => {
    const answers: Msg[] = [];
    const { spawn } = fakeSpawn(permScript(answers));
    await new AcpProvider(spawn as any).execute(req());
    expect(answers.find(a => a.id === 99)!.result.outcome).toEqual({ outcome: 'selected', optionId: 'r' });
    expect(answers.find(a => a.id === 100)!.error.code).toBe(-32601);
  });

  /** @req FR:ai-provider-acp/acp.permissions.allow */
  it('allows permissions when CATALYST_ACP_PERMISSIONS=allow', async () => {
    process.env.CATALYST_ACP_PERMISSIONS = 'allow';
    const answers: Msg[] = [];
    const { spawn } = fakeSpawn(permScript(answers));
    await new AcpProvider(spawn as any).execute(req());
    expect(answers.find(a => a.id === 99)!.result.outcome).toEqual({ outcome: 'selected', optionId: 'a' });
  });

  /** @req NFR:ai-provider-acp/acp.performance.instantiation */
  it('does not spawn in constructor', () => {
    const spawn = jest.fn();
    new AcpProvider(spawn as any);
    expect(spawn).not.toHaveBeenCalled();
  });
});
