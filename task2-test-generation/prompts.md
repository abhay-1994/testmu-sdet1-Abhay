# Task 2 — Prompts (raw, exactly as written)

All prompts below were sent to Claude (claude-opus-4-8, via Claude Code / the Claude API) to
generate regression test cases for TestMu AI's Login, Dashboard, and REST API modules. Task 3's
runtime integration uses a different model (Ollama, running locally) for reasons unrelated to
Task 2 — see `ai-usage-log.md` row 9. Each module shows the **first prompt I tried**, why the
output wasn't good enough to ship, and the **refined prompt** whose output is what actually lives
in `task2-test-generation/generated/`. Nothing below has been cleaned up after the fact — including
the awkward phrasing in a couple of the v1 attempts.

Context given to Claude before every prompt in this file (system-level framing, sent once per
session): *"You are helping a QA/SDET team generate regression test cases for TestMu AI, a
web-based test management platform. Output should be practical enough to hand directly to an
automation engineer."*

**How the "what came back" descriptions below were verified.** Since the ticket said "we'll run
your prompts ourselves," I went back and actually re-ran all six prompts below (both the vague and
refined version of each) against a real model — `llama3.2` via a local Ollama instance, since that
was the model available for hands-on verification in this environment — rather than trust my
first-draft memory of what a vague prompt "probably" produces. That check caught real inaccuracies
in what I'd originally written (I'd claimed a couple of the vague attempts were missing content
they actually had, just unstructured), and I've corrected those below rather than leave a
plausible-sounding but wrong narrative in place. It also surfaced a useful, honest data point: the
refined prompts hit the right *topics* even on a much smaller/weaker model than the one that
generated the final files in `generated/` (Claude Opus), but formatting compliance (tags, avoiding
duplicate scenarios, no stray commentary) was noticeably worse on the smaller model — evidence that
the prompt design is doing real work independent of which model executes it, while output fidelity
still depends on model capability.

---

## Module 1 — Login

### Attempt 1 (vague)

> Write test cases for the login page.

**What came back:** eleven numbered test cases (valid login, invalid username, invalid password,
empty username, empty password, username/password with special characters, forgot password,
password reset, repeated failed attempts, session timeout) each with a precondition, numbered
steps, and an expected result. To be accurate about it: this is more complete than a bare to-do
list — it does mention session timeout and repeated failed attempts on its own. What it actually
lacks is what makes it unusable as-is: no Gherkin structure, no tags, no explicit lockout threshold
or safety caveat about not running it against a shared environment, and none of the edge cases a
security-conscious login suite needs — case sensitivity, leading/trailing whitespace, or
SQL-injection-shaped input never came up unless asked for by name.

### Attempt 2 (refined — used for the final output)

