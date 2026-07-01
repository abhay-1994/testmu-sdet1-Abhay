import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  // 90s, not the usual 30s: on a failing test, the "aiFailureAnalysis" fixture teardown makes
  // a real call to a local Ollama model (src/ai/llmClient.ts), which can take 10-15s just to
  // load the model into memory on a cold start plus generation time. That call has its own
  // 60s bound (CHAT_TIMEOUT_MS) — this test timeout just needs to be larger than that plus the
  // test's own actions, or a slow-to-analyze failure would itself time out during teardown.
  timeout: 90_000,
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
