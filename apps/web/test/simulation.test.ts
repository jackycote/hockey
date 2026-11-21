import { describe, expect, it } from 'vitest';
import {
  SimulationResponseSchema,
  type SimulationCommand,
} from '@hockey-iq/contracts';
import { DeterministicSimulation } from '@hockey-iq/simulation-core';
import { createScenario } from '../src/editor/scenario';
import { SimulationRuntime } from '../src/simulation/runtime';
import { interpolateWorld } from '../src/simulation/interpolation';
const command = (
  type: 'play' | 'pause' | 'step' | 'reset',
  requestId = 2,
): SimulationCommand => ({ protocolVersion: 1, sessionId: 1, requestId, type });
function initialized() {
  const runtime = new SimulationRuntime();
  runtime.handle({
    protocolVersion: 1,
    sessionId: 1,
    requestId: 1,
    type: 'initialize',
    scenario: createScenario(),
  });
  return runtime;
}
describe('Worker runtime command protocol', () => {
  it('initializes, steps, plays, pauses and resets using real engine states', () => {
    const runtime = initialized();
    const one = runtime.handle(command('step'));
    expect(one.type).toBe('frame');
    if (one.type !== 'frame') throw new Error('Expected frame');
    expect(one.snapshot.world.tick).toBe(1);
    expect(SimulationResponseSchema.safeParse(one).success).toBe(true);
    runtime.handle(command('play'));
    expect(runtime.mode).toBe('running');
    expect(() => runtime.handle(command('step'))).toThrow('INVALID_COMMAND');
    runtime.advance();
    runtime.handle(command('pause'));
    expect(runtime.mode).toBe('paused');
    const reset = runtime.handle(command('reset'));
    if (reset.type !== 'frame') throw new Error('Expected frame');
    expect(reset.snapshot.world.tick).toBe(0);
    expect(reset.hash).toBe(new DeterministicSimulation(createScenario()).hash);
  });
  it('queues a pass for the next tick, and clears it on reset', () => {
    const runtime = initialized();
    const queued = runtime.handle({
      protocolVersion: 1,
      sessionId: 1,
      requestId: 3,
      type: 'pass',
      toPlayerId: 'away-1',
    });
    if (queued.type !== 'frame') throw new Error('Expected frame');
    expect(queued.snapshot.world.tick).toBe(0);
    expect(queued.pendingInputs[0]?.tick).toBe(1);
    const frame = runtime.handle(command('step'));
    if (frame.type !== 'frame') throw new Error('Expected frame');
    expect(frame.trace?.inputs[0]?.kind).toBe('pass_requested');
    expect(frame.pendingInputs).toEqual([]);
    expect(frame.snapshot.world.puck.holderId).toBeNull();
    const reset = runtime.handle(command('reset'));
    if (reset.type !== 'frame') throw new Error('Expected frame');
    expect(reset.pendingInputs).toEqual([]);
    expect(reset.snapshot.world.puck.holderId).toBe('away-4');
  });
  it('rejects old sessions, malformed payloads, opponents, self-passes and duplicate queued passes', () => {
    const runtime = initialized();
    expect(() => runtime.handle({ ...command('pause'), sessionId: 0 })).toThrow(
      'NO_SESSION',
    );
    expect(() =>
      runtime.handle({ type: 'initialize', scenario: {} }),
    ).toThrow();
    const pass = {
      protocolVersion: 1,
      sessionId: 1,
      requestId: 3,
      type: 'pass',
    };
    expect(() => runtime.handle({ ...pass, toPlayerId: 'home-1' })).toThrow(
      'INVALID_PASS',
    );
    expect(() => runtime.handle({ ...pass, toPlayerId: 'away-4' })).toThrow(
      'INVALID_PASS',
    );
    runtime.handle({ ...pass, toPlayerId: 'away-1' });
    expect(() => runtime.handle({ ...pass, toPlayerId: 'away-2' })).toThrow(
      'INVALID_PASS',
    );
  });
  it('ends at five simulated minutes without advancing beyond the limit', () => {
    const runtime = initialized();
    for (let tick = 1; tick <= 9000; tick++) runtime.advance();
    expect(runtime.mode).toBe('ended');
    const ended = runtime.advance();
    if (ended.type !== 'frame') throw new Error('Expected frame');
    expect(ended.snapshot.world.tick).toBe(9000);
    runtime.handle(command('reset'));
    expect(runtime.mode).toBe('paused');
  }, 15000);
  it('is independent of UI pacing and produces the same hashes for arbitrary batches', () => {
    const a = initialized(),
      b = initialized();
    for (let i = 0; i < 60; i++) a.advance();
    for (const batch of [5, 10, 1, 20, 24])
      for (let i = 0; i < batch; i++) b.advance();
    const x = a.handle(command('pause')),
      y = b.handle(command('pause'));
    if (x.type !== 'frame' || y.type !== 'frame')
      throw new Error('Expected frames');
    expect(x.hash).toBe(y.hash);
    expect(x.snapshot).toEqual(y.snapshot);
  });
});
describe('render interpolation', () => {
  it('matches IDs across ordering changes and preserves authoritative states', () => {
    const engine = new DeterministicSimulation(createScenario()),
      previous = engine.snapshot.world;
    const current = engine.step().snapshot.world;
    current.players[0]!.pos.x += 1;
    previous.players.reverse();
    const id = current.players[0]!.id,
      before = previous.players.find((p) => p.id === id)!;
    const result = interpolateWorld(previous, current, 0.5);
    expect(result.players.find((p) => p.id === id)!.pos.x).toBe(
      (before.pos.x + current.players[0]!.pos.x) / 2,
    );
    expect(result).not.toBe(current);
    expect(current.players[0]!.pos.x).not.toBe(before.pos.x);
  });
  it('snaps possession switches and reset/nonconsecutive states', () => {
    const engine = new DeterministicSimulation(createScenario()),
      previous = engine.snapshot.world,
      current = engine.step().snapshot.world;
    current.puck.holderId = null;
    current.puck.pos = { x: 30, y: 10 };
    expect(interpolateWorld(previous, current, 0.1).puck.pos).toEqual(
      current.puck.pos,
    );
    expect(interpolateWorld(current, previous, 0.5)).toBe(previous);
    expect(interpolateWorld(previous, current, 1)).toBe(current);
  });
});
