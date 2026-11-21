import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { createI18n } from 'vue-i18n';
import App from './App.vue';
import FoundationView from './FoundationView.vue';
import { messages } from './messages';
import './style.css';
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./atelier/AtelierHome.vue') },
    {
      path: '/editor-local',
      component: () => import('./editor/EditorView.vue'),
    },
    { path: '/fondation', component: FoundationView },
    {
      path: '/equipes',
      component: () => import('./platform/WorkspaceView.vue'),
    },
  ],
});
createApp(App)
  .use(createPinia())
  .use(router)
  .use(
    createI18n({
      legacy: false,
      locale: 'fr-CA',
      fallbackLocale: 'fr-CA',
      messages,
    }),
  )
  .mount('#app');
