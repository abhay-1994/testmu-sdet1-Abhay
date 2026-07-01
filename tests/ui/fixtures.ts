import { test as base } from '@playwright/test';
import { runFailureExplainer } from '../../src/ai/failureExplainer';
import { capturePageContext } from '../../src/ai/pageContext';

type AiFixtures = {
  aiFailureAnalysis: void;
};

/** Extends the base Playwright test with an auto-fixture that, on failure, sends the page
 *  state + error to Claude and attaches the plain-English explanation to the test report. */
export const test = base.extend<AiFixtures>({
  aiFailureAnalysis: [
    async ({ page }, use, testInfo) => {
      await use();
      const pageContext = await capturePageContext(page);
      await runFailureExplainer(testInfo, { pageContext });
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
