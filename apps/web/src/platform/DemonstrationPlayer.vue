<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, nextTick } from 'vue';
import type { SequenceV12 } from '@hockey-iq/contracts';
import { frozenSeek } from '@hockey-iq/replay';
import TeamRink from './TeamRink.vue';
import Icon from '../editor/Icon.vue';
import {
  demonstrationSteps,
  stepIndexAt,
  nextStepTick,
  advanceDemonstration,
} from './demonstration';
import './demonstration.css';
const props = withDefaults(
  defineProps<{
    sequence: SequenceV12;
    context?: 'model' | 'lesson';
    focusPlayer?: string;
    selected?: string;
    showCues?: boolean;
  }>(),
  { context: 'lesson', focusPlayer: '', selected: 'home-1', showCues: true },
);
const emit = defineEmits<{
  position: [tick: number];
  advance: [from: number, to: number];
  pause: [];
  select: [id: string];
}>();
const tick = ref(0),
  speed = ref(1),
  playing = ref(false),
  mode = ref<'all' | 'step'>('all'),
  track = ref<HTMLElement>();
let request = 0,
  last = 0,
  target: number | null = null;
const duration = computed(() => props.sequence.frames.length - 1);
const steps = computed(() => demonstrationSteps(props.sequence));
const currentIndex = computed(() => stepIndexAt(steps.value, tick.value));
const currentStep = computed(() => steps.value[currentIndex.value]!);
const frame = computed(() => frozenSeek(props.sequence, tick.value));
const scenario = computed(() => ({
  ...props.sequence.scenarioSnapshot,
  players: frame.value.world.players,
  puck: frame.value.world.puck,
}));
const annotations = computed(() =>
  props.showCues
    ? props.sequence.annotations.filter(
        (a) => Math.abs(a.atTick - tick.value) < 15,
      )
    : [],
);
const pauseTicks = computed(() =>
  [
    ...new Set(
      props.sequence.annotations
        .filter((a) => a.kind === 'pause')
        .map((a) => a.atTick),
    ),
  ].sort((a, b) => a - b),
);
const noun = computed(() =>
  props.context === 'model' ? 'le modèle' : 'la démonstration',
);
const playLabel = computed(() =>
  playing.value && mode.value === 'all'
    ? `Pause ${props.context === 'model' ? 'du modèle' : 'de la démonstration'}`
    : `Tout lire ${noun.value}`,
);
const stepLabel = computed(() =>
  playing.value && mode.value === 'step'
    ? 'Pause de la lecture par étapes'
    : `Lire ${noun.value} jusqu’à l’étape suivante`,
);
const playhead = computed(() => {
  const i = currentIndex.value,
    a = steps.value[i]!,
    b = steps.value[i + 1];
  const fraction = b ? (tick.value - a.tick) / (b.tick - a.tick) : 0;
  return `${((i + 0.5 + fraction) / steps.value.length) * 100}%`;
});
function pause() {
  playing.value = false;
  cancelAnimationFrame(request);
  request = 0;
  last = 0;
  target = null;
  emit('pause');
}
function animate(now: number) {
  if (!playing.value) return;
  const delta = last
    ? (Math.min(100, Math.max(0, now - last)) * 30 * speed.value) / 1000
    : 0;
  last = now;
  const next = advanceDemonstration(
    tick.value,
    delta,
    duration.value,
    pauseTicks.value,
    target,
  );
  if (next.tick !== tick.value) {
    emit('advance', tick.value, next.tick);
    tick.value = next.tick;
  }
  if (next.stopped) {
    pause();
    return;
  }
  request = requestAnimationFrame(animate);
}
function start(kind: 'all' | 'step') {
  if (playing.value && mode.value === kind) {
    pause();
    return;
  }
  if (kind === 'step' && nextStepTick(steps.value, tick.value) === null) return;
  if (kind === 'all' && tick.value >= duration.value) tick.value = 0;
  mode.value = kind;
  target = kind === 'step' ? nextStepTick(steps.value, tick.value) : null;
  if (!playing.value) {
    playing.value = true;
    last = 0;
    request = requestAnimationFrame(animate);
  }
}
function seek(value: number) {
  pause();
  tick.value = Math.max(
    0,
    Math.min(duration.value, Number.isFinite(value) ? value : 0),
  );
}
watch(tick, (value) => emit('position', value), { flush: 'sync' });
watch(
  () => props.sequence,
  () => {
    pause();
    tick.value = 0;
    mode.value = 'all';
    emit('position', 0);
  },
);
watch(currentIndex, async () => {
  await nextTick();
  const container = track.value,
    button = container?.querySelector<HTMLElement>('[aria-current="step"]');
  if (!container || !button) return;
  const outer = container.getBoundingClientRect(),
    inner = button.getBoundingClientRect();
  if (inner.left < outer.left)
    container.scrollLeft += inner.left - outer.left - 4;
  else if (inner.right > outer.right)
    container.scrollLeft += inner.right - outer.right + 4;
});

