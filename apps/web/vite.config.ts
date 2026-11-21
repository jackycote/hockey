import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', 'API_');
  const proxy = {
    '/api': {
      target: `http://${env.API_HOST || '127.0.0.1'}:${env.API_PORT || '3000'}`,
    },
  };
  return { plugins: [vue()], server: { proxy }, preview: { proxy } };
});
