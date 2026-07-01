import type { TestInfo, TestInfoError } from '@playwright/test';
import { explainFailure, type FailureAnalysis } from './llmClient';
import { appendSampleOutput } from './sampleOutput';

export function isFailedTest(testInfo: TestInfo): boolean {
  return testInfo.status !== testInfo.expectedStatus && Boolean(testInfo.error);
}

function formatError(error: TestInfoError | undefined): string {
  if (!error) return 'Unknown error (no TestInfoError captured).';
  const message = error.message ?? 'No message';
  const stackLines = error.stack ? error.stack.split('\n').slice(0, 6).join('\n') : undefined;
  return stackLines ? `${message}\n\nStack (top lines):\n${stackLines}` : message;
}

function toMarkdown(analysis: FailureAnalysis): string {
  return [
    '# AI Failure Analysis (Claude)',
    '',
    `**Confidence:** ${analysis.confidence}`,
    '',
    '## What broke',
    analysis.explanation,
    '',
    '## Likely root cause',
    analysis.likelyRootCause,
    '',
    '## Suggested fix',
    analysis.suggestedFix,
    '',
  ].join('\n');
}

/**
 * Called from an auto-fixture teardown after every test. If the test failed, sends the
 * failure context to Claude, attaches the plain-English analysis to the Playwright test
 * report, and appends a copy to sample-output/ai-failure-report.json.
 */
export async function runFailureExplainer(
  testInfo: TestInfo,
  context: { pageContext?: string; apiContext?: string },
): Promise<void> {
  if (!isFailedTest(testInfo)) return;

  if (!process.env.ANTHROPIC_API_KEY) {
    await testInfo.attach('ai-failure-analysis-skipped.txt', {
      body:
        'AI failure analysis skipped: ANTHROPIC_API_KEY is not set.\n' +
        'Copy .env.example to .env and add a real key to enable Task 3 (AI Failure Explainer).',
      contentType: 'text/plain',
    });
    return;
  }

  const errorMessage = formatError(testInfo.error);

  try {
    const analysis = await explainFailure({
      testTitle: testInfo.title,
      errorMessage,
      pageContext: context.pageContext,
      apiContext: context.apiContext,
    });

    await testInfo.attach('ai-failure-analysis.md', {
      body: toMarkdown(analysis),
      contentType: 'text/markdown',
    });

    appendSampleOutput({
      test: testInfo.titlePath.slice(1).join(' > '),
      file: testInfo.file,
      timestamp: new Date().toISOString(),
      errorSummary: errorMessage.split('\n')[0],
      analysis,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await testInfo.attach('ai-failure-analysis-error.txt', {
      body: `The AI failure explainer itself threw an error, so no analysis is available:\n${message}`,
      contentType: 'text/plain',
    });
  }
}
