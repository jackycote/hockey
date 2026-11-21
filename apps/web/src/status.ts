import { ref } from 'vue';
import { defineStore } from 'pinia';
import { HealthSchema } from '@hockey-iq/contracts';
export const useStatusStore = defineStore('status', () => {
  const state = ref<'checking' | 'online' | 'offline'>('checking');
  async function refresh() {
    state.value = 'checking';
    try {
      const response = await fetch('/api/health', {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Health request failed');
      HealthSchema.parse(await response.json());
      state.value = 'online';
    } catch {
      state.value = 'offline';
    }
  }
  return { state, refresh };
});
