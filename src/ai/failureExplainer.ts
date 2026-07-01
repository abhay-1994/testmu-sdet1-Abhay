import * as path from 'path';
import type { TestInfo, TestInfoError } from '@playwright/test';
import { explainFailure, isOllamaReachable, type FailureAnalysis } from './llmClient';
import { appendSampleOutput } from './sampleOutput';

// Why Option A (Failure Explainer) over Option B (Flaky Test Classifier): a flaky-test
// classifier needs a *history* of runs to classify against, so it isn't meaningfully
// demonstrable from a single `npm test` invocation. A failure explainer produces real,
// independently-checkable output from one run — a real error plus real page/API context in,
// a plain-English explanation out — which is a more honest demonstration of an LLM call doing
// something a reviewer can verify without needing to run the suite N times first.

// Built from String.fromCharCode rather than a regex literal containing a raw escape byte,
// so the source file doesn't carry an invisible control character.
const ANSI_ESCAPE_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

export function isFailedTest(testInfo: TestInfo): boolean {
  return testInfo.status !== testInfo.expectedStatus && Boolean(testInfo.error);
}

function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE_PATTERN, '');
}

function formatError(error: TestInfoError | undefined): string {
  if (!error) return 'Unknown error (no TestInfoError captured).';
  const message = stripAnsi(error.message ?? 'No message');
  const stackLines = error.stack ? stripAnsi(error.stack).split('\n').slice(0, 6).join('\n') : undefined;
  return stackLines ? `${message}\n\nStack (top lines):\n${stackLines}` : message;
}

function toMarkdown(analysis: FailureAnalysis): string {
  return [
    '# AI Failure Analysis (local LLM via Ollama)',
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
 * failure context to a local Ollama model, attaches the plain-English analysis to the
 * Playwright test report, and appends a copy to sample-output/ai-failure-report.json.
 */
export async function runFailureExplainer(
  testInfo: TestInfo,
  context: { pageContext?: string; apiContext?: string },
): Promise<void> {
  if (!isFailedTest(testInfo)) return;

  if (!(await isOllamaReachable())) {
    await testInfo.attach('ai-failure-analysis-skipped.txt', {
      body:
        'AI failure analysis skipped: could not reach Ollama at ' +
        `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}.\n` +
        'Install Ollama (https://ollama.com), run `ollama pull llama3.2` (or set OLLAMA_MODEL ' +
        'to a model you already have), and make sure `ollama serve` is running, then re-run the ' +
        'suite to enable Task 3 (AI Failure Explainer).',
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
      file: path.relative(process.cwd(), testInfo.file).split(path.sep).join('/'),
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
