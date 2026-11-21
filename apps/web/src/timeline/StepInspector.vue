<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { CoachingStep, Observation } from '@hockey-iq/contracts';
import { useEditorStore } from '../editor/store';
import { formatTime } from './sequence';
import type { TimelineSession } from './useTimeline';
defineProps<{ session: TimelineSession; disabled: boolean }>();
const store = useEditorStore();
const error = ref('');
const selectedIndex = computed(
  () =>
    store.sequence?.steps.findIndex((step) => step.id === store.stepId) ?? -1,
);
const observer = computed(() => store.currentStep?.observation);
watch(
  () => store.stepId,
  () => {
    error.value = '';
  },
);
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
function playerName(id: string) {
  const player = store.scenario.players.find((p) => p.id === id)!;
  return `${store.scenario.teams.find((t) => t.id === player.teamId)!.label} · ${player.label}`;
}
function setKind(value: string) {
  const playerId = store.selectedPlayer?.id ?? store.scenario.players[0]!.id;
  run(() =>
    store.updateStep({
      kind: value as CoachingStep['kind'],
      observation:
        value === 'observation'
          ? { playerId, lookAt: { kind: 'puck' }, prompt: '' }
          : null,
    }),
  );
}
function setObservation(patch: Partial<Observation>) {
  if (observer.value)
    run(() =>
      store.updateStep({ observation: { ...observer.value!, ...patch } }),
    );
}
function lookTarget(value: string) {
  setObservation({
    lookAt:
      value === 'puck'
        ? { kind: 'puck' }
        : value === 'point'
          ? {
              kind: 'point',
              point: {
                x: store.scenario.rink.length / 2,
                y: store.scenario.rink.width / 2,
              },
            }
          : { kind: 'player', playerId: value },
  });
}
function point(axis: 'x' | 'y', value: number) {
  if (observer.value?.lookAt.kind === 'point')
    setObservation({
      lookAt: {
        kind: 'point',
        point: { ...observer.value.lookAt.point, [axis]: value },
      },
    });
}
</script>
<template>
  <div v-if="store.currentStep" class="step-inspector">
    <div class="step-summary">
      <div class="timeline-step-number">
        {{ selectedIndex + 1 }}<small>ÉTAPE</small>
      </div>
      <div>
        <h3>{{ store.currentStep.label }}</h3>
        <p>Étape sélectionnée · {{ formatTime(store.currentStep.atMs) }}</p>
      </div>
    </div>
    <p v-if="session.previewing.value" class="step-preview-note" role="status">
      Aperçu à {{ formatTime(session.time.value) }}. Les propriétés ci-dessous
      décrivent l’étape sélectionnée, en lecture seule. Sélectionnez un clip
      pour la modifier.
    </p>
    <fieldset
      class="timeline-inspector"
      :disabled="disabled || session.playing.value || session.previewing.value"
    >
      <label
        >Nom de l’étape<input
          :value="store.currentStep?.label"
          maxlength="100"
          @change="
            run(() =>
              store.updateStep({
                label: ($event.target as HTMLInputElement).value,
              }),
            )
          "
      /></label>
      <label
        >Temps de l’étape (s)<input
          type="number"
          :value="(store.currentStep?.atMs ?? 0) / 1000"
          min="0"
          max="300"
          step="0.1"
          :disabled="selectedIndex === 0 || store.sequencePending"
          @change="
            run(() =>
              store.moveStep(
                store.stepId!,
                Number(($event.target as HTMLInputElement).value) * 1000,
              ),
            )
          "
      /></label>
      <label
        >Type d’étape<select
          aria-label="Type d’étape"
          :value="store.currentStep?.kind"
          @change="setKind(($event.target as HTMLSelectElement).value)"
        >
          <option value="play">Jeu</option>
          <option value="observation">Observation</option>
        </select></label
      >
      <button
        class="timeline-delete"
        :disabled="selectedIndex <= 0 || store.sequencePending"
        @click="run(store.removeStep)"
      >
        Supprimer l’étape
      </button>
      <template v-if="observer">
        <label
          >Joueur qui observe<select
            aria-label="Joueur qui observe"
            :value="observer.playerId"
            @change="
              setObservation({
                playerId: ($event.target as HTMLSelectElement).value,
                lookAt: { kind: 'puck' },
              })
            "
          >
            <option
              v-for="player in store.scenario.players"
              :key="player.id"
              :value="player.id"
            >
              {{ playerName(player.id) }}
            </option>
          </select></label
        >
        <label
          >Où regarder<select
            aria-label="Où regarder"
            :value="
              observer.lookAt.kind === 'player'
                ? observer.lookAt.playerId
                : observer.lookAt.kind
            "
            @change="lookTarget(($event.target as HTMLSelectElement).value)"
          >
            <option value="puck">Rondelle</option>
            <option value="point">Point sur la glace</option>
            <option
              v-for="player in store.scenario.players.filter(
                (p) => p.id !== observer!.playerId,
              )"
              :key="player.id"
              :value="player.id"
            >
              {{ playerName(player.id) }}
            </option>
          </select></label
        >
        <template v-if="observer.lookAt.kind === 'point'"
          ><label
            >Regard X (m)<input
              type="number"
              :value="observer.lookAt.point.x"
              min="0"
              :max="store.scenario.rink.length"
              step="0.5"
              @change="
                point('x', Number(($event.target as HTMLInputElement).value))
              " /></label
          ><label
            >Regard Y (m)<input
              type="number"
              :value="observer.lookAt.point.y"
              min="0"
              :max="store.scenario.rink.width"
              step="0.5"
              @change="
                point('y', Number(($event.target as HTMLInputElement).value))
              " /></label
        ></template>
        <label class="observation-prompt"
          >Question ou consigne<input
            :value="observer.prompt"
            maxlength="1000"
            placeholder="Quelle option de passe est libre ?"
            @change="
              setObservation({
                prompt: ($event.target as HTMLInputElement).value,
              })
            "
        /></label>
        <p class="observation-help">
          Le repère doré indique où regarder. La lecture s’arrête à cette étape;
          appuyez sur Lecture pour continuer.
        </p>
      </template>
    </fieldset>
    <p v-if="error" class="timeline-error" role="alert">{{ error }}</p>
  </div>
  <p v-else class="step-empty">
    Créez une séquence pour afficher les propriétés de l’étape.
  </p>
</template>
