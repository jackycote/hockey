import { describe, it, expect } from 'vitest';
import {
  demonstrationSteps,
  nextStepTick,
  stepIndexAt,
  advanceDemonstration,
} from '../src/platform/demonstration';
import { TacticalSimulation } from '../../../packages/tactical-engine/src/index';
import { templateScenario } from '@hockey-iq/scenario-schema';
import { templateSystem } from '@hockey-iq/play-systems';
function recording(
  template: 'D_TO_D_REVERSE' | 'LOW_CENTER_SUPPORT' = 'D_TO_D_REVERSE',
  ticks = 100,
) {
  const sim = new TacticalSimulation(
    templateScenario(template),
    templateSystem(template),
    'home',
  );
  for (let i = 0; i < ticks; i++) sim.step();
  return sim.recording('Démo', 'system', 1);
}
describe('BKL-037 teaching steps and exact playback boundaries', () => {
  it('derives real D-D passes/receptions, not a step for every frame, without changing any recording data', () => {
    const seq = recording(),
      before = JSON.stringify(seq),
      steps = demonstrationSteps(seq);
    expect(steps[0]!.tick).toBe(0);
    expect(steps.at(-1)!.tick).toBe(100);
    expect(steps.length).toBeLessThan(20);
    expect(steps.some((s) => s.title === 'Renversement D à D')).toBe(true);
    expect(steps.some((s) => s.title === 'Réception')).toBe(true);
    for (const step of steps.filter((s) =>
      ['Passe', 'Renversement D à D'].includes(s.title),
    )) {
      expect(seq.frames[step.tick - 1]!.world.puck.holderId).not.toBeNull();
      expect(seq.frames[step.tick]!.world.puck.holderId).toBeNull();
      expect(
        seq.inputs.some(
          (e) => e.tick === step.tick && e.kind === 'pass_requested',
        ),
      ).toBe(true);
    }
    expect(JSON.stringify(seq)).toBe(before);
  });
  it('merges simultaneous authored cues and preserves very close distinct markers', () => {
    const seq = recording('LOW_CENTER_SUPPORT', 10);
    seq.annotations = [
      {
        id: 'one',
        atTick: 3,
        kind: 'text',
        text: 'Regarder le centre',
        playerId: null,
        point: null,
      },
      {
        id: 'two',
        atTick: 3,
        kind: 'pause',
        text: 'Identifier la pression',
        playerId: null,
        point: null,
      },
      {
        id: 'three',
        atTick: 4,
        kind: 'focus',
        text: 'Offrir un soutien',
        playerId: 'home-2',
        point: null,
      },
    ];
    const steps = demonstrationSteps(seq),
      same = steps.filter((s) => s.tick === 3);
    expect(same).toHaveLength(1);
    expect(same[0]).toMatchObject({
      explicitPause: true,
      title: 'Pause pédagogique',
    });
    expect(same[0]!.description).toContain('Regarder le centre');
    expect(same[0]!.description).toContain('Identifier la pression');
    expect(nextStepTick(steps, 3)).toBe(4);
  });
  it('provides beginning/end fallback and handles a one-frame lesson', () => {
    const seq = recording('LOW_CENTER_SUPPORT', 0);
    expect(demonstrationSteps(seq)).toHaveLength(1);
    expect(nextStepTick(demonstrationSteps(seq), 0)).toBeNull();
    expect(advanceDemonstration(0, 10, 0, [], null)).toEqual({
      tick: 0,
      stopped: true,
    });
  });
  it('shows interception/defensive context without inventing a successful exit', () => {
    const scene = templateScenario('BOARDS_BREAKOUT');
    scene.players.find((p) => p.id === 'away-1')!.pos = { x: 9, y: 8 };
    scene.players.find((p) => p.id === 'home-1')!.pos = { x: 17, y: 8 };
    const sim = new TacticalSimulation(
      scene,
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
    const seq = sim.recording('Interception', 'system', 1),
      steps = demonstrationSteps(seq);
    expect(steps.some((s) => s.title === 'Passe interceptée')).toBe(true);
    expect(steps.some((s) => s.title === 'Sortie de zone')).toBe(false);
  });
  it('stops at a close marker and resumes strictly after the exact marker', () => {
    const steps = [{ tick: 0 }, { tick: 30 }, { tick: 31 }, { tick: 90 }].map(
      (s) => ({
        ...s,
        title: 'Étape',
        description: 'Observer',
        explicitPause: false,
      }),
    );
    expect(
      advanceDemonstration(
        29.999999999,
        100,
        90,
        [],
        nextStepTick(steps, 29.999999999),
      ),
    ).toEqual({ tick: 30, stopped: true });
    expect(nextStepTick(steps, 30)).toBe(31);
    expect(stepIndexAt(steps, 29.999999999)).toBe(0);
    expect(stepIndexAt(steps, 30)).toBe(1);
  });
  it('continuous mode traverses derived markers but honors the earliest explicit pause, even if unsorted', () => {
    expect(advanceDemonstration(0, 70, 90, [], null)).toEqual({
      tick: 70,
      stopped: false,
    });
    expect(advanceDemonstration(0, 70, 90, [60, 15, 30], null)).toEqual({
      tick: 15,
      stopped: true,
    });
    expect(advanceDemonstration(15, 20, 90, [60, 15, 30], null)).toEqual({
      tick: 30,
      stopped: true,
    });
  });
  it('step mode stops before a large delta can skip its target or an explicit pause', () => {
    expect(advanceDemonstration(2, 500, 90, [40], 30)).toEqual({
      tick: 30,
      stopped: true,
    });
    expect(advanceDemonstration(2, 500, 90, [10], 30)).toEqual({
      tick: 10,
      stopped: true,
    });
    expect(advanceDemonstration(90, 5, 90, [], null)).toEqual({
      tick: 90,
      stopped: true,
    });
    expect(advanceDemonstration(5, -10, 90, [], 30)).toEqual({
      tick: 5,
      stopped: false,
    });
  });
});
