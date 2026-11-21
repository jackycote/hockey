import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import type { TacticalTemplate } from '@hockey-iq/contracts';
import { TacticalSimulation } from '../src/index.js';
import { templateSystem } from '@hockey-iq/play-systems';
import { templateScenario } from '@hockey-iq/scenario-schema';
const fixtures = JSON.parse(
  readFileSync(
    new URL('./fixtures/contextual-v1.json', import.meta.url),
    'utf8',
  ),
) as {
  template: TacticalTemplate;
  ticks: number;
  hash: string;
  phase: string;
  puck: { x: number; y: number };
  firstTransition: number | null;
}[];
it.each(fixtures)(
  '$template preserves the reviewed algorithm reference hash and positional metrics',
  (fixture) => {
    const sim = new TacticalSimulation(
      templateScenario(fixture.template),
      templateSystem(fixture.template),
      'home',
    );
    for (let i = 0; i < fixture.ticks; i++) sim.step();
    const frame = sim.frames.at(-1)!;
    expect(frame.hash).toBe(fixture.hash);
    expect(frame.phase).toBe(fixture.phase);
    expect(frame.world.puck.pos.x).toBeCloseTo(fixture.puck.x, 5);
    expect(frame.world.puck.pos.y).toBeCloseTo(fixture.puck.y, 5);
    expect(
      sim.frames.find((f) => f.phase === 'NEUTRAL_ZONE_TRANSITION')?.tick ??
        null,
    ).toBe(fixture.firstTransition);
  },
);
