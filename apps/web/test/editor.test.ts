import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ScenarioSchema } from '@hockey-iq/contracts';
import { useEditorStore } from '../src/editor/store';
import {
  createScenario,
  DRAFT_KEY,
  EditorError,
  MAX_SCENARIO_BYTES,
  parseScenario,
  playerKey,
  serializeScenario,
} from '../src/editor/scenario';
beforeEach(() => setActivePinia(createPinia()));
describe('scenario editing transactions', () => {
  it('starts with a schema-valid 5v5 scenario and no invented tactical roles', () => {
    const store = useEditorStore();
    expect(ScenarioSchema.safeParse(store.scenario).success).toBe(true);
    expect(store.scenario.players.every((p) => p.role === null)).toBe(true);
    expect(store.canUndo).toBe(false);
  });
  it('records a multi-frame drag as one undo step and moves the held puck', () => {
    const store = useEditorStore(),
      holder = store.scenario.players.find(
        (p) => p.id === store.scenario.puck.holderId,
      )!;
    const start = { ...holder.pos };
    store.beginGesture(playerKey(holder.id));
    store.previewMove(playerKey(holder.id), { x: 45, y: 8 });
    store.previewMove(playerKey(holder.id), { x: 40, y: 10 });
    store.finishGesture();
    expect(store.scenario.puck.pos).toEqual({ x: 40, y: 10 });
    store.undo();
    expect(store.scenario.puck.pos).toEqual(start);
    expect(store.canUndo).toBe(false);
    store.redo();
    expect(store.scenario.puck.pos).toEqual({ x: 40, y: 10 });
  });
  it('cancels a drag without creating a history entry', () => {
    const store = useEditorStore(),
      original = serializeScenario(store.scenario);
    store.beginGesture('player:home-1');
    store.previewMove('player:home-1', { x: 10, y: 10 });
    store.cancelGesture();
    expect(serializeScenario(store.scenario)).toBe(original);
    expect(store.canUndo).toBe(false);
  });
  it('detaches a dragged puck and restores possession on undo', () => {
    const store = useEditorStore(),
      original = store.scenario.puck.holderId;
    store.move('puck', { x: -50, y: 100 });
    expect(store.scenario.puck.holderId).toBeNull();
    expect(ScenarioSchema.safeParse(store.scenario).success).toBe(true);
    store.undo();
    expect(store.scenario.puck.holderId).toBe(original);
  });
  it('enforces valid edits atomically without losing the undo/redo history', () => {
    const store = useEditorStore();
    store.move('player:home-1', { x: 20, y: 10 });
    store.undo();
    const original = serializeScenario(store.scenario);
    expect(() =>
      store.commit((draft) => {
        draft.rink.length = 1;
      }),
    ).toThrow(EditorError);
    expect(serializeScenario(store.scenario)).toBe(original);
    expect(store.canRedo).toBe(true);
    store.move('player:home-1', { x: 25, y: 10 });
    expect(store.canRedo).toBe(false);
  });
  it('swaps conflicting manual roles within the same team and supports removing roles', () => {
    const store = useEditorStore();
    store.select('player:home-1');
    store.setRole('F1');
    store.select('player:home-2');
    store.setRole('F2');
    store.setRole('F1');
    expect(store.scenario.players[0]!.role).toBe('F2');
    expect(store.scenario.players[1]!.role).toBe('F1');
    expect(ScenarioSchema.safeParse(store.scenario).success).toBe(true);
    store.setRole(null);
    expect(store.selectedPlayer?.role).toBeNull();
  });
  it('keeps forward and defensive responsibility sets distinct', () => {
    const store = useEditorStore();
    store.select('player:home-4');
    expect(() => store.setRole('F1')).toThrow('invalidValues');
    store.setRole('D2');
    expect(store.selectedPlayer?.role).toBe('D2');
    store.select('player:home-1');
    expect(() => store.setRole('D1')).toThrow('invalidValues');
  });
  it('reset and import are reversible, including selection reconciliation', () => {
    const store = useEditorStore(),
      imported = createScenario();
    imported.players[0]!.id = 'imported-skater';
    imported.title = 'Imported';
    store.importJson(serializeScenario(imported));
    expect(store.selected).toBe('player:imported-skater');
    store.reset();
    expect(store.scenario.title).not.toBe('Imported');
    store.undo();
    expect(store.scenario.title).toBe('Imported');
    store.undo();
    expect(store.scenario.players[0]!.id).toBe('home-1');
  });
});
describe('local JSON and drafts', () => {
  it('preserves all versioned fields through export/import', () => {
    const scenario = createScenario();
    scenario.players[0]!.objective = {
      kind: 'cover',
      targetPoint: { x: 30, y: 15 },
    };
    scenario.players[0]!.vel.x = 2;
    scenario.players[0]!.role = 'F3';
    expect(parseScenario(serializeScenario(scenario))).toEqual(scenario);
  });
  it.each([
    'not JSON',
    '{"schemaVersion":2}',
    '{"schemaVersion":1}',
    JSON.stringify({ ...createScenario(), players: [] }),
  ])(
    'rejects invalid import without changing the current scenario: %s',
    (text) => {
      const store = useEditorStore(),
        original = serializeScenario(store.scenario);
      expect(() => store.importJson(text)).toThrow(EditorError);
      expect(serializeScenario(store.scenario)).toBe(original);
      expect(store.canUndo).toBe(false);
    },
  );
  it('rejects oversized and nonfinite data', () => {
    expect(() => parseScenario(' '.repeat(MAX_SCENARIO_BYTES + 1))).toThrow(
      'tooLarge',
    );
    expect(() => useEditorStore().move('puck', { x: NaN, y: 0 })).toThrow(
      'invalidValues',
    );
  });
  it('restores a saved draft on initialization and tracks actual saved state across undo', () => {
    const values = new Map<string, string>(),
      storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
      };
    const store = useEditorStore();
    store.move('player:home-1', { x: 22, y: 10 });
    store.saveDraft(storage);
    expect(store.dirty).toBe(false);
    store.move('player:home-1', { x: 23, y: 10 });
    expect(store.dirty).toBe(true);
    store.undo();
    expect(store.dirty).toBe(false);
    const expected = serializeScenario(store.scenario);
    setActivePinia(createPinia());
    const restored = useEditorStore();
    restored.initialize(storage);
    expect(serializeScenario(restored.scenario)).toBe(expected);
    expect(restored.canUndo).toBe(false);
    expect(restored.dirty).toBe(false);
  });
  it('reports unavailable storage and preserves corrupt drafts for recovery', () => {
    const store = useEditorStore();
    expect(() =>
      store.saveDraft({
        setItem: () => {
          throw new Error('quota');
        },
      }),
    ).toThrow('storage');
    const storage = {
      getItem: (key: string) => (key === DRAFT_KEY ? '{bad' : null),
    };
    expect(() => store.initialize(storage)).toThrow('invalidFile');
    expect(ScenarioSchema.safeParse(store.scenario).success).toBe(true);
    expect(storage.getItem(DRAFT_KEY)).toBe('{bad');
  });
});
