import type { Reporter, FullConfig, Suite } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { resetSampleOutput } from '../src/ai/sampleOutput';

const SAMPLE_OUTPUT_PATH = path.join(process.cwd(), 'sample-output', 'ai-failure-report.json');

/**
 * Prints a console summary of every AI failure analysis collected during the run
 * (via src/ai/failureExplainer.ts) once the run finishes. This does not call Claude
 * itself — it just aggregates what the per-test fixture already attached, so the
 * "AI usage" is visible without needing to open the full HTML report.
 */
export default class AiSummaryReporter implements Reporter {
  onBegin(_config: FullConfig, _suite: Suite): void {
    resetSampleOutput();
  }

  onEnd(): void {
    if (!fs.existsSync(SAMPLE_OUTPUT_PATH)) return;

    let records: Array<{ test: string; errorSummary: string; analysis: { confidence: string; likelyRootCause: string } }>;
    try {
      records = JSON.parse(fs.readFileSync(SAMPLE_OUTPUT_PATH, 'utf-8'));
    } catch {
      return;
    }

    if (records.length === 0) return;

    console.log('\n=== AI Failure Analysis Summary (Claude) ===');
    for (const record of records) {
      console.log(`\n- ${record.test}`);
      console.log(`  error: ${record.errorSummary}`);
      console.log(`  confidence: ${record.analysis.confidence}`);
      console.log(`  root cause: ${record.analysis.likelyRootCause}`);
    }
    console.log(`\nFull analyses: sample-output/ai-failure-report.json and the HTML report attachments.\n`);
  }
}
