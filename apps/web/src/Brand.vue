<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>
<template>
  <RouterLink class="brand" to="/" aria-label="HockeyDoo — accueil">
    <img
      src="/assets/hockeydoo-logo.png"
      alt="HockeyDoo"
      width="2007"
      height="783"
    />
    <small>{{ t('brandDetail') }}</small>
  </RouterLink>
</template>