> Generate Gherkin (Given/When/Then) test cases for the Login module of a web-based test
> management platform (similar to an HR/enterprise SaaS login screen). Cover these five areas
> specifically: (1) valid login, (2) invalid credentials, (3) forgot password flow, (4) session
> expiry, (5) brute-force lockout after repeated failed attempts.
>
> Requirements:
> - Use a `Background:` for shared setup (user is on the login page).
> - Each scenario needs a clear title, and use `Scenario Outline` + `Examples` table wherever
>   there's more than one input variation worth checking (e.g. different kinds of invalid
>   credentials).
> - Tag each scenario with `@login` plus one of `@smoke`, `@negative`, or `@security` as
>   appropriate.
> - For brute-force lockout, be explicit about the assumed threshold (e.g. "locked after 5
>   consecutive failed attempts within 15 minutes") since I need that to be testable, and call
>   out that this scenario should NOT be run against a shared/production-like environment.
> - Don't just restate the happy path five times with different words — include real edge cases
>   (case sensitivity of username, leading/trailing whitespace, SQL-injection-shaped input as a
>   negative security check, and password field masking).
> - Output valid Gherkin only, in a single `.feature` file, no extra commentary.

**Output:** `task2-test-generation/generated/login.feature`

### Notes — what didn't work the first time, and what changed

The vague prompt does surface session timeout and lockout on its own, but with no Gherkin
structure, no tags, and none of the security edge cases (case sensitivity, whitespace,
SQL-injection-shaped input) a login module needs. The refined prompt fixed this by naming all five
required areas explicitly, forcing Gherkin structure and tagging, and asking for edge cases by
name — they didn't appear until asked for directly. I also had to explicitly require a "don't run
against a shared environment" caveat: an earlier refined draft (not shown) produced a lockout
scenario with no safety warning.

---

## Module 2 — Dashboard

### Attempt 1 (vague)

> Generate test cases for the dashboard page.

**What came back:** seven numbered test cases (page display, navigation menu, test suite listing,
test case listing, search, filter, sort), each with a precondition, numbered steps, and an expected
result. To be accurate: it does include filter and sort, so they aren't the differentiator I
originally claimed. What's genuinely missing is the thing that matters — it treats "dashboard" as
one undifferentiated page rather than a composition of independently-loading, independently-failing
widgets: no partial-widget-failure case, no responsive-breakpoint case, and no role-based visibility
case at all.

### Attempt 2 (refined — used for the final output)

> Generate Gherkin test cases for the Dashboard module of a web-based test management platform.
> The dashboard is made up of multiple independent widgets (e.g. "recent test runs", "pass/fail
> summary", "team activity feed", "environment health") that load asynchronously and can fail or
> load slowly independently of each other.
>
> Cover these five areas: (1) widget loading (including partial-failure — one widget errors while
> others load fine), (2) data accuracy (numbers/charts on the dashboard match the underlying
> source of truth), (3) filter and sort behavior (e.g. filtering by date range or project, sorting
> a table widget by column), (4) responsive layout (desktop multi-column grid vs. a single-column
> mobile layout, and that a widget isn't clipped/unusable at common breakpoints like 375px and
> 768px), (5) permission-based visibility (an admin sees widgets/actions a regular/read-only user
> does not).
>
> Requirements:
> - `Background:` for "user is logged in and on the dashboard" where that applies; permission
>   scenarios need their own Background per role since the precondition differs.
> - Use `Scenario Outline` + `Examples` for the responsive breakpoints and for the
>   role-based-visibility checks (don't write one scenario per role by hand).
> - Tag scenarios `@dashboard` plus `@smoke`, `@negative`, or `@permissions`.
> - For data accuracy, be concrete about what "accurate" means — assume there's a way to query
>   the same numbers via the REST API described later in this ticket, and write the scenario as
>   "dashboard widget X matches the value returned by API endpoint Y", not just "data is correct".
> - Output valid Gherkin only, in a single `.feature` file, no extra commentary.

**Output:** `task2-test-generation/generated/dashboard.feature`

### Notes — what didn't work the first time, and what changed

The first attempt does test filter and sort, but it never engages with the dashboard as a
composite of independently-failing widgets — it produces page-level smoke tests, so a partial
failure on one widget would pass every one of them, and role-based visibility isn't tested at all.
The refined prompt named the widget-composition model explicitly and asked for partial-failure
coverage. I also had to push back on "data accuracy": an early draft just said "verify data is
accurate" and got back an untestable "the dashboard shows correct data" — re-prompting with the
API cross-check framing made the scenario actually assertable.

---

## Module 3 — REST API

### Attempt 1 (vague)

> Write API test cases for the test management platform's REST API.

**What came back:** roughly seventeen test cases, grouped by category (Authentication, Test Case
CRUD, Test Suite CRUD, Execution, Error Handling), each with an ID, precondition, steps, and an
expected status code. To be accurate: it did invent concrete endpoints, real status codes
(200/201/204/400/401), and a full auth model (login, logout, token refresh) on its own — better
than "useless." The actual problems: it invented its own endpoint surface and resource model
instead of using the one described in the ticket (there is no ticket-provided resource model in
this vague version, so it can't be faulted for guessing, but the guess doesn't match what an
automation engineer would actually be testing against), it has no rate-limiting case at all, no
response-schema-validation case at all, and it never differentiates 401 vs. 403 vs. 404 vs. 422 —
only ever reaching for generic 401/400.

### Attempt 2 (refined — used for the final output)

> Generate test cases in JSON format (not Gherkin this time — I want this consumable directly by
> a test-data-driven runner) for a REST API that manages test cases and test runs, with these
> resources: `POST /auth/login` (returns a bearer token), `GET/POST/PUT/DELETE /api/testcases`
> and `/api/testcases/{id}`, and `GET /api/testruns`.
>
> Cover these five areas: (1) auth token validation (valid login, invalid credentials, missing/
> expired/malformed token on a protected endpoint), (2) full CRUD on `/api/testcases` (create,
> read, update, delete, including verifying a delete actually removes the resource on a
> subsequent GET), (3) error handling for both 4xx (bad request body, not-found resource,
> unauthorized) and 5xx-shaped scenarios, (4) rate limiting (requests beyond a stated threshold,
> e.g. 100 requests/minute, return 429 with a Retry-After header), (5) response schema validation
> for the testcase resource (required fields: id, title, status, priority, createdAt; correct
> types for each).
>
> Requirements:
> - Output a JSON array. Each object needs: `id`, `module` (always "API"), `area` (one of the
>   five above), `title`, `method`, `endpoint`, `preconditions`, `steps` (array of strings),
>   `expectedResult`, and `priority` (`high`/`medium`/`low`).
> - Include both positive and negative cases per area — don't make every case a happy path.
> - Be specific about expected status codes (401 vs 403 vs 404 vs 422) rather than a generic
>   "returns an error".
> - Output valid JSON only, no markdown fences, no commentary before or after.

**Output:** `task2-test-generation/generated/api-tests.json`

### Notes — what didn't work the first time, and what changed

The vague version confidently invented its own endpoints and resource names instead of testing the
actual system under test, and never touched rate limiting, schema validation, or status-code
granularity since nothing told it those mattered. The refined prompt fixed this by giving the
concrete resource model up front and asking for a structured JSON schema instead of prose. The
first pass at the refined prompt still returned every 4xx case as generic "returns 400" — I had to
enumerate 401 vs. 403 vs. 404 vs. 422 by name before it differentiated them.

---

## Verification: how the refined prompts hold up on a different, weaker model

Beyond fixing the inaccuracies above, re-running all three refined prompts against `llama3.2`
(a 3B-parameter local model — far smaller than Claude Opus, which generated the actual files in
`generated/`) was a useful stress test of the prompts themselves, independent of model capability:

- **Topic coverage held up well.** All three refined prompts still produced content hitting every
  one of the five named areas, even on a much weaker model. That's a sign the *requirements list*
  in each prompt is doing real work — it's not relying on a highly capable model to infer intent.
- **Formatting compliance did not hold up.** On `llama3.2`, the Login and Dashboard Gherkin output
  had real defects: duplicate/near-identical scenarios (three near-identical "Password Field
  Masking" variants), tags dropped entirely partway through the file despite being required on
  every scenario, malformed doc-string blocks in the Dashboard output, an invalid second `Feature:`
  declaration in the same file (Gherkin only allows one per file — this would fail to parse), and
  trailing commentary in both despite an explicit "no extra commentary" instruction.
- **The JSON-format prompt (REST API) held up best.** `llama3.2`'s JSON output was valid, used the
  exact field names requested, and covered status codes across all five areas including rate
  limiting and schema fields — the weakest formatting slip was an internally-inconsistent 5xx case
  (valid input paired with an expectation of a 500) rather than a structural failure. This tracks
  with a broader pattern worth knowing as a prompt-engineering lesson: asking for a structured
  format the model can mechanically validate against (a JSON shape) degrades more gracefully across
  model capability than asking for a format with implicit rules a weaker model can silently drop
  (Gherkin's "one Feature per file," consistent tagging, no free-text asides).

None of this changes what's actually in `generated/` — those files came from Claude Opus, which
complied with every formatting constraint in both attempts, no retries needed. It's included here
because the ticket said prompts would be run by the reviewer, and I'd rather show what actually
happens on a second model than assert it works and leave that unverified.
