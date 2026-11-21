<script setup lang="ts">
import { computed, ref } from 'vue';
import { MAX_SEQUENCE_STEPS } from '@hockey-iq/contracts';
import { useEditorStore } from '../editor/store';
import Icon from '../editor/Icon.vue';
import { durationOf, formatTime } from './sequence';
import './timeline.css';
defineProps<{ disabled: boolean }>();
const emit = defineEmits<{ create: [] }>();
const store = useEditorStore();
const heading = ref<HTMLHeadingElement>();
const header = ref<HTMLElement>();
function revealHeading() {
  heading.value?.focus({ preventScroll: true });
  header.value?.scrollIntoView({
    block: 'start',
    inline: 'nearest',
    behavior: 'instant',
  });
}
defineExpose({ revealHeading });
const duration = computed(() =>
  store.sequence ? durationOf(store.sequence) : 0,
);
</script>
<template>
  <section
    v-if="store.sequence"
    ref="header"
    class="timeline-heading sequence-heading"
    aria-label="En-tête de la séquence"
  >
    <div>
      <p class="eyebrow">SÉQUENCE PÉDAGOGIQUE</p>
      <h2 ref="heading" tabindex="-1">Montage</h2>
    </div>
    <p class="timeline-count">
      {{ store.sequence.steps.length }} / {{ MAX_SEQUENCE_STEPS }} étapes
      <span>•</span>{{ formatTime(duration) }}
    </p>
  </section>
  <div v-else class="sequence-create">
    <button class="primary" :disabled="disabled" @click="emit('create')">
      <Icon name="plus" />Créer une séquence
    </button>
  </div>
</template>
