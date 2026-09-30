import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  ...(process.env.PW_JSON
    ? {
        reporter: [
          ['list'],
          [
            'json',
            {
              outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME ?? '.test-results/playwright.json',
            },
          ],
        ],
      }
    : {}),
  use: {
    baseURL: 'http://localhost:4173/cribbage-board/',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/cribbage-board/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
