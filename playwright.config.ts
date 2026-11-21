import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5193',
    trace: {
      mode: 'retain-on-failure',
      screenshots: false,
      snapshots: true,
      sources: true,
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' },
    },
  ],
  webServer: [
    {
      command:
        'pnpm --filter @hockey-iq/api exec tsx --env-file-if-exists=../../.env src/server.ts',
      url: 'http://127.0.0.1:3100/api/health',
      reuseExistingServer: false,
      env: {
        API_PORT: '3100',
        API_HOST: '127.0.0.1',
        ENABLE_DEMO_AUTH: 'true',
        API_DB_MODE: 'memory',
        API_DATA_DIR: '../../work/e2e-v12',
        PUBLIC_APP_URL: 'http://127.0.0.1:5193',
      },
    },
    {
      command:
        'pnpm --filter @hockey-iq/web exec vite preview --host 127.0.0.1 --port 5193 --strictPort',
      url: 'http://127.0.0.1:5193',
      env: { API_PORT: '3100', API_HOST: '127.0.0.1' },
      reuseExistingServer: false,
    },
  ],
});
