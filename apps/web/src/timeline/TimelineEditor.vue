<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  MAX_SEQUENCE_STEPS,
  MAX_SEQUENCE_MS,
  type CoachingStep,
} from '@hockey-iq/contracts';
import { useEditorStore } from '../editor/store';
import Icon from '../editor/Icon.vue';
import TimelineZoom from './TimelineZoom.vue';
import StepMenu from './StepMenu.vue';
import { formatTime } from './sequence';
import type { TimelineSession } from './useTimeline';
import './timeline.css';
const props = defineProps<{ session: TimelineSession; disabled: boolean }>();
const store = useEditorStore();
const scroll = ref<HTMLElement>();
const zoom = ref(90),
  error = ref('');
const drag = ref<{
  id: string;
  x: number;
  atMs: number;
  preview: number;
  moved: boolean;
} | null>(null);
const steps = computed(() => store.sequence?.steps ?? []);
const blocked = computed(
  () => props.disabled || props.session.playing.value || store.sequencePending,
);
const width = computed(() =>
  Math.max(560, (props.session.duration.value * zoom.value) / 1000 + 64),
);
const ticks = computed(() => {
  const interval = zoom.value < 55 ? 5000 : zoom.value < 110 ? 2000 : 1000;
  return Array.from(
    { length: Math.floor(props.session.duration.value / interval) + 1 },
    (_, i) => i * interval,
  );
});
function run(action: () => void) {
  error.value = '';
  try {
    action();
  } catch {
    error.value = store.sequencePending
      ? 'Enregistrez les positions de cette étape avant de continuer.'
      : 'Cette modification est impossible. Vérifiez les valeurs et les limites de la séquence.';
  }
}
const left = (ms: number) => (ms * zoom.value) / 1000;
const clipWidth = (index: number) =>
  index < steps.value.length - 1
    ? Math.max(
        6,
        left(steps.value[index + 1]!.atMs - steps.value[index]!.atMs) - 3,
      )
    : 54;