onBeforeUnmount(() => {
  cancelAnimationFrame(request);
});
defineExpose({ pause, seek });
</script>
<template>
  <div
    class="demonstration-player"
    :data-playing="playing"
    :data-mode="mode"
    :data-tick="tick"
    :data-step-tick="currentStep.tick"
  >
    <TeamRink
      :scenario="scenario"
      :selected="selected"
      :focus-player="focusPlayer"
      :annotations="annotations"
      @select="emit('select', $event)"
    >
      <template #description>
        <aside class="demonstration-bubble" aria-label="Description de l’étape">
          <p class="demonstration-bubble-counter">
            Étape {{ currentIndex + 1 }} / {{ steps.length }}
          </p>
          <h3>{{ currentStep.title }}</h3>
          <p class="demonstration-bubble-description" tabindex="0">
            {{ currentStep.description }}
          </p>
        </aside>
      </template>
    </TeamRink>
    <div class="demonstration-editor">
      <div
        class="platform-transport demonstration-transport"
        role="group"
        aria-label="Lecture de la démonstration"
      >
        <button
          type="button"
          :aria-label="`Revenir au début ${context === 'model' ? 'du modèle' : 'de la démonstration'}`"
          title="Revenir au début"
          @click="seek(0)"
        >
          <Icon name="first" />
        </button>
        <button
          type="button"
          :disabled="duration === 0"
          :aria-label="playLabel"
          :title="playLabel"
          :aria-pressed="playing && mode === 'all'"
          @click="start('all')"
        >
          <Icon :name="playing && mode === 'all' ? 'pause' : 'play'" />
        </button>
        <button
          type="button"
          :disabled="nextStepTick(steps, tick) === null"
          :aria-label="stepLabel"
          :title="stepLabel"
          :aria-pressed="playing && mode === 'step'"
          @click="start('step')"
        >
          <Icon :name="playing && mode === 'step' ? 'pause' : 'step'" />
        </button>
        <output
          class="demonstration-time"
          aria-label="Temps de la démonstration"
          >{{ (tick / 30).toFixed(2) }} /
          {{ (duration / 30).toFixed(2) }} s</output
        >
        <label class="demonstration-speed"
          >Vitesse<select v-model="speed">
            <option :value="0.5">0,5×</option>
            <option :value="1">1×</option>
            <option :value="1.5">1,5×</option>
            <option :value="2">2×</option>
          </select></label
        >
        <span class="demonstration-mode">{{
          playing
            ? mode === 'step'
              ? 'Lecture jusqu’à l’étape suivante'
              : 'Lecture continue'
            : 'En pause'
        }}</span>
      </div>
      <div class="demonstration-scrub">
        <input
          type="range"
          aria-label="Position de la démonstration"
          min="0"
          :max="duration"
          step=".01"
          :value="tick"
          :disabled="duration === 0"
          @input="seek(Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <nav
        ref="track"
        class="demonstration-timeline"
        aria-label="Étapes de la démonstration"
      >
        <div class="demonstration-track" :style="{ '--steps': steps.length }">
          <div class="demonstration-axis" aria-hidden="true" />
          <div
            class="demonstration-playhead"
            :style="{ left: playhead }"
            aria-hidden="true"
          />
          <ol>
            <li v-for="(step, i) in steps" :key="step.tick">
              <button
                type="button"
                :aria-label="`Étape ${i + 1} · ${step.title} · ${(step.tick / 30).toFixed(2)} secondes`"
                :aria-current="currentIndex === i ? 'step' : undefined"
                :data-tick="step.tick"
                @click="seek(step.tick)"
              >
                <span class="demonstration-marker">{{ i + 1 }}</span><time
                  >{{ (step.tick / 30).toFixed(2) }} s</time
                ><span class="demonstration-step-title">{{ step.title }}</span>
              </button>
            </li>
          </ol>
        </div>
      </nav>
    </div>
    <p class="demonstration-announcement" role="status">
      {{
        playing
          ? ''
          : `Étape ${currentIndex + 1} sur ${steps.length} : ${currentStep.title}.`
      }}
    </p>
  </div>
</template>
