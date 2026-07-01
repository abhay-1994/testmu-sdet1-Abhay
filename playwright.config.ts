import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  // The UI suite hits a shared public demo instance (opensource-demo.orangehrmlive.com),
  // which occasionally responds slowly under load from other users. One retry absorbs
  // that transient flakiness without masking real, deterministic assertion failures
  // (which fail the same way every time and still show up as failed after a retry).
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['./reporters/ai-summary-reporter.ts'],
  ],
  use: {
    baseURL: process.env.UI_BASE_URL ?? 'https://opensource-demo.orangehrmlive.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'ui-chromium',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: process.env.API_BASE_URL ?? 'https://dummyjson.com' },
    },
  ],
});
