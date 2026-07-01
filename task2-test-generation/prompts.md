# Task 2 — Prompts (raw, exactly as written)

All prompts below were sent to Claude (claude-opus-4-8, via Claude Code / the Claude API — same
model backing this repo's Task 3 integration) to generate regression test cases for TestMu AI's
Login, Dashboard, and REST API modules. Each module shows the **first prompt I tried**, why the
output wasn't good enough to ship, and the **refined prompt** whose output is what actually lives
in `task2-test-generation/generated/`. Nothing below has been cleaned up after the fact — including
the awkward phrasing in a couple of the v1 attempts.

Context given to Claude before every prompt in this file (system-level framing, sent once per
session): *"You are helping a QA/SDET team generate regression test cases for TestMu AI, a
web-based test management platform. Output should be practical enough to hand directly to an
automation engineer."*

---

## Module 1 — Login

### Attempt 1 (vague)

> Write test cases for the login page.

**What came back:** eight bullet points in plain prose ("Test that login works with correct
credentials", "Test that login fails with incorrect credentials", "Test forgot password",
"Test empty fields"...). No structure, no concrete data, no session/security scenarios at all,
and nothing I could hand to an automation engineer without a full rewrite — it read like a
table of contents, not test cases.

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

The vague prompt produced a to-do list, not test cases — no Given/When/Then structure, no data
tables, and it completely missed session expiry and lockout (arguably the two most
security-relevant scenarios in the module). The refined prompt fixed this by (1) naming the exact
five areas the ticket asked for so nothing got silently dropped, (2) forcing Gherkin structure and
tagging so the output is automation-ready rather than descriptive, and (3) explicitly asking for
edge cases instead of trusting the model to volunteer them — the case-sensitivity and
SQL-injection-shaped-input scenarios only appeared after I asked for them by name. I also had to
explicitly say "don't run lockout against a shared environment" — my first refined draft (not
shown) generated a lockout scenario with no safety caveat, and I did not want an automation
engineer to accidentally lock out a real demo/shared account by running it as-is.

---

## Module 2 — Dashboard

### Attempt 1 (vague)

> Generate test cases for the dashboard page.

**What came back:** generic CRUD-flavored cases ("dashboard loads successfully", "user can view
dashboard", "dashboard has no errors") with no mention of widgets, no distinction between roles,
and nothing about responsive behavior — it treated "dashboard" as an undifferentiated page rather
than a composition of independently-loading, independently-permissioned widgets, which is the
actual complexity worth testing.

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

The first attempt never engaged with the fact that a dashboard is a composite of independently
failing widgets — it produced page-level smoke tests, not widget-level ones, which is the wrong
granularity for a regression suite (a partial failure on one widget would pass every one of those
tests). The refined prompt named the widget-composition model explicitly and asked for
partial-failure coverage, which is the scenario that actually earns its place in a regression
suite. I also had to push back on "data accuracy" specifically: my first draft of the refined
prompt just said "verify data is accurate," and the model returned a scenario that said
"the dashboard shows correct data" with no way to verify that automatically — I re-prompted with
the API cross-check framing so the resulting scenario is actually testable by an automation
engineer instead of requiring a human to eyeball a chart.

---

## Module 3 — REST API

### Attempt 1 (vague)

> Write API test cases for the test management platform's REST API.

**What came back:** a short list like "test GET endpoint", "test POST endpoint", "test invalid
input returns error" — no concrete endpoints, no actual status codes, no auth model, and nothing
about rate limiting or schema at all. Useless without knowing which resource, which fields, or
which error codes the API actually returns.

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

The vague version didn't know the API surface, so it hedged with generic placeholders instead of
committing to real endpoints, methods, or status codes — exactly the "vague prompt that gets
lucky" the brief warns against, except it didn't even get lucky. The refined prompt fixed this by
giving Claude the concrete resource model up front (a thing a real ticket or OpenAPI spec would
provide) and by asking for a structured JSON schema instead of prose, which forced status-code-
level specificity per case. The first pass at the refined prompt still returned every 4xx case as
generic "returns 400" — I had to explicitly enumerate 401 vs. 403 vs. 404 vs. 422 by name before
the model differentiated "not authenticated" from "not authorized" from "not found" from
"validation failed," which are meaningfully different behaviors an automation engineer needs to
assert on separately.
