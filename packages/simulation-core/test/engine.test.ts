import { createHash } from 'node:crypto';
import golden from './fixtures/motion-v0.1.0.json' with { type: 'json' };
import { describe, expect, it, vi } from 'vitest';
import {
  WorldStateSchema,
  ScenarioSchema,
  InputEventSchema,
  type InputEvent,
} from '@hockey-iq/contracts';
import { scenarioFixture } from '../../contracts/test/fixtures.js';
import {
  canonicalJson,
  canonicalSnapshot,
  clampToRink,
  DEFAULT_PHYSICS,
  DeterministicSimulation,
  DT,
  nextRandom,
} from '../src/index.js';
const passInput = (
  tick = 1,
  sequence = 0,
): Extract<InputEvent, { kind: 'pass_requested' }> => ({
  schemaVersion: 1,
  kind: 'pass_requested',
  tick,
  sequence,
  fromPlayerId: 'a-0',
  targetPoint: { x: 20, y: 20 },
});
function motionScenario() {
  const scenario = scenarioFixture();
  scenario.players[0]!.objective = {
    kind: 'support',
    targetPoint: { x: 33, y: 6 },
  };
  scenario.players[1]!.vel = { x: 2, y: 0 };
  scenario.puck.holderId = 'a-0';
  scenario.puck.pos = { ...scenario.players[0]!.pos };
  return scenario;
}
describe('deterministic fixed-step simulation', () => {
  it('matches the versioned golden trace at ticks 0–300', () => {
    const engine = new DeterministicSimulation(
      ScenarioSchema.parse(golden.scenario),
    );
    const inputs = golden.inputs.map((input) => InputEventSchema.parse(input));
    expect(engine.hash).toBe(golden.hashes['0']);
    for (let tick = 1; tick <= 300; tick++) {
      const actual = engine.step(inputs.filter((input) => input.tick === tick));
      const expected = (golden.hashes as Record<string, string>)[String(tick)];
      if (expected) expect(actual.trace.hash).toBe(expected);
    }
  });
  it('repeats the complete hash sequence with the same scenario and inputs', () => {
    const a = new DeterministicSimulation(motionScenario()),
      b = new DeterministicSimulation(motionScenario());
    for (let tick = 1; tick <= 300; tick++) {
      const inputs = tick === 15 ? [passInput(tick)] : [];
      expect(a.step(inputs).trace.hash).toBe(b.step(inputs).trace.hash);
    }
  });
  it('canonicalizes player/team/key order before decisions and hashing', () => {
    const scenario = motionScenario(),
      reversed = structuredClone(scenario);
    reversed.players.reverse();
    reversed.teams.reverse();
    reversed.tacticsByTeam = {
      b: reversed.tacticsByTeam.b!,
      a: reversed.tacticsByTeam.a!,
    };
    const a = new DeterministicSimulation(scenario),
      b = new DeterministicSimulation(reversed);
    expect(a.hash).toBe(b.hash);
    for (let tick = 1; tick <= 100; tick++)
      expect(a.step(tick === 1 ? [passInput()] : []).trace.hash).toBe(
        b.step(tick === 1 ? [passInput()] : []).trace.hash,
      );
  });
  it('matches Node SHA-256 over the documented canonical bytes', () => {
    const engine = new DeterministicSimulation(motionScenario());
    expect(engine.hash).toBe(
      createHash('sha256')
        .update(canonicalSnapshot(engine.snapshot))
        .digest('hex'),
    );
    expect(canonicalJson({ b: -0, a: 1 })).toBe('{"a":1,"b":0}');
    expect(() => canonicalJson({ x: Infinity })).toThrow('NONFINITE_STATE');
  });
  it('normalizes absent and explicitly undefined optional fields identically', () => {
    const scenario = motionScenario();
    const original = new DeterministicSimulation(scenario).hash;
    scenario.players[0]!.stamina = undefined;
    expect(new DeterministicSimulation(scenario).hash).toBe(original);
  });
  it('resumes from a mid-pass snapshot without losing RNG, cooldown or sequence state', () => {
    const a = new DeterministicSimulation(motionScenario());
    a.step([passInput()]);
    const saved = a.snapshot,
      b = DeterministicSimulation.restore(saved);
    expect(b.hash).toBe(a.hash);
    for (let tick = 2; tick <= 150; tick++)
      expect(a.step().trace.hash).toBe(b.step().trace.hash);
    saved.world.players[0]!.pos.x = -100;
    expect(b.snapshot.world.players[0]!.pos.x).not.toBe(-100);
  });
  it('rejects physically invalid snapshots rather than silently resuming them', () => {
    const engine = new DeterministicSimulation(motionScenario()),
      snapshot = engine.snapshot;
    snapshot.world.players[0]!.vel.x = 100;
    expect(() => DeterministicSimulation.restore(snapshot)).toThrow(
      'INVALID_PHYSICAL_SNAPSHOT',
    );
  });
  it('does not use global randomness or wall-clock time', () => {
    const engine = new DeterministicSimulation(motionScenario());
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('GLOBAL_RANDOM');
    });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('WALL_CLOCK');
    });
    try {
      for (let tick = 1; tick <= 30; tick++)
        engine.step(tick === 1 ? [passInput()] : []);
    } finally {
      random.mockRestore();
      now.mockRestore();
    }
    expect(engine.snapshot.world.tick).toBe(30);
  });
  it('supports seed zero and advances seeded randomness only for valid passes', () => {
    expect(nextRandom(0)).toEqual(nextRandom(0));
    expect(nextRandom(0).state).not.toBe(0);
    const scenario = motionScenario();
    scenario.seed = 0;
    const zero = new DeterministicSimulation(scenario);
    zero.step([passInput()]);
    scenario.seed = 1;
    const one = new DeterministicSimulation(scenario);
    one.step([passInput()]);
    expect(zero.snapshot.world.puck.vel).not.toEqual(
      one.snapshot.world.puck.vel,
    );
  });
});
describe('movement, geometry and puck physics', () => {
  it('integrates velocity at exactly 1/30 s', () => {
    const scenario = scenarioFixture();
    scenario.players[0]!.vel.x = 3;
    const world = new DeterministicSimulation(scenario).step().snapshot.world;
    expect(world.players.find((p) => p.id === 'a-0')!.pos.x).toBe(20 + 3 * DT);
  });
  it('limits acceleration and turning while steering and stops near the target', () => {
    const scenario = scenarioFixture(),
      player = scenario.players[0]!;
    player.heading = Math.PI;
    player.objective = { kind: 'support', targetPoint: { x: 25, y: 4 } };
    const engine = new DeterministicSimulation(scenario);
    let previous = engine.snapshot.world.players[0]!;
    for (let tick = 1; tick <= 180; tick++) {
      const current = engine
        .step()
        .snapshot.world.players.find((p) => p.id === player.id)!;
      expect(
        Math.hypot(
          current.vel.x - previous.vel.x,
          current.vel.y - previous.vel.y,
        ),
      ).toBeLessThanOrEqual(DEFAULT_PHYSICS.acceleration * DT + 0.000003);
      expect(
        Math.abs(
          Math.atan2(
            Math.sin(current.heading - previous.heading),
            Math.cos(current.heading - previous.heading),
          ),
        ),
      ).toBeLessThanOrEqual(DEFAULT_PHYSICS.maxTurnRate * DT + 0.000002);
      previous = current;
    }
    expect(Math.hypot(previous.pos.x - 25, previous.pos.y - 4)).toBeLessThan(
      0.3,
    );
    expect(Math.hypot(previous.vel.x, previous.vel.y)).toBeLessThan(0.3);
  });
  it('keeps skaters and the puck inside rounded bounds under extreme initial velocities', () => {
    const scenario = scenarioFixture();
    scenario.players.forEach((p, index) => {
      p.pos = {
        x: index % 2 ? 0 : scenario.rink.length,
        y: index % 3 ? 0 : scenario.rink.width,
      };
      p.vel = { x: index % 2 ? -1e100 : 1e100, y: index % 3 ? -1e100 : 1e100 };
    });
    scenario.puck.pos = { x: 0, y: 0 };
    scenario.puck.vel = { x: -10000, y: -10000 };
    const engine = new DeterministicSimulation(scenario);
    for (let tick = 1; tick <= 300; tick++) {
      const world = engine.step().snapshot.world;
      expect(WorldStateSchema.safeParse(world).success).toBe(true);
      for (const player of world.players) {
        const bounded = clampToRink(
          player.pos,
          world.rink,
          DEFAULT_PHYSICS.playerRadius,
        );
        expect(
          Math.hypot(bounded.x - player.pos.x, bounded.y - player.pos.y),
        ).toBeLessThan(0.000002);
        expect(Math.hypot(player.vel.x, player.vel.y)).toBeLessThanOrEqual(
          DEFAULT_PHYSICS.maxPlayerSpeed + 0.000002,
        );
      }
    }
  });
  it('moves a held puck with its holder and emits no invented tactical role changes', () => {
    const engine = new DeterministicSimulation(motionScenario());
    for (let i = 0; i < 30; i++) engine.step();
    const world = engine.snapshot.world,
      holder = world.players.find((p) => p.id === world.puck.holderId)!;
    expect(world.puck.pos).toEqual(holder.pos);
    expect(world.players.every((p) => p.role === null)).toBe(true);
  });
  it('reflects a free puck from the boards and applies drag', () => {
    const scenario = scenarioFixture();
    scenario.puck.pos = { x: 30, y: 0.31 };
    scenario.puck.vel = { x: 0, y: -10 };
    const puck = new DeterministicSimulation(scenario).step().snapshot.world
      .puck;
    expect(puck.vel.y).toBeGreaterThan(0);
    expect(Math.hypot(puck.vel.x, puck.vel.y)).toBeLessThan(10);
  });
  it('resolves a coincident pair with stable ordering', () => {
    const scenario = scenarioFixture();
    scenario.players[1]!.pos = { ...scenario.players[0]!.pos };
    const world = new DeterministicSimulation(scenario).step().snapshot.world;
    expect(
      Math.hypot(
        world.players[0]!.pos.x - world.players[1]!.pos.x,
        world.players[0]!.pos.y - world.players[1]!.pos.y,
      ),
    ).toBeGreaterThanOrEqual(2 * DEFAULT_PHYSICS.playerRadius - 0.000002);
  });
  it('receives a pass using swept pickup and blocks the passer from immediate recapture', () => {
    const scenario = scenarioFixture();
    scenario.puck.holderId = 'a-0';
    scenario.puck.pos = { ...scenario.players[0]!.pos };
    scenario.players[1]!.pos = { x: 26, y: 4 };
    scenario.players[1]!.heading = Math.PI;
    const engine = new DeterministicSimulation(scenario);
    const first = engine.step([
      { ...passInput(), targetPoint: { x: 26, y: 4 } },
    ]);
    expect(first.snapshot.world.puck.holderId).toBeNull();
    const holders: (string | null)[] = [];
    for (let i = 0; i < 30; i++)
      holders.push(engine.step().snapshot.world.puck.holderId);
    expect(holders).toContain('a-1');
    expect(holders.slice(0, 10)).not.toContain('a-0');
  });
});
describe('input transactions, traces and event observers', () => {
  it('rejects invalid tick, sequence, reference and bounds atomically', () => {
    const engine = new DeterministicSimulation(motionScenario()),
      initial = engine.hash;
    for (const input of [
      { ...passInput(), tick: 0 },
      { ...passInput(), fromPlayerId: 'other' },
      { ...passInput(), targetPoint: { x: -1, y: 4 } },
    ]) {
      expect(() => engine.step([input])).toThrow();
      expect(engine.hash).toBe(initial);
    }
    expect(() => engine.step([passInput(), passInput()])).toThrow(
      'INVALID_INPUT_ORDER',
    );
    expect(engine.hash).toBe(initial);
  });
  it('records inapplicable passes without consuming RNG or dropping ticks', () => {
    const engine = new DeterministicSimulation(scenarioFixture());
    const frame = engine.step([passInput()]);
    expect(frame.trace.rejectedInputs).toEqual([
      { sequence: 0, reason: 'NOT_PUCK_HOLDER' },
    ]);
    expect(frame.snapshot.world.rngState).toBe(frame.snapshot.world.seed);
    expect(frame.snapshot.world.tick).toBe(1);
  });
  it('prevents observer re-entry from advancing the committed state', () => {
    const engine = new DeterministicSimulation(motionScenario());
    engine.events.subscribe(() => {
      engine.step();
    });
    engine.step([passInput()]);
    expect(engine.snapshot.world.tick).toBe(1);
    expect(
      engine.events
        .drainErrors()
        .every(
          (error) =>
            error instanceof Error && error.message === 'REENTRANT_STEP',
        ),
    ).toBe(true);
  });
  it('isolates subscriber failures and mutations from authoritative state', () => {
    const engine = new DeterministicSimulation(motionScenario()),
      control = new DeterministicSimulation(motionScenario());
    let count = 0;
    const off = engine.events.subscribe((event) => {
      count++;
      event.tick = 999;
      throw new Error('observer');
    });
    const actual = engine.step([passInput()]),
      expected = control.step([passInput()]);
    expect(actual.trace).toEqual(expected.trace);
    expect(engine.hash).toBe(control.hash);
    expect(count).toBeGreaterThan(0);
    expect(engine.events.drainErrors().length).toBeGreaterThan(0);
    off();
    engine.events.subscribe(() => {
      engine.step();
    });
    const snapshot = engine.snapshot;
    snapshot.world.players[0]!.pos.x = 0;
    expect(engine.snapshot.world.players[0]!.pos.x).not.toBe(0);
  });
});