function stepLeft(step: CoachingStep) {
  return left(drag.value?.id === step.id ? drag.value.preview : step.atMs);
}
watch(
  () => props.session.time.value,
  () => {
    const element = scroll.value;
    if (!element || !props.session.playing.value) return;
    const x = 148 + left(props.session.time.value);
    if (x > element.scrollLeft + element.clientWidth - 40)
      element.scrollLeft = x - element.clientWidth + 60;
    if (x < element.scrollLeft + 148) element.scrollLeft = Math.max(0, x - 148);
  },
);
function movement(index: number, teamId: string) {
  const from = steps.value[index]!,
    to = steps.value[index + 1];
  if (!to) return 'Fin';
  const moving = from.pose.players.filter(
    (p) =>
      p.teamId === teamId &&
      to.pose.players.some(
        (t) =>
          t.id === p.id &&
          Math.hypot(t.pos.x - p.pos.x, t.pos.y - p.pos.y) > 0.01,
      ),
  ).length;
  return moving ? `${moving} en mouvement ›` : 'En place';
}
function startDrag(event: PointerEvent, step: CoachingStep) {
  if (blocked.value || event.button !== 0) return;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  drag.value = {
    id: step.id,
    x: event.clientX,
    atMs: step.atMs,
    preview: step.atMs,
    moved: false,
  };
}
function moveDrag(event: PointerEvent) {
  const current = drag.value;
  if (!current || current.id === steps.value[0]?.id) return;
  if (Math.abs(event.clientX - current.x) < 4 && !current.moved) return;
  current.moved = true;
  const index = steps.value.findIndex((s) => s.id === current.id);
  const min = steps.value[index - 1]!.atMs + 100;
  const max = steps.value[index + 1]
    ? steps.value[index + 1]!.atMs - 100
    : MAX_SEQUENCE_MS;
  current.preview = Math.max(
    min,
    Math.min(
      max,
      Math.round(
        (current.atMs + ((event.clientX - current.x) * 1000) / zoom.value) /
          100,
      ) * 100,
    ),
  );
}
function finishDrag() {
  const current = drag.value;
  drag.value = null;
  if (!current) return;
  run(() =>
    current.moved
      ? store.moveStep(current.id, current.preview)
      : props.session.select(current.id),
  );
}
function revealCommand(event: FocusEvent) {
  const container = event.currentTarget as HTMLElement;
  const button = (event.target as HTMLElement).closest('button');
  if (!button) return;
  // Mobile browsers do not consistently reveal an offscreen button when focused.
  void nextTick(() => {
    if (!button.isConnected) return;
    const viewport = container.getBoundingClientRect();
    const control = button.getBoundingClientRect();
    if (control.right > viewport.right)
      container.scrollLeft += control.right - viewport.right;
    else if (control.left < viewport.left)
      container.scrollLeft -= viewport.left - control.left;
  });
}
function returnToStart() {
  run(() => {
    props.session.rewind();
    if (scroll.value) scroll.value.scrollLeft = 0;
  });
}
function keys(event: KeyboardEvent) {
  if ((event.target as HTMLElement).closest('input,textarea,select,button'))
    return;
  if (event.code === 'Space' && store.sequence) {
    event.preventDefault();
    run(() =>
      props.session.playing.value
        ? props.session.pause()
        : props.session.play(),
    );
  }
  if (event.key === 'Escape') {
    drag.value = null;
    props.session.pause();
  }
}
</script>
<template>
  <section
    class="timeline-editor"
    aria-label="Montage de la séquence"
    @keydown="keys"
  >
    <template v-if="store.sequence">
      <div class="timeline-transport">
        <div
          class="timeline-command-scroll"
          role="group"
          aria-label="Commandes des étapes"
          tabindex="0"
          @focusin="revealCommand"
        >
          <div class="timeline-command-row">
            <button
              tabindex="0"
              class="icon-button"
              aria-label="Revenir au début"
              data-tooltip="Revenir au début"
              :disabled="disabled"
              @click="returnToStart"
            >
              <Icon name="first" />
            </button>
            <button
              tabindex="0"
              class="icon-button"
              aria-label="Étape précédente"
              :disabled="blocked || session.time.value <= 0"
              @click="run(() => session.jump(-1))"
            >
              <Icon name="stepPrevious" />
            </button>
            <button
              tabindex="0"
              class="timeline-play"
              :aria-label="
                session.playing.value
                  ? 'Pause de la séquence'
                  : 'Lire la séquence'
              "
              :disabled="
                disabled || store.sequencePending || !session.duration.value
              "
              @click="
                run(() =>
                  session.playing.value ? session.pause() : session.play(),
                )
              "
            >
              <Icon :name="session.playing.value ? 'pause' : 'play'" />
            </button>
            <button
              tabindex="0"
              class="icon-button"
              aria-label="Étape suivante enregistrée"
              :disabled="
                blocked || session.time.value >= session.duration.value
              "
              @click="run(() => session.jump(1))"
            >
              <Icon name="stepNext" />
            </button>

            <StepMenu
              :disabled="blocked"
              :can-insert="session.canInsert.value"
              :can-add="
                !session.previewing.value &&
                steps.length < MAX_SEQUENCE_STEPS &&
                session.duration.value + 2000 <= MAX_SEQUENCE_MS
              "
              @insert="run(session.insert)"
              @add="run(store.addStepAfter)"
            />
            <button
              tabindex="0"
              class="icon-button timeline-record"
              aria-label="Enregistrer l’étape"
              data-tooltip="Enregistrer l’étape"
              :disabled="
                disabled || session.playing.value || session.previewing.value
              "
              @click="run(store.recordStep)"
            >
              <span class="record-dot" aria-hidden="true"></span>
            </button>
            <button
              tabindex="0"
              class="icon-button timeline-insert"
              aria-label="Insérer une étape ici"
              data-tooltip="Insérer une étape ici"
              :disabled="
                disabled || session.playing.value || !session.canInsert.value
              "
              @click="run(session.insert)"
            >
              <Icon name="insertStep" />
            </button>
            <TimelineZoom v-model="zoom" :disabled="disabled" />
          </div>
        </div>
        <div class="timeline-playback">
          <output
            aria-label="Position de lecture"
            data-testid="timeline-time"
            >{{ formatTime(session.time.value) }}</output><span
            class="timeline-total"
            >/ {{ formatTime(session.duration.value) }}</span
          >
          <label class="timeline-rate"
            ><span class="sr-only">Vitesse</span
            ><select
              :value="session.speed.value"
              aria-label="Vitesse de la séquence"
              title="Vitesse de la séquence"
              @change="
                session.setSpeed(
                  Number(($event.target as HTMLSelectElement).value),
                )
              "
            >
              <option :value="0.25">0,25×</option>
              <option :value="0.5">0,5×</option>
              <option :value="1">1×</option>
              <option :value="2">2×</option>
            </select></label
          >
        </div>
      </div>
      <div
        ref="scroll"
        class="timeline-scroll"
        :aria-busy="session.playing.value"
      >
        <div
          class="timeline-grid"
          :style="{ '--track-width': `${width}px`, '--grid-step': `${zoom}px` }"
        >
          <div class="timeline-ruler">
            <span class="timeline-lane-label">TEMPS <small>min:s</small></span>
            <div class="timeline-axis">
              <span
                v-for="tick in ticks"
                :key="tick"
                class="timeline-tick"
                :style="{ left: `${left(tick)}px` }"
                >{{ formatTime(tick) }}</span
              >
              <input
                class="timeline-scrubber"
                type="range"
                min="0"
                :max="session.duration.value || 1"
                step="10"
                :value="session.time.value"
                :aria-valuetext="formatTime(session.time.value)"
                aria-label="Curseur de lecture"
                :disabled="
                  disabled || store.sequencePending || !session.duration.value
                "
                :style="{ width: `${left(session.duration.value)}px` }"
                @input="
                  run(() =>
                    session.seek(
                      Number(($event.target as HTMLInputElement).value),
                    ),
                  )
                "
              />
            </div>
          </div>
          <div class="timeline-lane steps-lane">
            <span class="timeline-lane-label"><Icon name="step" />Étapes</span>
            <div class="timeline-track">
              <button
                v-for="(step, index) in steps"
                :key="step.id"
                class="timeline-clip"
                :class="{
                  selected: store.stepId === step.id,
                  observation: step.kind === 'observation',
                  dragging: drag?.id === step.id && drag.moved,
                }"
                :style="{
                  left: `${stepLeft(step)}px`,
                  width: `${clipWidth(index)}px`,
                }"
                :aria-label="`Étape ${index + 1} : ${step.label}`"
                :aria-pressed="store.stepId === step.id"
                :title="`${step.label} · ${formatTime(step.atMs)}. Glisser pour ajuster le temps.`"
                :disabled="blocked"
                @pointerdown="startDrag($event, step)"
                @pointermove="moveDrag"
                @pointerup="finishDrag"
                @pointercancel="drag = null"
                @click="
                  $event.detail === 0 && run(() => session.select(step.id))
                "
              >
                <span class="clip-index">{{ index + 1 }}</span><strong>{{
                  step.label
                }}</strong
                ><small>{{
                  formatTime(drag?.id === step.id ? drag.preview : step.atMs)
                }}</small>
              </button>
            </div>
          </div>
          <div
            v-for="(team, teamIndex) in store.scenario.teams"
            :key="team.id"
            class="timeline-lane"
            :class="{ away: teamIndex === 1 }"
          >
            <span class="timeline-lane-label"
              ><i class="lane-dot"></i>{{ team.label }}</span
            >
            <div class="timeline-track">
              <span
                v-for="(step, index) in steps.slice(0, -1)"
                :key="step.id"
                class="motion-clip"
                :style="{
                  left: `${left(step.atMs)}px`,
                  width: `${clipWidth(index)}px`,
                }"
                >{{ movement(index, team.id) }}</span
              >
            </div>
          </div>
          <div class="timeline-lane puck-lane">
            <span class="timeline-lane-label"
              ><Icon name="puck" />Rondelle</span
            >
            <div class="timeline-track">
              <span
                v-for="(step, index) in steps.slice(0, -1)"
                :key="step.id"
                class="motion-clip"
                :style="{
                  left: `${left(step.atMs)}px`,
                  width: `${clipWidth(index)}px`,
                }"
                >{{
                  step.pose.puck.holderId ===
                  steps[index + 1]!.pose.puck.holderId
                    ? step.pose.puck.holderId
                      ? 'Portée'
                      : 'Libre'
                    : 'Transfert ›'
                }}</span
              >
            </div>
          </div>
          <div class="timeline-lane observation-lane">
            <span class="timeline-lane-label"
              ><span aria-hidden="true">◎</span>Observation</span
            >
            <div class="timeline-track">
              <template v-for="(step, index) in steps" :key="step.id"
                ><button
                  v-if="step.kind === 'observation'"
                  class="observation-clip"
                  :style="{
                    left: `${left(step.atMs)}px`,
                    width: `${clipWidth(index)}px`,
                  }"
                  :disabled="blocked"
                  :aria-label="`Observation : ${step.label}`"
                  @click="run(() => session.select(step.id))"
                >
                  ◎ {{ step.observation?.prompt || 'Regarder et lire le jeu' }}
                </button></template
              >
            </div>
          </div>
          <div
            class="timeline-playhead"
            :style="{ left: `${148 + left(session.time.value)}px` }"
          >
            <i></i>
          </div>
        </div>
      </div>
      <div class="timeline-status">
        <span v-if="store.sequencePending" class="pending-step"
          >● Positions modifiées — enregistrez l’étape pour poursuivre.<button
            class="text-button"
            @click="run(store.discardStep)"
          >
            Rétablir les positions enregistrées
          </button></span
        ><span v-else-if="session.playing.value"
          >Lecture des positions enregistrées. Arrêt automatique aux étapes
          Observation.</span
        ><span v-else-if="session.previewing.value"
          >Aperçu à {{ formatTime(session.time.value) }}. Insérez une étape ici
          ou sélectionnez une étape à modifier.<button
            class="text-button"
            @click="run(() => session.select(store.stepId!))"
          >
            Revenir à l’étape sélectionnée
          </button></span
        ><span v-else
          >Placez les joueurs sur la patinoire, puis enregistrez l’étape.
          Glissez un clip pour ajuster son temps.</span
        >
      </div>
    </template>
    <p v-if="error" class="timeline-error" role="alert">{{ error }}</p>
  </section>
</template>
