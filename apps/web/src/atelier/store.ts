import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CoachingSequence } from '@hockey-iq/contracts';

export type AtelierView = 'home' | 'editor' | 'player';

export interface AtelierState {
  currentView: AtelierView;
  sequence: CoachingSequence | null;
  hasUnsavedChanges: boolean;
}

export const useAtelierStore = defineStore('atelier', () => {
  // State
  const currentView = ref<AtelierView>('home');
  const sequence = ref<CoachingSequence | null>(null);
  const hasUnsavedChanges = ref(false);

  // Computed
  const isHomeActive = computed(() => currentView.value === 'home');
  const isEditorActive = computed(() => currentView.value === 'editor');
  const isPlayerActive = computed(() => currentView.value === 'player');

  // Actions
  function goHome() {
    currentView.value = 'home';
  }

  function goToEditor(seq: CoachingSequence) {
    sequence.value = seq;
    currentView.value = 'editor';
    hasUnsavedChanges.value = false;
  }

  function goToPlayer(seq: CoachingSequence) {
    sequence.value = seq;
    currentView.value = 'player';
    hasUnsavedChanges.value = false;
  }

  function markUnsaved() {
    hasUnsavedChanges.value = true;
  }

  function markSaved() {
    hasUnsavedChanges.value = false;
  }

  function clearSequence() {
    sequence.value = null;
    hasUnsavedChanges.value = false;
  }

  return {
    // State
    currentView,
    sequence,
    hasUnsavedChanges,

    // Computed
    isHomeActive,
    isEditorActive,
    isPlayerActive,

    // Actions
    goHome,
    goToEditor,
    goToPlayer,
    markUnsaved,
    markSaved,
    clearSequence,
  };
});
