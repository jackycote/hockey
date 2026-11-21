import { describe, it, expect } from 'vitest';
import { TacticalSimulation } from '../src/index.js';
import { templateSystem, validateSystem } from '@hockey-iq/play-systems';
import { templateScenario } from '@hockey-iq/scenario-schema';
import { validateFrozenSequence, frozenSeek } from '../../replay/src/index.js';
import type { TacticalTemplate } from '@hockey-iq/contracts';
const templates: TacticalTemplate[] = [
  'FORECHECK_212',
  'BOARDS_BREAKOUT',
  'D_TO_D_REVERSE',
  'LOW_CENTER_SUPPORT',
  'UNDER_PRESSURE_BREAKOUT',
];
describe('v1.2 deterministic contextual tactics and frozen replay', () => {
  it.each(templates)(
    '%s repeats hashes and preserves physical invariants',
    (template) => {
      const a = new TacticalSimulation(
          templateScenario(template),
          templateSystem(template),
          'home',
        ),
        b = new TacticalSimulation(
          templateScenario(template),
          templateSystem(template),
          'home',
        );
      for (let i = 0; i < 120; i++) {
        const x = a.step(),
          y = b.step();
        expect(x.hash).toBe(y.hash);
        for (const p of x.world.players) {
          expect(p.pos.x).toBeGreaterThanOrEqual(0);
          expect(p.pos.x).toBeLessThanOrEqual(x.world.rink.length);
          expect(p.pos.y).toBeGreaterThanOrEqual(0);
          expect(p.pos.y).toBeLessThanOrEqual(x.world.rink.width);
          expect(Math.hypot(p.vel.x, p.vel.y)).toBeLessThanOrEqual(8.00001);
        }
        expect(new Set(Object.keys(x.roles)).size).toBe(5);
        expect(new Set(Object.values(x.roles)).size).toBe(5);
        if (template !== 'FORECHECK_212')
          expect(Object.values(x.roles)).not.toContain('F1');
      }
      const value = a.recording('Fixture', 'fixture-system', 1);
      expect(validateFrozenSequence(value).frames).toHaveLength(121);
      expect(frozenSeek(value, 42).hash).toBe(value.frames[42]!.hash);
      const original = value.frames[42]!.world.players[0]!.pos.x;
      frozenSeek(value, 42.5).world.players[0]!.pos.x = 99;
      expect(value.frames[42]!.world.players[0]!.pos.x).toBe(original);
    },
  );
  it('reverses under pressure, explains coach rules, and handles interception and successful blue-line transition', () => {
    const sim = new TacticalSimulation(
      templateScenario('D_TO_D_REVERSE'),
      templateSystem('D_TO_D_REVERSE'),
      'home',
    );
    for (let i = 0; i < 90; i++) sim.step();
    expect(
      sim.frames.some((f) => f.decisions.some((d) => d.action === 'REVERSE')),
    ).toBe(true);
    expect(
      sim.frames.some((f) =>
        f.decisions.some((d) => d.ruleId === 'reverse-pressure'),
      ),
    ).toBe(true);
    const intercepted = sim.step([
      {
        schemaVersion: 1,
        kind: 'puck_repositioned',
        tick: 91,
        sequence: 1,
        pos: { x: 15, y: 13 },
        holderId: 'away-1',
      },
    ]);
    expect(intercepted.phase).toBe('TURNOVER_DEFENSE');
    const exited = sim.step([
      {
        schemaVersion: 1,
        kind: 'puck_repositioned',
        tick: 92,
        sequence: 2,
        pos: { x: 25, y: 13 },
        holderId: 'home-2',
      },
      {
        schemaVersion: 1,
        kind: 'player_repositioned',
        tick: 92,
        sequence: 3,
        playerId: 'home-2',
        pos: { x: 25, y: 13 },
      },
    ]);
    expect(exited.phase).toBe('NEUTRAL_ZONE_TRANSITION');
  });
  it('detects contradictory rules and unreachable conditions before publishing', () => {
    const s = templateSystem('D_TO_D_REVERSE');
    s.rules.push({
      ...s.rules[0]!,
      id: 'conflict',
      actions: [
        {
          kind: 'WAIT_SUPPORT',
          role: 'PUCK_RETRIEVER',
          targetRole: null,
          zoneId: null,
          intensity: 0.5,
        },
      ],
    });
    expect(validateSystem(s).valid).toBe(false);
    s.rules[1]!.priority = 90;
    expect(validateSystem(s).valid).toBe(true);
  });
  it('detects tampering and replays without invoking the tactical engine', () => {
    const sim = new TacticalSimulation(
      templateScenario('BOARDS_BREAKOUT'),
      templateSystem('BOARDS_BREAKOUT'),
      'home',
    );
    for (let i = 0; i < 10; i++) sim.step();
    const sequence = sim.recording('Frozen', 'system', 1);
    sequence.frames[3]!.world.players[0]!.pos.x += 1;
    expect(() => validateFrozenSequence(sequence)).toThrow(
      'REPLAY_CHECKSUM_MISMATCH',
    );
  });
});

