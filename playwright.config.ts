import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.SMOKE_PORT ?? 4173);
const BASE_URL = `http://127.0.0.1:${PORT}/castle-archive-memory-vault/`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.SMOKE_NO_WEB_SERVER
    ? undefined
    : {
        command: `npx vite preview --base /castle-archive-memory-vault/ --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 60_000,
      },
});
