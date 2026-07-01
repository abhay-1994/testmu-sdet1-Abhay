import type { Page } from '@playwright/test';

const MAX_BODY_TEXT = 2000;

/** Captures a compact snapshot of page state for the failure explainer prompt. Best-effort:
 *  if the page already closed/crashed, returns undefined instead of throwing. */
export async function capturePageContext(page: Page): Promise<string | undefined> {
  try {
    const url = page.url();
    const title = await page.title().catch(() => '(title unavailable)');
    const bodyText = await page
      .locator('body')
      .innerText({ timeout: 2000 })
      .catch(() => '(body text unavailable)');

    return [
      `URL: ${url}`,
      `Title: ${title}`,
      `Visible text (truncated to ${MAX_BODY_TEXT} chars):`,
      bodyText.slice(0, MAX_BODY_TEXT),
    ].join('\n');
  } catch {
    return undefined;
  }
}
