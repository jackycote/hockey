import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { CoachingSequenceSchema } from '@hockey-iq/contracts';
import { useEditorStore } from '../src/editor/store';
import { createScenario, DRAFT_KEY } from '../src/editor/scenario';
import {
  advanceSequence,
  createSequence,
  durationOf,
  parseDocument,
  sequenceFrame,
} from '../src/timeline/sequence';
beforeEach(() => setActivePinia(createPinia()));
function twoSteps() {
  const store = useEditorStore();
  store.startSequence();
  store.appendStep();
  store.move('player:home-1', { x: 20, y: 10 });
  store.recordStep();
  return store;
}
describe('coaching timeline authoring and history', () => {
  it('records ten players and a puck at each step and keeps edits separate until recorded', () => {
    const store = twoSteps();
    expect(store.sequence!.steps.map((s) => s.pose.players.length)).toEqual([
      10, 10,
    ]);
    store.move('player:home-1', { x: 15, y: 10 });
    expect(store.sequencePending).toBe(true);
    expect(store.currentStep!.pose.players[0]!.pos.x).toBe(20);
    expect(() => store.selectStep('step-1')).toThrow('unrecordedStep');
    expect(() => store.appendStep()).toThrow('unrecordedStep');
    store.recordStep();
    expect(store.sequencePending).toBe(false);
    expect(store.currentStep!.pose.players[0]!.pos.x).toBe(15);
    store.undo();
    expect(store.sequencePending).toBe(true);
    store.undo();
    expect(store.scenario.players[0]!.pos.x).toBe(20);
    expect(store.sequencePending).toBe(false);
  });
  it('adds after the selected pose and shifts only later dates in one reversible transaction', () => {
    const store = twoSteps();
    store.appendStep();
    store.updateStep({
      kind: 'observation',
      observation: {
        playerId: 'home-1',
        lookAt: { kind: 'puck' },
        prompt: 'Lire le jeu',
      },
    });
    store.selectStep('step-1');
    const before = JSON.parse(store.exportJson());
    store.addStepAfter();
    const after = JSON.parse(store.exportJson());
    expect(after.steps.map((step: { atMs: number }) => step.atMs)).toEqual([
      0, 2000, 4000, 6000,
    ]);
    expect(after.steps[0]).toEqual(before.steps[0]);
    expect(after.steps[1].pose).toEqual(before.steps[0].pose);
    expect(after.steps[1].kind).toBe('play');
    expect(after.steps[1].observation).toBeNull();
    for (let i = 1; i < before.steps.length; i++)
      expect(after.steps[i + 1]).toEqual({
        ...before.steps[i],
        atMs: before.steps[i].atMs + 2000,
      });
    expect(store.stepId).toBe(after.steps[1].id);
    store.undo();
    expect(JSON.parse(store.exportJson())).toEqual(before);
    expect(store.stepId).toBe('step-1');
    store.redo();
    expect(JSON.parse(store.exportJson())).toEqual(after);
    store.importJson(JSON.stringify(after));
    expect(JSON.parse(store.exportJson())).toEqual(after);
    store.selectStep(after.steps.at(-1).id);
    store.addStepAfter();
    expect(store.currentStep!.kind).toBe('play');
    expect(store.currentStep!.observation).toBeNull();
    expect(store.currentStep!.pose).toEqual(after.steps.at(-1).pose);
  });
  it('adds after an initial-only or final step and rejects pending poses and duration/count overflow atomically', () => {
    const store = useEditorStore();
    store.startSequence();
    store.addStepAfter();
    expect(store.currentStep!.atMs).toBe(2000);
    store.move('player:home-1', { x: 20, y: 10 });
    expect(() => store.addStepAfter()).toThrow('unrecordedStep');
    expect(store.sequence!.steps).toHaveLength(2);
    store.recordStep();
    store.addStepAfter();
    expect(store.currentStep!.atMs).toBe(4000);
    expect(store.scenario.players[0]!.pos).toEqual({ x: 20, y: 10 });
    store.moveStep(store.stepId!, 300000);
    let before = store.exportJson();
    expect(() => store.addStepAfter()).toThrow();
    expect(store.exportJson()).toBe(before);
    const full = JSON.parse(before);
    full.steps = Array.from({ length: 120 }, (_, i) => ({
      ...full.steps[0],
      id: `full-${i}`,
      atMs: i * 100,
    }));
    store.importJson(JSON.stringify(full));
    before = store.exportJson();
    expect(() => store.addStepAfter()).toThrow();
    expect(store.exportJson()).toBe(before);
  });
  it('inserts an interpolated pose without changing endpoint positions, timing, or subsequent motion', () => {
    const store = twoSteps(),
      before = JSON.parse(store.exportJson());
    const original = sequenceFrame(store.sequence!, 1500).scenario;
    store.insertStep(1000);
    expect(store.sequence!.steps.map((s) => s.atMs)).toEqual([0, 1000, 2000]);
    expect(store.scenario.players[0]!.pos).toEqual({ x: 30, y: 8 });
    expect(store.sequence!.steps[0]).toEqual(before.steps[0]);
    expect(store.sequence!.steps[2]).toEqual(before.steps[1]);
    expect(
      sequenceFrame(store.sequence!, 1500).scenario.players[0]!.pos,
    ).toEqual(original.players[0]!.pos);
    store.undo();
    expect(store.sequence!.steps).toHaveLength(2);
    store.redo();
    expect(store.sequence!.steps).toHaveLength(3);
    expect(durationOf(store.sequence!)).toBe(2000);
  });
  it('rejects insertion at a boundary or too close to a neighbor atomically', () => {
    const store = twoSteps(),
      original = store.exportJson();
    for (const at of [0, 50, 1950, 2000, -1, NaN])
      expect(() => store.insertStep(at)).toThrow();
    expect(store.exportJson()).toBe(original);
  });
  it('retimes clips within neighbors, keeps zero pinned and makes deletion reversible', () => {
    const store = twoSteps();
    store.insertStep(1000);
    store.moveStep(store.stepId!, 5000);
    expect(store.currentStep!.atMs).toBe(1900);
    store.moveStep(store.stepId!, -100);
    expect(store.currentStep!.atMs).toBe(100);
    expect(() => store.moveStep('step-1', 100)).toThrow();
    store.removeStep();
    expect(store.sequence!.steps.map((s) => s.atMs)).toEqual([0, 2000]);
    store.undo();
    expect(store.sequence!.steps.map((s) => s.atMs)).toEqual([0, 100, 2000]);
  });
  it('saves the whole sequence, including a current pose edit, and reloads it without losing old v1 imports', () => {
    const store = twoSteps(),
      values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    store.move('player:home-1', { x: 21, y: 11 });
    store.updateStep({
      kind: 'observation',
      observation: {
        playerId: 'home-1',
        lookAt: { kind: 'puck' },
        prompt: 'Qui est libre ?',
      },
    });
    store.saveDraft(storage);
    expect(store.dirty).toBe(false);
    expect(store.sequencePending).toBe(false);
    const expected = parseDocument(values.get(DRAFT_KEY)!);
    setActivePinia(createPinia());
    const restored = useEditorStore();
    restored.initialize(storage);
    expect(parseDocument(restored.exportJson())).toEqual(expected);
    expect(restored.dirty).toBe(false);
    restored.selectStep('step-2');
    expect(restored.scenario.players[0]!.pos.x).toBe(21);
    restored.importJson(JSON.stringify(createScenario()));
    expect(restored.sequence).toBeNull();
    restored.undo();
    expect(restored.sequence!.steps).toHaveLength(2);
  });
  it('blocks incompatible rink changes while keeping invalid imports and resets reversible', () => {
    const store = twoSteps(),
      saved = store.exportJson();
    expect(() =>
      store.commit((s) => {
        s.rink.length = 70;
      }),
    ).toThrow();
    const corrupt = JSON.parse(saved);
    corrupt.steps[1].pose.players.pop();
    expect(() => store.importJson(JSON.stringify(corrupt))).toThrow();
    expect(store.exportJson()).toBe(saved);
    store.reset();
    expect(store.sequence).toBeNull();
    store.undo();
    expect(store.exportJson()).toBe(saved);
  });
});
describe('authored playback and observation', () => {
  it('uses identity-based interpolation, shortest-angle facing and separate motion vectors', () => {
    const store = twoSteps(),
      sequence = store.sequence!;
    sequence.steps[0]!.pose.players[0]!.heading = Math.PI - 0.1;
    sequence.steps[1]!.pose.players[0]!.heading = -Math.PI + 0.1;
    sequence.steps[1]!.pose.players.reverse();
    const frame = sequenceFrame(sequence, 1000);
    expect(frame.scenario.players[0]!.pos).toEqual({ x: 30, y: 8 });
    expect(Math.abs(frame.scenario.players[0]!.heading)).toBeCloseTo(Math.PI);
    expect(frame.directions['home-1']).toEqual({ x: -20, y: 4 });
    expect(sequenceFrame(sequence, -100).scenario.players[0]!.pos.x).toBe(40);
    expect(
      sequenceFrame(sequence, 5000).scenario.players.find(
        (p) => p.id === 'home-1',
      )!.pos.x,
    ).toBe(20);
  });
  it('interpolates a travelling puck and transfers possession only at its destination', () => {
    const store = twoSteps();
    store.setPossession('home-1');
    store.recordStep();
    const frame = sequenceFrame(store.sequence!, 1000);
    expect(frame.scenario.puck.holderId).toBeNull();
    expect(frame.scenario.puck.pos).toEqual({ x: 37, y: 9 });
    expect(sequenceFrame(store.sequence!, 2000).scenario.puck.holderId).toBe(
      'home-1',
    );
    store.insertStep(1000);
    expect(store.scenario.puck.holderId).toBeNull();
    expect(sequenceFrame(store.sequence!, 1500).scenario.puck.pos).toEqual({
      x: 28.5,
      y: 9.5,
    });
  });
  it('stops at observation markers without skipping any and resumes beyond the current one', () => {
    const store = twoSteps();
    store.insertStep(1000);
    store.updateStep({
      kind: 'observation',
      observation: { playerId: 'home-1', lookAt: { kind: 'puck' }, prompt: '' },
    });
    expect(advanceSequence(store.sequence!, 500, 1500)).toEqual({
      time: 1000,
      paused: true,
    });
    expect(advanceSequence(store.sequence!, 1000, 200)).toEqual({
      time: 1200,
      paused: false,
    });
    expect(advanceSequence(store.sequence!, 1200, 5000)).toEqual({
      time: 2000,
      paused: true,
    });
  });
  it('BKL-006 stops immediately before an Observation, resumes exactly at it, and honors the first crossed marker', () => {
    const store = twoSteps();
    store.insertStep(1000);
    const observation = {
      playerId: 'home-1',
      lookAt: { kind: 'puck' as const },
      prompt: '',
    };
    store.updateStep({ kind: 'observation', observation });
    store.insertStep(1500);
    store.updateStep({ kind: 'observation', observation });
    for (const time of [0, 999, 999.9999, 1000 - Number.EPSILON * 1000]) {
      expect(advanceSequence(store.sequence!, time, 2000)).toEqual({
        time: 1000,
        paused: true,
      });
    }
    expect(advanceSequence(store.sequence!, 999.9999, 16.667)).toEqual({
      time: 1000,
      paused: true,
    });
    expect(advanceSequence(store.sequence!, 1000, 16.667)).toEqual({
      time: 1016.667,
      paused: false,
    });
    expect(advanceSequence(store.sequence!, 1000.0001, 10)).toEqual({
      time: 1010.0001,
      paused: false,
    });
    expect(advanceSequence(store.sequence!, 1000, 1000)).toEqual({
      time: 1500,
      paused: true,
    });
    expect(advanceSequence(store.sequence!, 1500, 1000)).toEqual({
      time: 2000,
      paused: true,
    });
    expect(advanceSequence(store.sequence!, 2000, 1000)).toEqual({
      time: 2000,
      paused: true,
    });
    expect(advanceSequence(store.sequence!, 0, -10)).toEqual({
      time: 0,
      paused: false,
    });
  });
  it.each([
    'duplicate-id',
    'same-time',
    'foreign-roster',
    'unknown-observer',
    'bad-look-target',
    'missing-observation',
    'wrong-version',
  ] as const)('rejects invalid sequence: %s', (defect) => {
    const sequence = JSON.parse(twoSteps().exportJson());
    switch (defect) {
      case 'duplicate-id':
        sequence.steps[1].id = sequence.steps[0].id;
        break;
      case 'same-time':
        sequence.steps[1].atMs = 0;
        break;
      case 'foreign-roster':
        sequence.steps[1].pose.players[0].id = 'foreign';
        break;
      case 'unknown-observer':
        sequence.steps[1].kind = 'observation';
        sequence.steps[1].observation = {
          playerId: 'foreign',
          lookAt: { kind: 'puck' },
          prompt: '',
        };
        break;
      case 'bad-look-target':
        sequence.steps[1].kind = 'observation';
        sequence.steps[1].observation = {
          playerId: 'home-1',
          lookAt: { kind: 'point', point: { x: -1, y: 0 } },
          prompt: '',
        };
        break;
      case 'missing-observation':
        sequence.steps[1].kind = 'observation';
        break;
      case 'wrong-version':
        sequence.schemaVersion = 99;
        break;
    }
    expect(CoachingSequenceSchema.safeParse(sequence).success).toBe(false);
  });
  it('keeps new sequences bounded and rejects unsupported script fields', () => {
    const sequence = createSequence(createScenario());
    expect(
      CoachingSequenceSchema.safeParse({ ...sequence, script: 'eval(1)' })
        .success,
    ).toBe(false);
    expect(
      CoachingSequenceSchema.safeParse({
        ...sequence,
        steps: Array(121).fill(sequence.steps[0]),
      }).success,
    ).toBe(false);
  });
});
