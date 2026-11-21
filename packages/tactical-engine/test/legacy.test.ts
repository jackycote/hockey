import { it, expect } from 'vitest';
import { systemContentFixture } from '../../contracts/test/system-fixtures.js';
import {
  templateSystem,
  legacyActions,
  zoneContains,
  validateSystem,
} from '@hockey-iq/play-systems';
import { templateScenario } from '@hockey-iq/scenario-schema';
import { TacticalSimulation } from '../src/index.js';
it('interprets bounded v1.1 nested conditions and role settings without executing code', () => {
  const system = templateSystem('FORECHECK_212');
  system.legacy = systemContentFixture();
  system.legacy.rules[0]!.when = {
    event: 'PHASE_CHANGED',
    conditions: {
      operator: 'all',
      conditions: [
        { condition: 'POSSESSION', team: 'opponent' },
        {
          operator: 'not',
          condition: { condition: 'CURRENT_ROLE', role: 'F3' },
        },
      ],
    },
  };
  const sim = new TacticalSimulation(
    templateScenario('FORECHECK_212'),
    system,
    'home',
  );
  sim.step();
  const f = sim.step();
  expect(
    f.decisions
      .filter((d) => d.role === 'F3')
      .every((d) => d.action === 'HOLD_CENTER'),
  ).toBe(true);
  const matched = legacyActions(system.legacy, {
    world: sim.frames[0]!.world,
    teamId: 'home',
    roles: f.roles,
    phase: 'FORECHECK',
    events: ['PHASE_CHANGED'],
    previousSide: '',
  });
  expect(matched.F2!.ruleId).toBe('rule-switch');
  expect(matched.F3!.ruleId).toBe(null);
});
it('mirrors v1.2 normalized zone tests with the controlled attack direction', () => {
  const system = templateSystem('BOARDS_BREAKOUT');
  const sim = new TacticalSimulation(
    templateScenario('BOARDS_BREAKOUT'),
    system,
    'home',
  );
  const world = sim.frames[0]!.world;
  expect(
    zoneContains(system, 'center-low', { x: 10, y: 13 }, world, 'home'),
  ).toBe(true);
  world.teams.find((t) => t.id === 'home')!.attackDirection = 'negative_x';
  expect(
    zoneContains(
      system,
      'center-low',
      { x: world.rink.length - 10, y: 13 },
      world,
      'home',
    ),
  ).toBe(true);
  expect(
    zoneContains(system, 'center-low', { x: 10, y: 13 }, world, 'home'),
  ).toBe(false);
});
it('rejects cycles and impossible distance ranges with stable validation diagnostics', () => {
  const system = templateSystem('D_TO_D_REVERSE');
  system.rules[0]!.actions.push({
    ...system.rules[0]!.actions[0]!,
    role: 'D_SUPPORT',
    targetRole: 'PUCK_RETRIEVER',
  });
  expect(
    validateSystem(system).issues.some((i) => i.code === 'ACTION_CYCLE'),
  ).toBe(true);
  system.rules[0]!.actions.pop();
  system.rules[0]!.conditions.push({
    kind: 'pressure',
    operator: 'gt',
    metres: 5,
  });
  expect(
    validateSystem(system).issues.some(
      (i) => i.code === 'UNREACHABLE_CONDITION',
    ),
  ).toBe(true);
});
it('falls back atomically when the legacy condition budget is exhausted, including nested negation', () => {
  const system = templateSystem('FORECHECK_212'),
    legacy = systemContentFixture();
  const leaf = { condition: 'POSSESSION' as const, team: 'own' as const };
  const expensive = {
    operator: 'any' as const,
    conditions: Array.from({ length: 8 }, () => ({
      operator: 'any' as const,
      conditions: Array.from({ length: 8 }, () => ({ ...leaf })),
    })),
  };
  legacy.rules = Array.from({ length: 64 }, (_, i) => ({
    ...legacy.rules[0]!,
    id: 'budget-' + i,
    when: { event: 'PHASE_CHANGED' as const, conditions: expensive },
  }));
  legacy.rules[63]!.when.conditions = { operator: 'not', condition: expensive };
  system.legacy = legacy;
  const sim = new TacticalSimulation(
    templateScenario('FORECHECK_212'),
    system,
    'home',
  );
  const frame = sim.step();
  expect(
    frame.decisions.every((d) => d.reasonCodes.includes('BUDGET_EXCEEDED')),
  ).toBe(true);
  expect(frame.decisions.every((d) => d.ruleId === null)).toBe(true);
});
it('evaluates a v1.1 phase guard against the current possession phase before choosing objectives', () => {
  const system = templateSystem('FORECHECK_212');
  system.legacy = systemContentFixture();
  system.legacy.rules[0]!.when = {
    event: 'PHASE_CHANGED',
    phase: 'defensive_possession',
  };
  const sim = new TacticalSimulation(
    templateScenario('FORECHECK_212'),
    system,
    'home',
  );
  expect(sim.step().decisions.find((d) => d.role === 'F2')!.ruleId).toBe(
    'rule-switch',
  );
});
