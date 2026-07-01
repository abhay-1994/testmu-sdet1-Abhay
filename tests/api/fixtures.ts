import { test as base } from '@playwright/test';
import { runFailureExplainer } from '../../src/ai/failureExplainer';
import { getLastApiExchange, clearApiExchange } from '../../src/ai/context';

type AiFixtures = {
  aiFailureAnalysis: void;
};

/** Extends the base Playwright test with an auto-fixture that, on failure, sends the last
 *  observed API request/response + error to a local Ollama model and attaches the explanation
 *  to the report. */
export const test = base.extend<AiFixtures>({
  aiFailureAnalysis: [
    async ({}, use, testInfo) => {
      clearApiExchange();
      await use();
      const exchange = getLastApiExchange();
      await runFailureExplainer(testInfo, {
        apiContext: exchange ? JSON.stringify(exchange, null, 2) : undefined,
      });
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