describe('v1.2 acceptance golden outcomes', () => {
  it.each([
    'BOARDS_BREAKOUT',
    'LOW_CENTER_SUPPORT',
    'UNDER_PRESSURE_BREAKOUT',
  ] as const)(
    '%s receives a real pass and exits with possession and support',
    (template) => {
      const sim = new TacticalSimulation(
        templateScenario(template),
        templateSystem(template),
        'home',
      );
      for (let i = 0; i < 300; i++) sim.step();
      const outlet = sim.frames.find(
        (f) => f.phase === 'NEUTRAL_ZONE_TRANSITION',
      );
      expect(outlet).toBeDefined();
      expect(
        outlet!.world.players.find((p) => p.id === outlet!.world.puck.holderId)
          ?.teamId,
      ).toBe('home');
      expect(sim.inputs.some((i) => i.kind === 'pass_requested')).toBe(true);
      expect(
        sim.frames.some(
          (f) =>
            f.world.puck.holderId?.startsWith('home-') &&
            f.world.puck.holderId !== 'home-4',
        ),
      ).toBe(true);
      expect(
        outlet!.world.players
          .filter(
            (p) => p.teamId === 'home' && p.id !== outlet!.world.puck.holderId,
          )
          .some(
            (p) =>
              Math.hypot(
                p.pos.x - outlet!.world.puck.pos.x,
                p.pos.y - outlet!.world.puck.pos.y,
              ) < 15,
          ),
      ).toBe(true);
    },
  );
  it('reexecutes the complete input journal including a coach instruction with identical hashes', () => {
    const s = templateScenario('LOW_CENTER_SUPPORT'),
      system = templateSystem('LOW_CENTER_SUPPORT');
    const a = new TacticalSimulation(s, system, 'home');
    for (let i = 1; i <= 100; i++)
      a.step(
        i === 25
          ? [
              {
                schemaVersion: 2,
                kind: 'instruction_changed',
                tick: i,
                sequence: 0,
                system: { ...system, pressureMetres: 6, reactionTicks: 24 },
              },
            ]
          : i === 50
            ? [
                {
                  schemaVersion: 1,
                  kind: 'player_repositioned',
                  tick: i,
                  sequence: 0,
                  playerId: 'home-3',
                  pos: { x: 15, y: 20 },
                },
              ]
            : [],
      );
    const b = new TacticalSimulation(s, system, 'home');
    for (let i = 1; i <= 100; i++) b.step(a.inputs.filter((e) => e.tick === i));
    expect(b.frames.map((f) => f.hash)).toEqual(a.frames.map((f) => f.hash));
    expect(a.recording('Instruction', 'system', 1).systemSnapshot).toEqual(
      system,
    );
  });
  it('physical lane interception causes defensive turnover without teleporting possession', () => {
    const s = templateScenario('BOARDS_BREAKOUT');
    s.players.find((p) => p.id === 'away-1')!.pos = { x: 9, y: 8 };
    s.players.find((p) => p.id === 'home-1')!.pos = { x: 17, y: 8 };
    const sim = new TacticalSimulation(
      s,
      templateSystem('BOARDS_BREAKOUT'),
      'home',
    );
    sim.step([
      {
        schemaVersion: 1,
        kind: 'pass_requested',
        tick: 1,
        sequence: 0,
        fromPlayerId: 'home-4',
        targetPoint: { x: 17, y: 8 },
      },
    ]);
    for (let i = 0; i < 90; i++) sim.step();
    expect(
      sim.frames.some(
        (f) =>
          f.phase === 'TURNOVER_DEFENSE' &&
          f.world.puck.holderId?.startsWith('away-'),
      ),
    ).toBe(true);
  });
});

