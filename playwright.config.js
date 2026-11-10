import { defineConfig } from '@playwright/test';

const desktop = { width: 1280, height: 800 };
const mobile = { width: 390, height: 844 };

export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on',
    video: 'on',
    screenshot: 'on',
  },
  projects: [
    { name: 'desktop', use: { viewport: desktop } },
    { name: 'mobile', use: { viewport: mobile } },
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
