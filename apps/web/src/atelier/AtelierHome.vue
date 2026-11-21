<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAtelierStore } from './store';
import { useEditorStore } from '../editor/store';
import { createSequence } from '../timeline/sequence';
import Brand from '../Brand.vue';

const { t } = useI18n();
const router = useRouter();
const atelier = useAtelierStore();
const editor = useEditorStore();

const isLoading = ref(false);
const error = ref<string | null>(null);

const canLoadSequence = computed(() => {
  // Will be true if sequences are available from API
  return false; // Temporarily disabled until Phase 3
});

const canLoadTactic = computed(() => {
  // Will be true if tactic catalog is available
  return false; // Temporarily disabled until Phase 3
});

async function handleCreateSequence() {
  try {
    isLoading.value = true;
    error.value = null;

    // Initialize editor with current scenario from browser storage
    editor.initialize(localStorage);

    // Create a new blank sequence from the scenario
    const newSequence = createSequence(editor.scenario);

    // Store in Atelier state
    atelier.goToEditor(newSequence);

    // Navigate to editor
    await router.push('/editor-local');
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : t('atelier.error.generic');
  } finally {
    isLoading.value = false;
  }
}

async function handleLoadSequence() {
  try {
    isLoading.value = true;
    error.value = null;

    // TODO: Implement sequence picker dialog
    // This will be a modal showing available sequences with filtering/sorting
    console.log('Load sequence action - to be implemented in Phase 3');
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : t('atelier.error.generic');
  } finally {
    isLoading.value = false;
  }
}

async function handleLoadTactic() {
  try {
    isLoading.value = true;
    error.value = null;

    // TODO: Implement tactic picker dialog
    // This will be a modal showing available tactics from catalog
    console.log('Load tactic action - to be implemented in Phase 3');
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : t('atelier.error.generic');
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="shell atelier-home">
    <header>
      <Brand />
      <div class="header-spacer"></div>
    </header>

    <main class="atelier-main">
      <section class="intro">
        <p class="eyebrow">{{ t('atelier.eyebrow') }}</p>
        <h1>{{ t('atelier.title') }}</h1>
        <p class="lead">{{ t('atelier.intro') }}</p>
      </section>

      <section class="actions" aria-labelledby="actions-title">
        <h2 id="actions-title" class="sr-only">{{ t('atelier.actions') }}</h2>

        <div v-if="error" class="error-banner" role="alert" aria-live="polite">
          <span aria-hidden="true">⚠</span>
          {{ error }}
        </div>

        <div class="action-buttons">
          <button
            class="action-button create"
            :disabled="isLoading"
            :aria-label="t('atelier.createSequenceLabel')"
            title="Créer une nouvelle séquence d'entraînement"
            @click="handleCreateSequence"
          >
            <span class="icon" aria-hidden="true">✎</span>
            <span class="label">{{ t('atelier.createSequence') }}</span>
            <span class="sublabel">{{ t('atelier.createSequenceSub') }}</span>
          </button>

          <button
            class="action-button load-sequence"
            :disabled="isLoading || !canLoadSequence"
            :aria-label="t('atelier.loadSequenceLabel')"
            title="Charger une séquence déjà créée"
            @click="handleLoadSequence"
          >
            <span class="icon" aria-hidden="true">📂</span>
            <span class="label">{{ t('atelier.loadSequence') }}</span>
            <span class="sublabel">{{ t('atelier.loadSequenceSub') }}</span>
          </button>

          <button
            class="action-button load-tactic"
            :disabled="isLoading || !canLoadTactic"
            :aria-label="t('atelier.loadTacticLabel')"
            title="Charger une tactique du catalogue"
            @click="handleLoadTactic"
          >
            <span class="icon" aria-hidden="true">📚</span>
            <span class="label">{{ t('atelier.loadTactic') }}</span>
            <span class="sublabel">{{ t('atelier.loadTacticSub') }}</span>
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.shell.atelier-home {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 100%;
  padding: 0 56px;
}

@media (max-width: 768px) {
  .shell.atelier-home {
    padding: 0 24px;
  }
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 0;
  border-bottom: 1px solid var(--line-soft);
  gap: 20px;
  flex-shrink: 0;
}

.header-spacer {
  flex-grow: 1;
}

.atelier-main {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
}

.intro {
  text-align: center;
  margin-bottom: 48px;
  max-width: 600px;
}

.eyebrow {
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.16em;
  font-weight: 750;
  text-transform: uppercase;
  margin: 0 0 16px 0;
}

h1 {
  font-size: clamp(32px, 4vw, 48px);
  line-height: 1.1;
  letter-spacing: -0.03em;
  font-weight: 650;
  margin: 0 0 16px 0;
  color: var(--ink);
}

.lead {
  color: var(--muted);
  font-size: 16px;
  line-height: 1.6;
  margin: 0;
}

.actions {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.error-banner {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 24px;
  color: #991b1b;
  font-size: 14px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  width: 100%;
}

@media (max-width: 768px) {
  .action-buttons {
    grid-template-columns: 1fr;
  }
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 24px;
  background-color: var(--surface);
  border: 2px solid var(--line-soft);
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease-in-out;
  font-family: inherit;
  min-height: 140px;
  position: relative;
  overflow: hidden;
}

.action-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(8, 124, 189, 0.05) 0%,
    rgba(8, 124, 189, 0) 100%
  );
  opacity: 0;
  transition: opacity 150ms ease-in-out;
  pointer-events: none;
}

.action-button:hover:not(:disabled)::before {
  opacity: 1;
}

.action-button:hover:not(:disabled) {
  border-color: var(--blue);
  box-shadow: 0 4px 12px rgba(8, 124, 189, 0.1);
  transform: translateY(-2px);
}

.action-button:focus {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(8, 124, 189, 0.05);
}

.action-button .icon {
  font-size: 28px;
  display: block;
}

.action-button .label {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
}

.action-button .sublabel {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.4;
}

.action-button.create {
  --accent: var(--blue);
}

.action-button.load-sequence {
  --accent: var(--team-home);
}

.action-button.load-tactic {
  --accent: var(--red);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
