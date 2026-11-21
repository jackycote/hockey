<script setup lang="ts">
import Brand from '../Brand.vue';
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import type { Scenario, TacticalRole } from '@hockey-iq/contracts';
import Icon from './Icon.vue';
import RinkZoom from './RinkZoom.vue';
import RinkBoard from './RinkBoard.vue';
import { useEditorStore } from './store';
import { useSimulation } from '../simulation/useSimulation';
import SimulationControls from '../simulation/SimulationControls.vue';
import TimelineEditor from '../timeline/TimelineEditor.vue';
import TimelineHeader from '../timeline/TimelineHeader.vue';
import StepInspector from '../timeline/StepInspector.vue';
import { useTimeline } from '../timeline/useTimeline';
import { MAX_SEQUENCE_BYTES } from '../timeline/sequence';
import {
  EditorError,
  entityPosition,
  getPlayer,
  playerKey,
  type EditorErrorCode,
} from './scenario';
import type { EntityKey, Tool } from './scenario';
import './editor.css';
const { t } = useI18n();
const store = useEditorStore();
const board = ref<InstanceType<typeof RinkBoard>>();
const timelineHeader = ref<InstanceType<typeof TimelineHeader>>();
const fileInput = ref<HTMLInputElement>();
const tool = ref<Tool>('move'),
  showRoles = ref(false),
  showPaths = ref(true),
  showGrid = ref(false),
  importing = ref(false);
