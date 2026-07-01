// Runs one of the Task 2 prompts (see task2-test-generation/prompts.md) against the local
// Ollama model and prints the raw response to the terminal. This is a convenience runner for
// manual verification — it does not change anything in task2-test-generation/generated/.
//
// Usage:
//   node scripts/run-prompt.js <module> <version>
//   node scripts/run-prompt.js api v2
//
//   <module>  login | dashboard | api
//   <version> v1 (vague) | v2 (refined)
require('dotenv').config();

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

const SYSTEM =
  'You are helping a QA/SDET team generate regression test cases for TestMu AI, a web-based ' +
  'test management platform. Output should be practical enough to hand directly to an ' +
  'automation engineer.';

// Prompt text below is copied verbatim from task2-test-generation/prompts.md — keep both in
// sync if you edit one.
const PROMPTS = {
  login: {
    v1: 'Write test cases for the login page.',
    v2: `Generate Gherkin (Given/When/Then) test cases for the Login module of a web-based test management platform (similar to an HR/enterprise SaaS login screen). Cover these five areas specifically: (1) valid login, (2) invalid credentials, (3) forgot password flow, (4) session expiry, (5) brute-force lockout after repeated failed attempts.

Requirements:
- Use a Background: for shared setup (user is on the login page).
- Each scenario needs a clear title, and use Scenario Outline + Examples table wherever there's more than one input variation worth checking (e.g. different kinds of invalid credentials).
- Tag each scenario with @login plus one of @smoke, @negative, or @security as appropriate.
- For brute-force lockout, be explicit about the assumed threshold (e.g. "locked after 5 consecutive failed attempts within 15 minutes") since I need that to be testable, and call out that this scenario should NOT be run against a shared/production-like environment.
- Don't just restate the happy path five times with different words — include real edge cases (case sensitivity of username, leading/trailing whitespace, SQL-injection-shaped input as a negative security check, and password field masking).
- Output valid Gherkin only, in a single .feature file, no extra commentary.`,
  },
  dashboard: {
    v1: 'Generate test cases for the dashboard page.',
    v2: `Generate Gherkin test cases for the Dashboard module of a web-based test management platform. The dashboard is made up of multiple independent widgets (e.g. "recent test runs", "pass/fail summary", "team activity feed", "environment health") that load asynchronously and can fail or load slowly independently of each other.

Cover these five areas: (1) widget loading (including partial-failure — one widget errors while others load fine), (2) data accuracy (numbers/charts on the dashboard match the underlying source of truth), (3) filter and sort behavior (e.g. filtering by date range or project, sorting a table widget by column), (4) responsive layout (desktop multi-column grid vs. a single-column mobile layout, and that a widget isn't clipped/unusable at common breakpoints like 375px and 768px), (5) permission-based visibility (an admin sees widgets/actions a regular/read-only user does not).

Requirements:
- Background: for "user is logged in and on the dashboard" where that applies; permission scenarios need their own Background per role since the precondition differs.
- Use Scenario Outline + Examples for the responsive breakpoints and for the role-based-visibility checks (don't write one scenario per role by hand).
- Tag scenarios @dashboard plus @smoke, @negative, or @permissions.
- For data accuracy, be concrete about what "accurate" means — assume there's a way to query the same numbers via the REST API described later in this ticket, and write the scenario as "dashboard widget X matches the value returned by API endpoint Y", not just "data is correct".
- Output valid Gherkin only, in a single .feature file, no extra commentary.`,
  },
  api: {
    v1: "Write API test cases for the test management platform's REST API.",
    v2: `Generate test cases in JSON format (not Gherkin this time — I want this consumable directly by a test-data-driven runner) for a REST API that manages test cases and test runs, with these resources: POST /auth/login (returns a bearer token), GET/POST/PUT/DELETE /api/testcases and /api/testcases/{id}, and GET /api/testruns.

Cover these five areas: (1) auth token validation (valid login, invalid credentials, missing/expired/malformed token on a protected endpoint), (2) full CRUD on /api/testcases (create, read, update, delete, including verifying a delete actually removes the resource on a subsequent GET), (3) error handling for both 4xx (bad request body, not-found resource, unauthorized) and 5xx-shaped scenarios, (4) rate limiting (requests beyond a stated threshold, e.g. 100 requests/minute, return 429 with a Retry-After header), (5) response schema validation for the testcase resource (required fields: id, title, status, priority, createdAt; correct types for each).

Requirements:
- Output a JSON array. Each object needs: id, module (always "API"), area (one of the five above), title, method, endpoint, preconditions, steps (array of strings), expectedResult, and priority (high/medium/low).
- Include both positive and negative cases per area — don't make every case a happy path.
- Be specific about expected status codes (401 vs 403 vs 404 vs 422) rather than a generic "returns an error".
- Output valid JSON only, no markdown fences, no commentary before or after.`,
  },
};

function usageAndExit() {
  console.error('Usage: node scripts/run-prompt.js <login|dashboard|api> <v1|v2>');
  console.error('  v1 = vague attempt, v2 = refined attempt (see task2-test-generation/prompts.md)');
  process.exit(1);
}

async function main() {
  const [, , moduleArg, versionArg] = process.argv;
  const module = PROMPTS[moduleArg];
  if (!module || !versionArg || !module[versionArg]) usageAndExit();

  const prompt = module[versionArg];
  console.log(`Model: ${OLLAMA_MODEL}  (${OLLAMA_BASE_URL})`);
  console.log(`Prompt: ${moduleArg} ${versionArg}\n`);
  console.log('Waiting for response (a cold model load can take 10-15s)...\n');

  const start = Date.now();
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      keep_alive: '5m',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    console.error(`Ollama request failed: ${response.status} ${response.statusText}`);
    console.error(await response.text().catch(() => ''));
    process.exit(1);
  }

  const data = await response.json();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log('='.repeat(80));
  console.log(data.message?.content ?? '(no content returned)');
  console.log('='.repeat(80));
  console.log(`\n(${elapsed}s)`);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
