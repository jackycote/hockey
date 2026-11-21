<script setup lang="ts">
import { ref, shallowRef, watch, onBeforeUnmount } from 'vue';
import type { SequenceV12 } from '@hockey-iq/contracts';
import DemonstrationPlayer from './DemonstrationPlayer.vue';
const props = defineProps<{ source: SequenceV12 }>();
const sequence = shallowRef<SequenceV12>(),
  error = ref(''),
  prepared = ref(0);
let worker: Worker | undefined,
  generation = 0;
watch(
  () => props.source,
  (source) => {
    const current = ++generation;
    worker?.terminate();
    sequence.value = undefined;
    error.value = '';
    prepared.value = 0;
    worker = new Worker(new URL('./tactics.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e) => {
      if (current !== generation) return;
      if (e.data.type === 'preparing') prepared.value = e.data.ticks;
      else if (e.data.type === 'prepared') {
        sequence.value = {
          ...e.data.recording,
          name: source.name,
          systemId: source.systemId,
          systemVersion: source.systemVersion,
        };
        worker?.terminate();
        worker = undefined;
      } else if (e.data.type === 'error') {
        error.value = 'La démonstration n’a pas pu être préparée.';
        worker?.terminate();
        worker = undefined;
      }
    };
    worker.onerror = () => {
      if (current === generation)
        error.value = 'La démonstration n’a pas pu être préparée.';
    };
    worker.postMessage({
      type: 'prepare',
      scenario: JSON.parse(JSON.stringify(source.scenarioSnapshot)),
      system: JSON.parse(JSON.stringify(source.systemSnapshot)),
      teamId: source.controlledTeamId,
      ticks: 360,
    });
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  generation++;
  worker?.terminate();
});
</script>
<template>
  <section class="platform-card" aria-label="Simulation du catalogue">
    <h2>Essayer le modèle · {{ source.systemSnapshot.name }}</h2>
    <p>Suivez les étapes de la démonstration, ou choisissez Tout lire.</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <DemonstrationPlayer
      v-else-if="sequence"
      :sequence="sequence"
      context="model"
    />
    <div v-else class="demonstration-preparation">
      <p role="status">Préparation de la démonstration…</p>
      <progress
        :value="prepared"
        :max="360"
        aria-label="Préparation de la démonstration"
      />
    </div>
  </section>
</template>
