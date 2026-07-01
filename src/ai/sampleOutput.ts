import * as fs from 'fs';
import * as path from 'path';
import type { FailureAnalysis } from './llmClient';

export interface SampleOutputRecord {
  test: string;
  file: string;
  timestamp: string;
  errorSummary: string;
  analysis: FailureAnalysis;
}

const OUTPUT_PATH = path.join(process.cwd(), 'sample-output', 'ai-failure-report.json');

/** Appends one AI analysis record to sample-output/ai-failure-report.json for easy review
 *  without needing to open the full Playwright HTML report. */
export function appendSampleOutput(record: SampleOutputRecord): void {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  let existing: SampleOutputRecord[] = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    } catch {
      existing = [];
    }
  }

  existing.push(record);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 2));
}

export function resetSampleOutput(): void {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, '[]');
}