it('recovers a loose puck behind the net and keeps strong-side responsibilities stable during the hold interval', () => {
  const scene = templateScenario('LOW_CENTER_SUPPORT');
  scene.puck = { pos: { x: 3, y: 12 }, vel: { x: 0, y: 0 }, holderId: null };
  const sim = new TacticalSimulation(
    scene,
    templateSystem('LOW_CENTER_SUPPORT'),
    'home',
  );
  for (let i = 0; i < 90; i++) sim.step();
  expect(sim.frames[0]!.phase).toBe('DEFENSIVE_ZONE_RECOVERY');
  expect(sim.frames.some((f) => f.world.puck.holderId === 'home-4')).toBe(true);
  const change = new TacticalSimulation(
    templateScenario('BOARDS_BREAKOUT'),
    templateSystem('BOARDS_BREAKOUT'),
    'home',
  );
  const initial = change.frames[0]!.roles;
  for (let i = 1; i <= 15; i++) {
    const frame = change.step([
      {
        schemaVersion: 1,
        kind: 'puck_repositioned',
        tick: i,
        sequence: 0,
        pos: { x: 5, y: i % 2 ? 23 : 2 },
        holderId: null,
      },
    ]);
    expect(frame.roles).toEqual(initial);
  }
});
it('rejects coherent-hash replay frames whose player identities change between ticks', () => {
  const sim = new TacticalSimulation(
    templateScenario('BOARDS_BREAKOUT'),
    templateSystem('BOARDS_BREAKOUT'),
    'home',
  );
  sim.step();
  const seq = sim.recording('Roster integrity', 'system', 1);
  seq.frames[1]!.world.players[0]!.id = 'unexpected-player';
  expect(() => validateFrozenSequence(seq)).toThrow();
});
it('evaluates configurable pass-lane, angle and interception-time conditions without coach code', () => {
  const system = templateSystem('LOW_CENTER_SUPPORT');
  system.rules = [
    {
      id: 'read-lane',
      priority: 90,
      trigger: 'EVERY_TICK',
      match: 'all',
      conditions: [
        {
          kind: 'pass_lane',
          from: 'PUCK_RETRIEVER',
          to: 'CENTER_LOW',
          clearanceMetres: 1.3,
          open: true,
        },
        {
          kind: 'intercept_time',
          role: 'PUCK_RETRIEVER',
          operator: 'lt',
          seconds: 3,
        },
        {
          kind: 'pressure_angle',
          role: 'PUCK_RETRIEVER',
          operator: 'lt',
          degrees: 90,
        },
      ],
      actions: [
        {
          kind: 'WAIT_SUPPORT',
          role: 'PUCK_RETRIEVER',
          targetRole: null,
          zoneId: null,
          intensity: 0.5,
        },
      ],
      explanation: 'Lire la ligne avant la décision.',
    },
  ];
  const scenario = templateScenario('LOW_CENTER_SUPPORT'),
    sim = new TacticalSimulation(scenario, system, 'home');
  expect(sim.step().decisions.some((d) => d.ruleId === 'read-lane')).toBe(true);
  const blocked = templateScenario('LOW_CENTER_SUPPORT');
  blocked.players.find((p) => p.id === 'away-1')!.pos = { x: 7, y: 10.5 };
  const other = new TacticalSimulation(blocked, system, 'home');
  expect(other.step().decisions.some((d) => d.ruleId === 'read-lane')).toBe(
    false,
  );
});
