<script setup lang="ts">
import Brand from './Brand.vue';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { CONTRACT_VERSION } from '@hockey-iq/contracts';
import { useStatusStore } from './status';
const { t } = useI18n();
const status = useStatusStore();
onMounted(() => {
  void status.refresh();
});
</script>
<template>
  <div class="shell">
    <header>
      <Brand />
      <span class="milestone">{{ t('milestone') }}</span>
    </header>
    <main>
      <section class="intro">
        <p class="eyebrow">{{ t('eyebrow') }}</p>
        <h1>{{ t('title') }}</h1>
        <p class="lead">{{ t('intro') }}</p>
      </section>
      <section class="foundation" aria-labelledby="status-title">
        <div>
          <span class="section-number" aria-hidden="true">00 — 01</span>
          <h2 id="status-title">{{ t('statusTitle') }}</h2>
          <p>{{ t('statusCopy') }}</p>
          <p class="contract">
            {{ t('contract', { version: CONTRACT_VERSION }) }}
          </p>
        </div>
        <div class="service">
          <span class="service-label">{{ t('service') }}</span>
          <p role="status" :data-state="status.state">
            <span class="dot" aria-hidden="true"></span>{{ t(status.state) }}
          </p>
          <button
            :disabled="status.state === 'checking'"
            @click="status.refresh"
          >
            {{ t('retry') }} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>
      <ol class="roadmap" aria-label="Jalons de développement">
        <li
          v-for="step in [1, 2, 3]"
          :key="step"
          :class="{ active: step === 1 }"
        >
          <span class="step-state">{{
            t(step === 1 ? 'current' : 'planned')
          }}</span>
          <h3>{{ t(`step${step}`) }}</h3>
          <p>{{ t(`step${step}Copy`) }}</p>
        </li>
      </ol>
    </main>
    <footer>
      <span>{{ t('footer') }}</span>
      <p>{{ t('note') }}</p>
    </footer>
  </div>
</template>
