import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  ScenarioSchema,
  type Scenario,
  type TacticalRole,
  type CoachingSequence,
  type CoachingStep,
  CoachingSequenceSchema,
  MAX_SEQUENCE_STEPS,
  MAX_SEQUENCE_MS,
} from '@hockey-iq/contracts';
import { clampToRink, type Point } from './geometry';
import {
  cloneScenario,
  createScenario,
  DRAFT_KEY,
  EditorError,
  getPlayer,
  moveEntity,
  playerKey,
  serializeScenario,
  type EntityKey,
  type Player,
} from './scenario';
import {
  createSequence,
  cloneSequence,
  durationOf,
  insertionIndex,
  isSequence,
  parseDocument,
  poseOf,
  retimeStep,
  sequenceFrame,
  stepScenario,
} from '../timeline/sequence';
interface EditorSnapshot {
  scenario: Scenario;
  sequence: CoachingSequence | null;
  stepId: string | null;
}
const HISTORY_LIMIT = 100;
export const useEditorStore = defineStore('editor', () => {
  const scenario = ref<Scenario>(createScenario());
  const selected = ref<EntityKey>('player:home-1');
  const activeTeam = ref('home');
  const sequence = ref<CoachingSequence | null>(null);
  const stepId = ref<string | null>(null);
  const past = ref<EditorSnapshot[]>([]),
    future = ref<EditorSnapshot[]>([]);
  const gesture = ref<EditorSnapshot | null>(null);
  const saved = ref('');
  const initialized = ref(false);
  const selectedPlayer = computed(() =>
    getPlayer(scenario.value, selected.value),
  );
  const currentStep = computed(
    () =>
      sequence.value?.steps.find((step) => step.id === stepId.value) ?? null,
  );
  const sequencePending = computed(
    () =>
      !!currentStep.value &&
      JSON.stringify(poseOf(scenario.value)) !==
        JSON.stringify(currentStep.value.pose),
  );
  function documentValue() {
    if (!sequence.value) return scenario.value;
    return {
      ...sequence.value,
      scenario: { ...sequence.value.scenario, title: scenario.value.title },
      steps: sequence.value.steps.map((step) =>
        step.id === stepId.value
          ? { ...step, pose: poseOf(scenario.value) }
          : step,
      ),
    };
  }
  const dirty = computed(() => JSON.stringify(documentValue()) !== saved.value);
  const canUndo = computed(() => past.value.length > 0);
  const canRedo = computed(() => future.value.length > 0);
  function reconcile() {
    if (!scenario.value.teams.some((team) => team.id === activeTeam.value))
      activeTeam.value = scenario.value.teams[0]!.id;
    if (selected.value !== 'puck' && !getPlayer(scenario.value, selected.value))
      selected.value = playerKey(scenario.value.players[0]!.id);
  }
  function select(key: EntityKey) {
    selected.value = key;
    const player = getPlayer(scenario.value, key);
    if (player) activeTeam.value = player.teamId;
  }
  function cancelGesture() {
    if (gesture.value) {
      apply(gesture.value);
      gesture.value = null;
    }
  }
  function snapshot(): EditorSnapshot {
    return {
      scenario: cloneScenario(scenario.value),
      sequence: sequence.value ? cloneSequence(sequence.value) : null,
      stepId: stepId.value,
    };
  }
  function apply(value: EditorSnapshot) {
    scenario.value = value.scenario;
    sequence.value = value.sequence;
    stepId.value = value.stepId;
    reconcile();
  }
  function remember(previous: EditorSnapshot) {
    past.value.push(previous);
    if (past.value.length > HISTORY_LIMIT) past.value.shift();
    future.value = [];
  }
  function commit(mutate: (draft: Scenario) => void) {
    cancelGesture();
    const previous = cloneScenario(scenario.value),
      draft = cloneScenario(previous);
    mutate(draft);
    const valid = ScenarioSchema.safeParse(draft);
    if (!valid.success) throw new EditorError('invalidValues');
    if (JSON.stringify(valid.data) === JSON.stringify(previous)) return;
    if (sequence.value) {
      const context = (value: Scenario) => ({
        rink: value.rink,
        teams: value.teams,
        seed: value.seed,
        initialPhase: value.initialPhase,
        tacticsByTeam: value.tacticsByTeam,
      });
      if (
        JSON.stringify(context(previous)) !==
        JSON.stringify(context(valid.data))
      )
        throw new EditorError('invalidValues');
    }
    remember(snapshot());
    scenario.value = valid.data;
    reconcile();
  }
  function beginGesture(key: EntityKey) {
    cancelGesture();
    select(key);
    gesture.value = snapshot();
  }
  function previewMove(key: EntityKey, point: Point) {
    if (gesture.value) moveEntity(scenario.value, key, point);
  }
  function finishGesture() {
    if (!gesture.value) return;
    const previous = gesture.value;
    gesture.value = null;
    if (JSON.stringify(previous.scenario) !== JSON.stringify(scenario.value))
      remember(previous);
  }
  function move(key: EntityKey, point: Point) {
    commit((draft) => moveEntity(draft, key, point));
  }
  function setPossession(holderId: string | null) {
    commit((draft) => {
      const holder = draft.players.find((player) => player.id === holderId);
      if (holderId !== null && !holder) throw new EditorError('invalidValues');
      draft.puck.holderId = holderId;
      if (holder) draft.puck.pos = { ...holder.pos };
      draft.puck.vel = { x: 0, y: 0 };
    });
  }
  function editPlayer(mutate: (player: Player) => void) {
    const key = selected.value;
    commit((draft) => {
      const player = getPlayer(draft, key);
      if (!player) throw new EditorError('invalidValues');
      mutate(player);
    });
  }
  function setRole(role: TacticalRole | null) {
    const key = selected.value;
    commit((draft) => {
      const player = getPlayer(draft, key);
      if (!player) return;
      if (
        role !== null &&
        ['LD', 'RD'].includes(player.nominalPosition) !== role.startsWith('D')
      )
        throw new EditorError('invalidValues');
      const previous = player.role;
      const other = draft.players.find(
        (p) =>
          p.teamId === player.teamId &&
          p.id !== player.id &&
          role !== null &&
          p.role === role,
      );
      if (other) other.role = previous;
      player.role = role;
    });
  }
  function setTarget(point: Point) {
    editPlayer((player) => {
      player.objective = {
        kind: player.objective?.kind ?? 'support',
        targetPoint: clampToRink(point, scenario.value.rink),
      };
    });
  }
  function undo() {
    cancelGesture();
    const previous = past.value.pop();
    if (previous) {
      future.value.push(snapshot());
      apply(previous);
      reconcile();
    }
  }
  function redo() {
    cancelGesture();
    const next = future.value.pop();
    if (next) {
      past.value.push(snapshot());
      apply(next);
      reconcile();
    }
  }
  function reset() {
    cancelGesture();
    remember(snapshot());
    apply({ scenario: createScenario(), sequence: null, stepId: null });
  }
  function importJson(text: string) {
    const parsed = parseDocument(text);
    cancelGesture();
    remember(snapshot());
    apply(
      isSequence(parsed)
        ? {
            scenario: stepScenario(parsed, parsed.steps[0]!),
            sequence: parsed,
            stepId: parsed.steps[0]!.id,
          }
        : { scenario: parsed, sequence: null, stepId: null },
    );
  }
  function requireRecorded() {
    cancelGesture();
    if (sequencePending.value) throw new EditorError('unrecordedStep');
  }
  function nextStepId(value: CoachingSequence) {
    let id = 1;
    while (value.steps.some((step) => step.id === `step-${id}`)) id++;
    return `step-${id}`;
  }
  function changeSequence(
    mutate: (draft: CoachingSequence) => void,
    loadId?: string,
  ) {
    cancelGesture();
    if (!sequence.value) return;
    const draft = cloneSequence(sequence.value);
    draft.scenario.title = scenario.value.title;
    mutate(draft);
    const valid = CoachingSequenceSchema.safeParse(draft);
    if (!valid.success) throw new EditorError('invalidValues');
    if (JSON.stringify(valid.data) === JSON.stringify(sequence.value)) return;
    remember(snapshot());
    sequence.value = valid.data;
    if (loadId) {
      const step = valid.data.steps.find((step) => step.id === loadId)!;
      stepId.value = step.id;
      scenario.value = stepScenario(valid.data, step);
    }
  }
  function startSequence() {
    cancelGesture();
    remember(snapshot());
    sequence.value = createSequence(scenario.value);
    stepId.value = sequence.value.steps[0]!.id;
  }
  function selectStep(id: string) {
    requireRecorded();
    const step = sequence.value?.steps.find((step) => step.id === id);
    if (!sequence.value || !step) return;
    sequence.value.scenario.title = scenario.value.title;
    stepId.value = id;
    scenario.value = stepScenario(sequence.value, step);
    reconcile();
  }
  function recordStep() {
    if (!sequence.value || !stepId.value) return;
    changeSequence((draft) => {
      draft.steps.find((step) => step.id === stepId.value)!.pose = poseOf(
        scenario.value,
      );
    });
  }
  function discardStep() {
    const step = currentStep.value;
    if (!sequence.value || !step) return;
    cancelGesture();
    remember(snapshot());
    scenario.value = stepScenario(sequence.value, step);
  }
  function appendStep() {
    requireRecorded();
    if (
      !sequence.value ||
      sequence.value.steps.length >= MAX_SEQUENCE_STEPS ||
      durationOf(sequence.value) + 2000 > MAX_SEQUENCE_MS
    )
      throw new EditorError('invalidValues');
    const id = nextStepId(sequence.value);
    changeSequence((draft) => {
      const last = draft.steps.at(-1)!;
      draft.steps.push({
        ...JSON.parse(JSON.stringify(last)),
        id,
        label: `Étape ${draft.steps.length + 1}`,
        kind: 'play',
        observation: null,
        atMs: last.atMs + 2000,
      });
    }, id);
  }
  function addStepAfter() {
    requireRecorded();
    const current = currentStep.value;
    if (
      !sequence.value ||
      !current ||
      sequence.value.steps.length >= MAX_SEQUENCE_STEPS ||
      durationOf(sequence.value) + 2000 > MAX_SEQUENCE_MS
    )
      throw new EditorError('invalidValues');
    const id = nextStepId(sequence.value);
    changeSequence((draft) => {
      const index = draft.steps.findIndex((step) => step.id === current.id);
      for (const step of draft.steps.slice(index + 1)) step.atMs += 2000;
      draft.steps.splice(index + 1, 0, {
        id,
        label: `Étape ${draft.steps.length + 1}`,
        atMs: current.atMs + 2000,
        kind: 'play',
        observation: null,
        pose: JSON.parse(JSON.stringify(current.pose)),
      });
    }, id);
  }
  function insertStep(atMs: number) {
    requireRecorded();
    if (!sequence.value || sequence.value.steps.length >= MAX_SEQUENCE_STEPS)
      throw new EditorError('invalidValues');
    const at = Math.round(atMs),
      index = insertionIndex(sequence.value, at);
    if (index < 0) throw new EditorError('invalidValues');
    const id = nextStepId(sequence.value),
      pose = poseOf(sequenceFrame(sequence.value, at).scenario);
    changeSequence((draft) => {
      draft.steps.splice(index, 0, {
        id,
        label: 'Étape insérée',
        atMs: at,
        kind: 'play',
        pose,
        observation: null,
      });
    }, id);
  }
  function removeStep() {
    requireRecorded();
    const index =
      sequence.value?.steps.findIndex((step) => step.id === stepId.value) ?? -1;
    if (!sequence.value || index <= 0) return;
    const id = sequence.value.steps[index - 1]!.id;
    changeSequence((draft) => {
      draft.steps.splice(index, 1);
    }, id);
  }
  function moveStep(id: string, atMs: number) {
    requireRecorded();
    changeSequence((draft) => retimeStep(draft, id, atMs), id);
  }
  function updateStep(
    patch: Partial<Pick<CoachingStep, 'label' | 'kind' | 'observation'>>,
  ) {
    if (!stepId.value) return;
    changeSequence((draft) =>
      Object.assign(
        draft.steps.find((step) => step.id === stepId.value)!,
        patch,
      ),
    );
  }
  function exportJson() {
    cancelGesture();
    recordStep();
    return sequence.value
      ? JSON.stringify(CoachingSequenceSchema.parse(documentValue()), null, 2)
      : serializeScenario(scenario.value);
  }
  function saveDraft(storage: Pick<Storage, 'setItem'>) {
    const value = exportJson();
    try {
      storage.setItem(DRAFT_KEY, value);
      saved.value = JSON.stringify(documentValue());
    } catch {
      throw new EditorError('storage');
    }
  }
  function loadDraft(storage: Pick<Storage, 'getItem'>) {
    let text: string | null;
    try {
      text = storage.getItem(DRAFT_KEY);
    } catch {
      throw new EditorError('storage');
    }
    if (!text) throw new EditorError('noDraft');
    importJson(text);
    saved.value = JSON.stringify(documentValue());
  }
  function initialize(storage: Pick<Storage, 'getItem'>) {
    if (initialized.value) return;
    initialized.value = true;
    let text: string | null;
    try {
      text = storage.getItem(DRAFT_KEY);
    } catch {
      throw new EditorError('storage');
    }
    if (text) {
      const parsed = parseDocument(text);
      apply(
        isSequence(parsed)
          ? {
              scenario: stepScenario(parsed, parsed.steps[0]!),
              sequence: parsed,
              stepId: parsed.steps[0]!.id,
            }
          : { scenario: parsed, sequence: null, stepId: null },
      );
      saved.value = JSON.stringify(documentValue());
    }
  }
  return {
    sequence,
    stepId,
    currentStep,
    sequencePending,
    startSequence,
    selectStep,
    recordStep,
    discardStep,
    appendStep,
    addStepAfter,
    insertStep,
    removeStep,
    moveStep,
    updateStep,
    exportJson,
    scenario,
    selected,
    activeTeam,
    selectedPlayer,
    dirty,
    canUndo,
    canRedo,
    initialized,
    select,
    commit,
    move,
    beginGesture,
    previewMove,
    finishGesture,
    cancelGesture,
    setPossession,
    editPlayer,
    setRole,
    setTarget,
    undo,
    redo,
    reset,
    importJson,
    saveDraft,
    loadDraft,
    initialize,
  };
});
