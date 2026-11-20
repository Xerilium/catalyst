/**
 * Tests for `catalyst autonomy` subcommands, wired to fake ports.
 */

import { runAutonomy, type AutonomyEnv } from '../../../src/cli/commands/autonomy';
import type { LedgerEntry } from '../../../src/autonomy/types';

function env(configText: string | undefined = JSON.stringify({ autonomy: { enabled: true } })) {
  const out: string[] = [];
  const ledger: LedgerEntry[] = [];
  const state = { stop: undefined as string | undefined, stops: [] as string[], labels: [] as string[] };
  const e: AutonomyEnv = {
    print: (line) => out.push(line),
    repo: 'acme/app',
    stops: {
      createStop: (all) => state.stops.push(all ? 'stop-all' : 'stop'),
      removeStop: (all) => state.stops.push(all ? 'resume-all' : 'resume'),
    },
    ports: {
      clock: () => new Date('2026-11-19T12:00:00Z'),
      repo: { configText: () => configText, configCommit: () => 'abc1234' },
      store: { readLedger: () => [...ledger], append: (x) => ledger.push(x), stopFile: () => state.stop },
      github: {
        viewer: async () => 'bot',
        pullRequest: async (n) => ({ number: n, author: 'bot', state: 'OPEN', isDraft: false, labels: [], files: [] }),
        addLabel: async (_n, l) => {
          state.labels.push(l);
        },
        comment: async () => undefined,
      },
    },
  };
  return { e, out, ledger, state };
}

describe('catalyst autonomy', () => {
  // @req FR:autonomy/autopilot.@cli
  // @req FR:autonomy/autopilot.output
  it('autopilot prints the decision as text or JSON', async () => {
    const t = env();
    await runAutonomy('autopilot', ['12'], { loopResult: 'clean', rounds: '2' }, t.e);
    expect(t.out.join('\n')).toMatch(/apply/);
    expect(t.state.labels).toHaveLength(1);
    const j = env();
    await runAutonomy('autopilot', ['12'], { loopResult: 'clean', json: true, dryRun: true }, j.e);
    expect(JSON.parse(j.out.join('\n'))).toEqual({ decision: 'apply', pr: 12, reasons: [], applied: false });
  });

  it('autopilot rejects a missing or bad PR number and bad options', async () => {
    await expect(runAutonomy('autopilot', [], {}, env().e)).rejects.toMatchObject({ code: 'InvalidInput' });
    await expect(runAutonomy('autopilot', ['x'], {}, env().e)).rejects.toMatchObject({ code: 'InvalidInput' });
    await expect(runAutonomy('autopilot', ['1'], { loopResult: 'meh' }, env().e)).rejects.toMatchObject({ code: 'InvalidInput' });
    await expect(runAutonomy('autopilot', ['1'], { reason: ['vibes'] }, env().e)).rejects.toMatchObject({ code: 'InvalidInput' });
    await expect(runAutonomy('bogus', [], {}, env().e)).rejects.toMatchObject({ code: 'InvalidInput' });
  });

  // @req FR:autonomy/never.@cli
  // @req FR:autonomy/never.exit
  it('guard exits non-zero and names the category for a blocked command', async () => {
    const t = env();
    await expect(runAutonomy('guard', ['npm', 'publish'], {}, t.e)).rejects.toMatchObject({
      code: 'AutonomyCommandBlocked',
      message: expect.stringMatching(/release/),
    });
    await runAutonomy('guard', ['git', 'push', '--force-with-lease'], {}, t.e);
    expect(t.out).toEqual(['allowed']);
  });

  // @req FR:autonomy/stop.@cli
  it('stop and resume manage the STOP files', async () => {
    const t = env();
    await runAutonomy('stop', [], {}, t.e);
    await runAutonomy('stop', [], { all: true }, t.e);
    await runAutonomy('resume', [], {}, t.e);
    await runAutonomy('resume', [], { all: true }, t.e);
    expect(t.state.stops).toEqual(['stop', 'stop-all', 'resume', 'resume-all']);
  });

  // @req FR:autonomy/ledger.@cli
  it('record appends a ledger entry', async () => {
    const t = env();
    await runAutonomy('record', [], { pr: '5', action: 'sweep', detail: 'clean', tokens: '300' }, t.e);
    expect(t.ledger).toEqual([{ at: '2026-11-19T12:00:00.000Z', pr: 5, action: 'sweep', detail: 'clean', tokens: 300 }]);
    await expect(runAutonomy('record', [], { pr: '5' }, t.e)).rejects.toMatchObject({ code: 'InvalidInput' });
  });

  // @req FR:autonomy/status.@cli
  // @req FR:autonomy/status.show
  it('status shows on or off, STOP files, and budget use', async () => {
    const t = env();
    t.ledger.push({ at: '2026-11-19T01:00:00Z', pr: 1, action: 'autopilot' });
    t.state.stop = '/r/.xe/runs/autonomy/STOP';
    await runAutonomy('status', [], {}, t.e);
    const text = t.out.join('\n');
    expect(text).toMatch(/on/);
    expect(text).toMatch(/STOP/);
    expect(text).toMatch(/1 of 10/);
    const j = env('{}');
    await runAutonomy('status', [], { json: true }, j.e);
    expect(JSON.parse(j.out.join('\n'))).toMatchObject({ enabled: false, problems: [], stopFile: null, appliedToday: 0, prsPerDay: 10 });
  });

  // @req FR:autonomy/status.exit
  it('status exits non-zero when the config is invalid', async () => {
    const t = env(JSON.stringify({ autonomy: { enabled: true, budget: { minutes: 0 } } }));
    await expect(runAutonomy('status', [], {}, t.e)).rejects.toMatchObject({ code: 'InvalidInput' });
    expect(t.out.join('\n')).toMatch(/autonomy\.budget\.minutes/);
  });

  // @req FR:autonomy/status.gate
  // @req FR:autonomy/status.gate.skip
  it('gate prints run or skip with a reason as the last line', async () => {
    const last = async (t: ReturnType<typeof env>) => {
      await runAutonomy('gate', [], {}, t.e);
      return t.out[t.out.length - 1];
    };
    expect(await last(env())).toBe('run');
    expect(await last(env('{}'))).toMatch(/^skip autonomy is off/);
    const stopped = env();
    stopped.state.stop = '/x/STOP';
    expect(await last(stopped)).toMatch(/^skip .*STOP/);
    const spent = env(JSON.stringify({ autonomy: { enabled: true, budget: { 'prs-per-day': 1 } } }));
    spent.ledger.push({ at: '2026-11-19T01:00:00Z', pr: 1, action: 'autopilot' });
    expect(await last(spent)).toMatch(/^skip .*daily/);
  });
});
