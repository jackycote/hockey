<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SequenceV12, Scenario, ContextRole } from '@hockey-iq/contracts';
import { frozenSeek, validateFrozenSequence } from '@hockey-iq/replay';
import { ROLE_NAMES } from '@hockey-iq/play-systems';
import DemonstrationPlayer from './DemonstrationPlayer.vue';
import { playerLabel, PHASE_NAMES } from './labels';
const props = defineProps<{
  lesson: { name: string; description: string; sequences: SequenceV12[] };
  completed?: boolean;
  allowCompletion?: boolean;
}>();
const emit = defineEmits<{ complete: []; progress: [ticks: number] }>();
const index = ref(0),
  tick = ref(0),
  focus = ref(''),
  showCues = ref(true),
  error = ref('');
const player = ref<InstanceType<typeof DemonstrationPlayer>>();
const visited = new Set<string>();
const focusRole = ref<ContextRole | ''>('');
const effectiveFocus = computed(() =>
  focusRole.value
    ? (Object.entries(frame.value.roles).find(
        ([, role]) => role === focusRole.value,
      )?.[0] ?? '')
    : focus.value,
);
const sequence = computed(() => props.lesson.sequences[index.value]!);
const frame = computed(() => frozenSeek(sequence.value, tick.value));
const scenario = computed<Scenario>(() => ({
  ...sequence.value.scenarioSnapshot,
  players: frame.value.world.players,
  puck: frame.value.world.puck,
}));
const annotations = computed(() =>
  sequence.value.annotations.filter(
    (a) => Math.abs(a.atTick - tick.value) < 15,
  ),
);
function pause() {
  player.value?.pause();
}
function advanced(from: number, to: number) {
  for (let t = Math.floor(from); t <= Math.floor(to); t++)
    visited.add(`${index.value}:${t}`);
}
watch(
  () => props.lesson,
  () => {
    pause();
    index.value = 0;
    tick.value = 0;
    visited.clear();
    error.value = '';
    try {
      props.lesson.sequences.forEach(validateFrozenSequence);
    } catch {
      error.value =
        'L’intégrité de cette démonstration ne peut pas être vérifiée.';
    }
  },
  { immediate: true },
);
watch(index, () => {
  pause();
  tick.value = 0;
  focus.value = '';
  focusRole.value = '';
});
</script>
<template>
  <section class="lesson-player" aria-label="Lecteur de leçon">
    <h2>{{ lesson.name }}</h2>
    <p>{{ lesson.description }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-else>
      <label v-if="lesson.sequences.length > 1"
        >Séquence<select v-model="index">
          <option v-for="(s, i) in lesson.sequences" :key="i" :value="i">
            {{ i + 1 }} · {{ s.name }}
          </option>
        </select></label
      >
      <DemonstrationPlayer
        ref="player"
        :sequence="sequence"
        :selected="effectiveFocus || 'home-1'"
        :focus-player="
          effectiveFocus ||
          (showCues
            ? (annotations.find((a) => a.kind === 'focus')?.playerId ?? '')
            : '')
        "
        :show-cues="showCues"
        @position="tick = $event"
        @advance="advanced"
        @pause="emit('progress', visited.size)"
        @select="
          focus = $event;
          focusRole = '';
        "
      />
      <div class="platform-fields">
        <label
          >Focus joueur<select v-model="focus" @change="focusRole = ''">
            <option value="">Tous les joueurs</option>
            <option v-for="p in scenario.players" :key="p.id" :value="p.id">
              {{ playerLabel(scenario, p.id) }}
            </option>
          </select></label
        ><label
          >Focus rôle<select v-model="focusRole">
            <option value="">Tous les rôles</option>
            <option v-for="(role, id) in frame.roles" :key="id" :value="role">
              {{ ROLE_NAMES[role] }}
            </option>
          </select></label
        ><label
          ><input v-model="showCues" type="checkbox" />Afficher les indices
          pédagogiques</label
        >
      </div>
      <aside
        v-if="showCues && annotations.length"
        class="lesson-annotations"
        aria-live="polite"
      >
        <p v-for="a in annotations" :key="a.id">
          {{ a.kind === 'pause' ? '◎ ' : '' }}{{ a.text
          }}<span v-if="a.playerId">
            · {{ playerLabel(scenario, a.playerId) }}</span
          >
        </p>
      </aside>
      <details>
        <summary>Fiche du système · {{ sequence.systemSnapshot.name }}</summary>
        <p>{{ sequence.systemSnapshot.description }}</p>
        <ul>
          <li v-for="rule in sequence.systemSnapshot.rules" :key="rule.id">
            {{ rule.explanation }} · priorité {{ rule.priority }}
          </li>
        </ul>
        <p>
          {{
            Object.values(frame.roles)
              .map((r) => ROLE_NAMES[r])
              .join(' · ')
          }}
        </p>
      </details>
      <details>
        <summary>Comprendre les décisions</summary>
        <p>{{ PHASE_NAMES[frame.phase] }}</p>
        <ul>
          <li
            v-for="d in frame.decisions.filter(
              (d) => !effectiveFocus || d.playerId === effectiveFocus,
            )"
            :key="d.playerId"
          >
            <strong>{{ ROLE_NAMES[d.role] }}</strong> — {{ d.explanation }}
          </li>
        </ul>
      </details>
      <button
        v-if="allowCompletion !== false"
        class="platform-primary"
        :disabled="completed"
        @click="
          pause();
          emit('complete');
        "
      >
        {{ completed ? 'Leçon terminée' : 'Marquer comme terminé' }}
      </button>
    </template>
  </section>
</template>