const notice = ref<{ error: boolean; key: string } | null>(null);
const simulation = useSimulation(() => {
  store.cancelGesture();
  return store.scenario;
});
const timeline = useTimeline();
const inspectorTabs = [
  { id: 'teams', label: 'Équipes' },
  { id: 'player', label: 'Joueur' },
  { id: 'step', label: 'Étape' },
  { id: 'rink', label: 'Patinoire' },
] as const;
const inspectorTab = ref<(typeof inspectorTabs)[number]['id']>('player');
const inspectorId = useId();
function inspectorKeys(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const current = inspectorTabs.findIndex(
    (tab) => tab.id === inspectorTab.value,
  );
  const index =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? inspectorTabs.length - 1
        : (current +
            (event.key === 'ArrowRight' ? 1 : -1) +
            inspectorTabs.length) %
          inspectorTabs.length;
  inspectorTab.value = inspectorTabs[index]!.id;
  const buttons = (
    event.currentTarget as HTMLElement
  ).querySelectorAll<HTMLButtonElement>('[role="tab"]');
  buttons[index]?.focus();
}
function toolbarKeys(event: KeyboardEvent) {
  if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  const buttons = Array.from(
    (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>(
      'button:not(:disabled)',
    ),
  );
  if (!buttons.length) return;
  event.preventDefault();
  const current = buttons.indexOf(
    (event.target as HTMLElement).closest('button')!,
  );
  const index =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
          buttons.length;
  buttons[index]?.focus();
}
function revealTool(event: FocusEvent) {
  const rail = event.currentTarget as HTMLElement;
  const button = (event.target as HTMLElement).closest('button');
  if (!button) return;
  void nextTick(() => {
    if (!button.isConnected) return;
    const viewport = rail.getBoundingClientRect();
    const control = button.getBoundingClientRect();
    if (control.bottom > viewport.bottom)
      rail.scrollTop += control.bottom - viewport.bottom;
    else if (control.top < viewport.top)
      rail.scrollTop -= viewport.top - control.top;
  });
}
function toolbarHistory(event: MouseEvent, action: () => void) {
  const origin = event.currentTarget as HTMLButtonElement;
  const focused = document.activeElement === origin;
  action();
  if (!focused) return;
  void nextTick(() => {
    if (!origin.isConnected || !origin.disabled) return;
    if (
      document.activeElement !== origin &&
      document.activeElement !== document.body
    )
      return;
    const buttons = origin
      .closest('[role="toolbar"]')
      ?.querySelectorAll<HTMLButtonElement>('[data-history]:not(:disabled)');
    // Undo/redo may disable itself; keep keyboard navigation inside the toolbar.
    buttons?.[buttons.length - 1]?.focus({ preventScroll: true });
  });
}
async function createSequence() {
  if (simulation.active.value || store.sequence) return;
  attempt(store.startSequence);
  if (!store.sequence) return;
  await nextTick();
  timelineHeader.value?.revealHeading();
}
function selectRoster(key: EntityKey) {
  store.select(key);
  inspectorTab.value = 'player';
  void nextTick(() =>
    document
      .getElementById(`${inspectorId}-player-tab`)
      ?.focus({ preventScroll: true }),
  );
}
const editing = computed(
  () => !simulation.active.value && !timeline.previewing.value,
);
const view = computed<Scenario>(() => {
  if (timeline.preview.value) return timeline.preview.value;
  const world = simulation.renderWorld.value;
  return world
    ? {
        ...store.scenario,
        players: world.players,
        puck: world.puck,
        rink: world.rink,
        tacticsByTeam: world.tacticsByTeam,
      }
    : store.scenario;
});
const player = computed(() => getPlayer(view.value, store.selected));
watch(editing, (editable) => {
  if (!editable) {
    tool.value = 'move';
    notice.value = null;
  }
});
const position = computed(() => entityPosition(view.value, store.selected));
const velocity = computed(() => player.value?.vel ?? view.value.puck.vel);
const team = computed(() =>
  store.scenario.teams.find((item) => item.id === store.activeTeam)!,
);
const roster = computed(() =>
  view.value.players.filter((item) => item.teamId === store.activeTeam),
);
const roleOptions = computed<TacticalRole[]>(() =>
  player.value && ['LD', 'RD'].includes(player.value.nominalPosition)
    ? ['D1', 'D2']
    : ['F1', 'F2', 'F3'],
);
const tools = computed(() =>
  store.sequence
    ? (['move', 'place', 'pan'] as const)
    : (['move', 'place', 'target', 'pan'] as const),
);
watch(
  () => store.sequence,
  () => {
    if (store.sequence && tool.value === 'target') tool.value = 'move';
  },
);
const holding = computed(() => view.value.puck.holderId === player.value?.id);
function error(code: EditorErrorCode) {
  notice.value = { error: true, key: `editor.errors.${code}` };
}
function attempt(action: () => void, success?: string) {
  try {
    action();
    notice.value = success
      ? { error: false, key: `editor.notices.${success}` }
      : null;
  } catch (failure) {
    error(failure instanceof EditorError ? failure.code : 'invalidValues');
  }
}
function number(
  event: Event,
  action: (value: number) => void,
  current: () => number,
) {
  const input = event.target as HTMLInputElement;
  const value = input.value.trim() === '' ? NaN : Number(input.value);
  attempt(() => {
    if (!Number.isFinite(value)) throw new EditorError('invalidValues');
    action(value);
  });
  input.value = String(Number(current().toFixed(2)));
}
function text(event: Event, action: (value: string) => void, current: string) {
  const input = event.target as HTMLInputElement;
  attempt(() => action(input.value));
  if (notice.value?.error) input.value = current;
}
function setCoordinate(axis: 'x' | 'y', value: number) {
  store.move(store.selected, { ...position.value, [axis]: value });
}
function setVelocity(axis: 'x' | 'y', value: number) {
  if (player.value)
    store.editPlayer((item) => {
      item.vel[axis] = value;
    });
  else
    store.commit((draft) => {
      draft.puck.vel[axis] = value;
      if (value !== 0) draft.puck.holderId = null;
    });
}
function prepareTarget() {
  if (!player.value) {
    const first = store.scenario.players.find(
      (skater) => skater.teamId === store.activeTeam,
    );
    if (first) store.select(playerKey(first.id));
  }
  tool.value = 'target';
}
function selectTeam(id: string) {
  store.activeTeam = id;
  const first = store.scenario.players.find((item) => item.teamId === id);
  if (first) store.select(playerKey(first.id));
}
function attack(direction: ScenarioDirection) {
  store.commit((draft) => {
    for (const item of draft.teams)
      item.attackDirection =
        item.id === team.value.id
          ? direction
          : direction === 'positive_x'
            ? 'negative_x'
            : 'positive_x';
  });
}
type ScenarioDirection = 'positive_x' | 'negative_x';
function browserStorage(): Storage {
  try {
    return window.localStorage;
  } catch {
    throw new EditorError('storage');
  }
}
function load() {
  attempt(() => store.loadDraft(browserStorage()), 'loaded');
}
function save() {
  attempt(() => store.saveDraft(browserStorage()), 'saved');
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file) return;
  importing.value = true;
  try {
    if (file.size > MAX_SEQUENCE_BYTES) throw new EditorError('tooLarge');
    const content = await file.text();
    attempt(() => store.importJson(content), 'imported');
  } catch (failure) {
    error(failure instanceof EditorError ? failure.code : 'invalidFile');
  } finally {
    importing.value = false;
    input.value = '';
  }
}
function exportFile() {
  attempt(() => {
    store.cancelGesture();
    const blob = new Blob([store.exportJson()], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = store.sequence
      ? 'hockey-iq-sequence.json'
      : 'hockey-iq-scenario.json';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'exported');
}
function shortcuts(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  if (target.closest('input,textarea,select,[contenteditable="true"]')) return;
  if (!(event.ctrlKey || event.metaKey)) return;
  if (simulation.active.value || timeline.playing.value) {
    if (['z', 'y', 's'].includes(event.key.toLowerCase()))
      event.preventDefault();
    return;
  }
  const key = event.key.toLowerCase();
  if (key === 'z') {
    event.preventDefault();
    if (event.shiftKey) store.redo();
    else store.undo();
  }
  if (key === 'y') {
    event.preventDefault();
    store.redo();
  }
  if (key === 's') {
    event.preventDefault();
    save();
  }
}
onMounted(() => {
  attempt(() => store.initialize(browserStorage()));
  window.addEventListener('keydown', shortcuts);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', shortcuts);
});
</script>
<template>
  <div class="editor-app">
    <header class="editor-header">
      <Brand />
      <nav class="editor-nav" aria-label="Navigation principale">
        <RouterLink to="/equipes">Espace équipe</RouterLink>
        <RouterLink to="/" aria-current="page">{{
          t('editor.workspace')
        }}</RouterLink><RouterLink to="/fondation">{{
          t('editor.foundation')
        }}</RouterLink>
      </nav>
      <span class="editor-milestone"
        ><i></i
        >{{
          store.sequence
            ? 'Montage · Étapes enregistrées'
            : t('editor.milestone')
        }}</span
      >
    </header>
    <main class="editor-main">
      <div class="scenario-heading">
        <div class="scenario-title">
          <p class="eyebrow">{{ t('editor.eyebrow') }}</p>
          <input
            class="title-input"
            :aria-label="t('editor.titleLabel')"
            :value="store.scenario.title"
            :disabled="!editing"
            maxlength="200"
            @change="
              text(
                $event,
                (value) =>
                  store.commit((draft) => {
                    draft.title = value;
                  }),
                store.scenario.title,
              )
            "
          />
          <h1 class="sr-only">
            {{ t('editor.workspace') }} — {{ store.scenario.title }}
          </h1>
          <p>{{ t('editor.subtitle') }}</p>
        </div>
        <div class="document-actions">
          <button
            class="secondary"
            :disabled="
              importing || simulation.active.value || timeline.playing.value
            "
            @click="fileInput?.click()"
          >
            <Icon name="upload" />{{ t('editor.import') }}</button
          ><input
            ref="fileInput"
            class="sr-only"
            type="file"
            accept=".json,application/json"
            tabindex="-1"
            :aria-label="t('editor.import')"
            @change="importFile"
          /><button
            class="secondary"
            :disabled="simulation.active.value || timeline.playing.value"
            @click="exportFile"
          >
            <Icon name="download" />{{ t('editor.export') }}</button
          ><button
            class="primary"
            :disabled="simulation.active.value || timeline.playing.value"
            @click="save"
          >
            <Icon name="save" />{{ t('editor.save') }}
          </button>
        </div>
      </div>
      <div class="editor-notice-slot">
        <p class="save-state">
          <span :class="{ 'unsaved-dot': store.dirty }">●</span
          >{{ t(store.dirty ? 'editor.unsaved' : 'editor.saved') }}
        </p>
        <p
          v-if="notice"
          class="editor-notice"
          :class="{ error: notice.error }"
          :role="notice.error ? 'alert' : 'status'"
        >
          {{ t(notice.key) }}
        </p>
      </div>
      <TimelineHeader
        ref="timelineHeader"
        :disabled="simulation.active.value"
        @create="createSequence"
      />
      <div class="editor-layout">
        <section
          class="rink-panel panel"
          :aria-label="t('editor.initialState')"
        >
          <div class="rink-workspace">
            <div
              class="tools"
              role="toolbar"
              aria-orientation="vertical"
              :aria-label="t('editor.workspace')"
              @keydown="toolbarKeys"
              @focusin="revealTool"
            >
              <button
                class="icon-button"
                :aria-label="t('editor.reset')"
                :data-tooltip="t('editor.reset')"
                :disabled="!editing"
                @click="attempt(store.reset, 'reset')"
              >
                <Icon name="reset" />
              </button>
              <span
                class="tool-divider"
                role="separator"
                aria-orientation="horizontal"
              ></span>
              <button
                v-for="item in tools"
                :key="item"
                class="icon-button"
                :class="{ active: tool === item }"
                :aria-label="t(`editor.${item}`)"
                :data-tooltip="t(`editor.${item}`)"
                :aria-pressed="tool === item"
                :disabled="
                  (item === 'target' && !player) ||
                  (!editing && ['place', 'target'].includes(item))
                "
                @click="tool = item"
              >
                <Icon :name="item" /></button
              ><span
                class="tool-divider"
                role="separator"
                aria-orientation="horizontal"
              ></span
              ><button
                class="icon-button"
                data-history
                :aria-label="t('editor.undo')"
                :data-tooltip="t('editor.undo')"
                :disabled="
                  simulation.active.value ||
                  timeline.playing.value ||
                  !store.canUndo
                "
                @click="toolbarHistory($event, store.undo)"
              >
                <Icon name="undo" /></button
              ><button
                class="icon-button"
                data-history
                :aria-label="t('editor.redo')"
                :data-tooltip="t('editor.redo')"
                :disabled="
                  simulation.active.value ||
                  timeline.playing.value ||
                  !store.canRedo
                "
                @click="toolbarHistory($event, store.redo)"
              >
                <Icon name="redo" />
              </button>
              <span
                class="tool-divider"
                role="separator"
                aria-orientation="horizontal"
              ></span>
              <RinkZoom
                :value="board?.zoomPercent ?? 100"
                @zoom="board?.zoom($event)"
                @set="board?.setZoom($event)"
                @reset="board?.fit()"
              />
              <button
                class="icon-button"
                :aria-label="t('editor.fit')"
                :data-tooltip="t('editor.fit')"
                @click="board?.fit()"
              >
                <Icon name="fit" /></button
              ><button
                class="icon-button"
                :aria-label="t('editor.flip')"
                :data-tooltip="t('editor.flip')"
                @click="board?.flip()"
              >
                <Icon name="flip" />
              </button>
            </div>
            <div class="rink-surface">
              <RinkBoard
                ref="board"
                :scenario="view"
                :editable="editing"
                :tool="tool"
                :roles="showRoles"
                :paths="showPaths && !store.sequence"
                :directions="timeline.directions.value"
                :observation="timeline.observation.value"
                :grid="showGrid"
              />
              <TimelineEditor
                v-if="store.sequence"
                :session="timeline"
                :disabled="simulation.active.value"
              />
            </div>
          </div>
          <div class="rink-bottomline">
            <div class="team-legend">
              <span><i></i>{{ store.scenario.teams[0]?.label }}</span
              ><span><i></i>{{ store.scenario.teams[1]?.label }}</span>
            </div>
          </div>
          <p id="rink-help" class="sr-only">{{ t('editor.rinkHelp') }}</p>
          <div v-if="timeline.observation.value" class="observation-callout">
            <strong>◎ Observation</strong
            >{{
              timeline.observation.value.prompt ||
              'Prenez l’information avant de jouer.'
            }}
          </div>
          <SimulationControls
            v-if="!store.sequence"
            :session="simulation"
            :scenario="view"
            @target="prepareTarget"
          />
        </section>
        <aside
          class="inspector-panel panel"
          :aria-label="t('editor.selection')"
        >
          <div class="panel-heading">
            <h2>{{ t('editor.selection') }}</h2>
            <Icon name="move" />
          </div>
          <div
            class="inspector-tabs"
            role="tablist"
            aria-label="Inspecteur"
            @keydown="inspectorKeys"
          >
            <button
              v-for="tab in inspectorTabs"
              :id="`${inspectorId}-${tab.id}-tab`"
              :key="tab.id"
              role="tab"
              :aria-selected="inspectorTab === tab.id"
              :aria-controls="`${inspectorId}-${tab.id}-panel`"
              :tabindex="inspectorTab === tab.id ? 0 : -1"
              @click="inspectorTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
          <div
            v-show="inspectorTab === 'teams'"
            :id="`${inspectorId}-teams-panel`"
            class="inspector-teams roster-panel"
            role="tabpanel"
            :aria-labelledby="`${inspectorId}-teams-tab`"
            tabindex="0"
          >
            <div class="panel-heading">
              <h2>{{ t('editor.roster') }}</h2>
              <span>5 × 5</span>
            </div>
            <div class="team-tabs" :aria-label="t('editor.team')">
              <button
                v-for="(item, index) in store.scenario.teams"
                :key="item.id"
                :class="{
                  active: store.activeTeam === item.id,
                  away: index === 1,
                }"
                :aria-pressed="store.activeTeam === item.id"
                @click="selectTeam(item.id)"
              >
                <i></i>{{ item.label }}
              </button>
            </div>
            <p class="roster-caption">
              {{ t('editor.playersCount') }}
              <span>{{
                team.attackDirection === 'positive_x' ? '→' : '←'
              }}</span>
            </p>
            <ul class="roster-list">
              <li v-for="item in roster" :key="item.id">
                <button
                  :aria-label="
                    t('editor.playerName', {
                      team: team.label,
                      position: t(`editor.positions.${item.nominalPosition}`),
                      number: item.label,
                    })
                  "
                  :aria-pressed="store.selected === playerKey(item.id)"
                  :class="{
                    selected: store.selected === playerKey(item.id),
                    away: team.id === store.scenario.teams[1]?.id,
                  }"
                  @click="selectRoster(playerKey(item.id))"
                >
                  <span class="jersey-number">{{ item.label }}</span><span
                    class="roster-player"
                    ><strong>{{
                      t(`editor.positionNames.${item.nominalPosition}`)
                    }}</strong
                    ><small>{{
                      showRoles
                        ? (item.role ?? '—')
                        : t(`editor.positions.${item.nominalPosition}`)
                    }}</small></span
                  ><span
                    v-if="view.puck.holderId === item.id"
                    class="roster-puck"
                    :title="t('editor.holder')"
                    >●</span
                  ><Icon v-else name="chevron" />
                </button>
              </li>
            </ul>
            <button
              class="puck-row"
              :class="{ selected: store.selected === 'puck' }"
              @click="selectRoster('puck')"
            >
              <span class="puck-disc"><Icon name="puck" /></span
              ><span
                >{{ t('editor.puck')
                }}<small>{{
                  t(view.puck.holderId ? 'editor.holder' : 'editor.freePuck')
                }}</small></span
              ><Icon name="chevron" />
            </button>
            <div class="strategy-card">
              <span>2–1–2</span>
              <h3>{{ t('editor.strategy') }}</h3>
              <p>{{ t('editor.strategyNote') }}</p>
            </div>
          </div>
          <div
            v-show="inspectorTab === 'player'"
            :id="`${inspectorId}-player-panel`"
            class="inspector-entity"
            role="tabpanel"
            :aria-labelledby="`${inspectorId}-player-tab`"
            tabindex="0"
          >
            <div class="selection-summary">
              <span
                class="selection-number"
                :class="{
                  away: player?.teamId === store.scenario.teams[1]?.id,
                  'is-puck': !player,
                }"
                >{{ player?.label ?? '●' }}</span
              >
              <div>
                <h3>
                  {{
                    player
                      ? t(`editor.positionNames.${player.nominalPosition}`)
                      : t('editor.puck')
                  }}
                </h3>
                <p>
                  {{
                    player
                      ? store.scenario.teams.find(
                          (item) => item.id === player?.teamId,
                        )?.label
                      : t(
                          view.puck.holderId
                            ? 'editor.holder'
                            : 'editor.freePuck',
                        )
                  }}
                </p>
              </div>
            </div>
            <label v-if="player" class="field"
              ><span>{{ t('editor.label') }}</span
              ><input
                :disabled="!editing"
                :value="player.label"
                maxlength="40"
                @change="
                  text(
                    $event,
                    (value) =>
                      store.editPlayer((item) => {
                        item.label = value;
                      }),
                    player.label,
                  )
                "
            /></label>
            <fieldset>
              <legend>{{ t('editor.coordinates') }}</legend>
              <div class="field-grid">
                <label class="field"
                  ><span>{{ t('editor.x') }}</span
                  ><input
                    :disabled="!editing"
                    type="number"
                    step="0.1"
                    :value="Number(position.x.toFixed(2))"
                    @change="
                      number(
                        $event,
                        (value) => setCoordinate('x', value),
                        () => position.x,
                      )
                    " /></label
                ><label class="field"
                  ><span>{{ t('editor.y') }}</span
                  ><input
                    :disabled="!editing"
                    type="number"
                    step="0.1"
                    :value="Number(position.y.toFixed(2))"
                    @change="
                      number(
                        $event,
                        (value) => setCoordinate('y', value),
                        () => position.y,
                      )
                    "
                /></label>
              </div>
            </fieldset>
            <fieldset v-if="!store.sequence">
              <legend>
                {{
                  t(editing ? 'editor.initialVelocity' : 'simulation.velocity')
                }}
              </legend>
              <div class="field-grid">
                <label class="field"
                  ><span>{{ t('editor.vx') }}</span
                  ><input
                    :disabled="!editing"
                    type="number"
                    step="0.5"
                    :value="velocity.x"
                    @change="
                      number(
                        $event,
                        (value) => setVelocity('x', value),
                        () => velocity.x,
                      )
                    " /></label
                ><label class="field"
                  ><span>{{ t('editor.vy') }}</span
                  ><input
                    :disabled="!editing"
                    type="number"
                    step="0.5"
                    :value="velocity.y"
                    @change="
                      number(
                        $event,
                        (value) => setVelocity('y', value),
                        () => velocity.y,
                      )
                    "
                /></label>
              </div>
            </fieldset>
            <template v-if="player"
              ><label class="field"
                ><span>{{ t('editor.heading') }}</span
                ><input
                  :disabled="!editing"
                  type="number"
                  min="-180"
                  max="180"
                  step="5"
                  :value="Math.round((player.heading * 180) / Math.PI)"
                  @change="
                    number(
                      $event,
                      (value) =>
                        store.editPlayer((item) => {
                          item.heading = (value * Math.PI) / 180;
                        }),
                      () => ((player?.heading ?? 0) * 180) / Math.PI,
                    )
                  " /></label
              ><label class="field"
                ><span>{{ t('editor.role') }}</span
                ><select
                  :disabled="!editing"
                  :value="player.role ?? ''"
                  :aria-label="t('editor.role')"
                  @change="
                    attempt(() =>
                      store.setRole(
                        (($event.target as HTMLSelectElement).value ||
                          null) as TacticalRole | null,
                      ),
                    )
                  "
                >
                  <option value="">{{ t('editor.unassigned') }}</option>
                  <option v-for="role in roleOptions" :key="role" :value="role">
                    {{ role }}
                  </option>
                </select></label
              >
              <p class="field-help">{{ t('editor.roleNote') }}</p>
              <button
                class="possession-button"
                :disabled="!editing"
                :class="{ holding }"
                @click="
                  attempt(() =>
                    store.setPossession(holding ? null : player!.id),
                  )
                "
              >
                <Icon :name="holding ? 'check' : 'puck'" />{{
                  t(holding ? 'editor.releasePuck' : 'editor.givePuck')
                }}
              </button>
              <div v-if="!store.sequence" class="target-summary">
                <span>{{
                  t(player.objective ? 'editor.targetSet' : 'editor.noTarget')
                }}</span><button
                  v-if="player.objective"
                  :disabled="!editing"
                  class="text-button"
                  @click="
                    store.editPlayer((item) => {
                      item.objective = null;
                    })
                  "
                >
                  {{ t('editor.clearTarget') }}
                </button>
              </div></template
            >
            <label class="field possession-select"
              ><span>{{ t('editor.possession') }}</span
              ><select
                :disabled="!editing"
                :value="view.puck.holderId ?? ''"
                @change="
                  attempt(() =>
                    store.setPossession(
                      ($event.target as HTMLSelectElement).value || null,
                    ),
                  )
                "
              >
                <option value="">{{ t('editor.freePuck') }}</option>
                <optgroup
                  v-for="item in store.scenario.teams"
                  :key="item.id"
                  :label="item.label"
                >
                  <option
                    v-for="skater in view.players.filter(
                      (p) => p.teamId === item.id,
                    )"
                    :key="skater.id"
                    :value="skater.id"
                  >
                    {{ t(`editor.positions.${skater.nominalPosition}`) }} ·
                    {{ skater.label }}
                  </option>
                </optgroup>
              </select></label
            >
          </div>
          <div
            v-show="inspectorTab === 'step'"
            :id="`${inspectorId}-step-panel`"
            class="inspector-step"
            role="tabpanel"
            :aria-labelledby="`${inspectorId}-step-tab`"
            tabindex="0"
          >
            <StepInspector
              :session="timeline"
              :disabled="simulation.active.value"
            />
          </div>
          <div
            v-show="inspectorTab === 'rink'"
            :id="`${inspectorId}-rink-panel`"
            class="inspector-rink"
            role="tabpanel"
            :aria-labelledby="`${inspectorId}-rink-tab`"
            tabindex="0"
          >
            <dl class="rink-dimensions">
              <dt>Dimensions de la patinoire</dt>
              <dd>
                {{ store.scenario.rink.length }} ×
                {{ store.scenario.rink.width }} m
              </dd>
            </dl>
            <div class="rink-options">
              <label
                ><input v-model="showRoles" type="checkbox" />{{
                  t('editor.roles')
                }}</label
              ><label
                ><input v-model="showPaths" type="checkbox" />{{
                  t('editor.paths')
                }}</label
              ><label
                ><input v-model="showGrid" type="checkbox" />{{
                  t('editor.grid')
                }}</label
              >
            </div>
          </div>
        </aside>
      </div>
      <details class="scenario-settings panel">
        <summary>
          {{ t('editor.setup') }}<span>{{ t('editor.setupNote') }}</span>
        </summary>
        <fieldset
          class="settings-fields"
          :disabled="!editing || !!store.sequence"
        >
          <label class="field"
            ><span>{{ t('editor.seed') }}</span
            ><input
              type="number"
              min="0"
              max="4294967295"
              step="1"
              :value="store.scenario.seed"
              @change="
                number(
                  $event,
                  (value) =>
                    store.commit((draft) => {
                      draft.seed = value;
                    }),
                  () => store.scenario.seed,
                )
              " /></label
          ><label class="field"
            ><span>{{ t('editor.teamName') }}</span
            ><input
              :value="team.label"
              maxlength="200"
              @change="
                text(
                  $event,
                  (value) =>
                    store.commit((draft) => {
                      draft.teams.find((item) => item.id === team.id)!.label =
                        value;
                    }),
                  team.label,
                )
              " /></label
          ><label class="field"
            ><span>{{ t('editor.attack') }}</span
            ><select
              :value="team.attackDirection"
              @change="
                attempt(() =>
                  attack(
                    ($event.target as HTMLSelectElement)
                      .value as ScenarioDirection,
                  ),
                )
              "
            >
              <option value="positive_x">{{ t('editor.positiveX') }}</option>
              <option value="negative_x">{{ t('editor.negativeX') }}</option>
            </select></label
          ><label class="field"
            ><span>{{ t('editor.length') }} (m)</span
            ><input
              type="number"
              min="40"
              max="70"
              step="0.01"
              :value="store.scenario.rink.length"
              @change="
                number(
                  $event,
                  (value) =>
                    store.commit((draft) => {
                      draft.rink.length = value;
                    }),
                  () => store.scenario.rink.length,
                )
              " /></label
          ><label class="field"
            ><span>{{ t('editor.width') }} (m)</span
            ><input
              type="number"
              min="20"
              max="35"
              step="0.01"
              :value="store.scenario.rink.width"
              @change="
                number(
                  $event,
                  (value) =>
                    store.commit((draft) => {
                      draft.rink.width = value;
                    }),
                  () => store.scenario.rink.width,
                )
              "
          /></label>
        </fieldset>
        <p class="field-help">{{ t('editor.targetNote') }}</p>
        <button class="text-button" :disabled="!editing" @click="load">
          {{ t('editor.loadDraft') }}
        </button>
      </details>
    </main>
    <footer class="editor-footer">
      <span>{{ t('footer') }}</span><span>{{ t('editor.localFooter') }}</span>
    </footer>
  </div>
</template>
