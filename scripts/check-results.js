// Fails the CI job if any test other than the two known, intentional [AI-DEMO] demo
// failures did not pass. Reads the JSON reporter output written by `npm test`
// (see playwright.config.ts's `json` reporter -> test-results/results.json).
const fs = require('fs');
const path = require('path');

const RESULTS_PATH = path.join(__dirname, '..', 'test-results', 'results.json');
const ALLOWED_FAILURE_SUBSTRING = '[AI-DEMO]';

function collectSpecs(suite, out) {
  for (const spec of suite.specs ?? []) out.push(spec);
  for (const child of suite.suites ?? []) collectSpecs(child, out);
}

const data = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));
const specs = [];
for (const fileSuite of data.suites ?? []) collectSpecs(fileSuite, specs);

const unexpectedFailures = specs.filter((spec) => !spec.ok && !spec.title.includes(ALLOWED_FAILURE_SUBSTRING));

if (unexpectedFailures.length > 0) {
  console.error(`${unexpectedFailures.length} unexpected test failure(s):`);
  for (const spec of unexpectedFailures) console.error(`  - ${spec.title}`);
  process.exit(1);
}

console.log('Only the known, intentional [AI-DEMO] tests failed (or nothing failed). Build is green.');
