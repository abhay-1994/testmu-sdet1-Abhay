# testmu-sdet1-abhay

AI-native regression suite built for the TestMu AI SDET-1 assessment. Playwright + TypeScript,
with Claude Code used to generate the Task 2 test cases, and a local **Ollama** model wired
directly into the running test framework itself for Task 3 — a real-time AI Failure Explainer.

## Important assumption — target application

The assignment describes TestMu AI's own web-based test management platform, but no live instance
or credentials were provided. Rather than write tests that can't run, this repo automates two
public, purpose-built demo applications that map onto the same three modules, and calls that out
explicitly wherever it matters:

| Module | Real target used | Why |
|---|---|---|
| Login + Dashboard | [opensource-demo.orangehrmlive.com](https://opensource-demo.orangehrmlive.com) (OrangeHRM demo) | Public, safe-to-automate, has a real login form, session behavior, and a dashboard made of independently-loading widgets with role-gated navigation. |
| REST API | [dummyjson.com](https://dummyjson.com) | Public, no API key required, has real auth (`/auth/login`, bearer tokens), full CRUD (`/products`), real 4xx error codes, and a stable schema. |

Task 2 (prompt-generated test cases) is written against TestMu AI's *described* module scope
directly (login, dashboard widgets, and a generic test-case-management REST API) since that
doesn't require executing anything — see `task2-test-generation/`. Task 3's *executable* Playwright
suite runs against the two demo apps above, since those tests have to actually run against
something real. This split is intentional and is called out again in the Task 3 section below.

One consequence: brute-force account lockout (mentioned in the ticket) is written up as a Gherkin
scenario in Task 2, but is **not** automated in the executable suite — running that against a
shared public demo would lock out the real `Admin` account for every other candidate using it.

## Stack

- **Playwright Test** (`@playwright/test`) + **TypeScript**
- **Ollama** (local LLM runtime) — real inference calls over its local REST API, no mocking, no cloud key
- **ajv** — JSON Schema validation for API responses

## Structure

```
├── src/
│   ├── pages/            # Page Object Models (LoginPage, DashboardPage)
│   ├── api/               # API client helper + response JSON Schemas
│   └── ai/                 # Ollama client, failure-explainer logic, shared context
├── tests/
│   ├── ui/                 # Login + Dashboard specs (OrangeHRM demo), + AI fixture
│   └── api/                # REST API specs (DummyJSON), + AI fixture
├── reporters/
│   └── ai-summary-reporter.ts   # Console summary of AI analyses at the end of a run
├── task2-test-generation/
│   ├── prompts.md           # Task 2 — raw prompts, exactly as used
│   └── generated/           # Task 2 — generated Gherkin/JSON test cases + per-module notes
├── sample-output/
│   ├── ai-failure-report.json   # Populated automatically by test runs (see its own README)
│   └── README.md
├── ai-usage-log.md
└── playwright.config.ts
```

## Setup

```bash
npm install
npx playwright install chromium

# Task 3 (AI Failure Explainer) needs a local Ollama model — no cloud API key required:
#   1. Install Ollama: https://ollama.com/download
#   2. ollama pull llama3.2
#   3. Ollama's installer starts the server automatically; otherwise run `ollama serve`

cp .env.example .env   # defaults already point at a standard local Ollama install
```

Ollama is only required for Task 3. Everything else runs without it — the login/dashboard/API
tests themselves don't call any LLM; only the failure-analysis fixture does, and only when a test
actually fails. If Ollama isn't running, that fixture skips cleanly with an explanatory attachment
instead of failing the whole suite.

## Running

```bash
npm test              # full suite (UI + API projects)
npm run test:ui        # just the OrangeHRM login/dashboard specs
npm run test:api       # just the DummyJSON REST API specs
npm run test:headed    # UI specs with a visible browser
npm run report         # open the last HTML report
npm run typecheck      # tsc --noEmit
```

The suite is 20 tests: 18 pass against the live demo apps, and **2 are deliberately wrong on
purpose** (tagged `[AI-DEMO]` in `tests/ui/login.spec.ts` and `tests/api/users-api.spec.ts`) so
that every run of `npm test` produces a real, reproducible failure for the local LLM to analyze —
one using page-state context, one using API-response context. They are not bugs in the demo apps; they
exist solely to exercise Task 3 end-to-end without needing a flaky real bug on demand. Retries are
set to `1` in `playwright.config.ts` to absorb the occasional slow response from the shared public
OrangeHRM demo — the two intentional failures still fail identically on retry, since they're
deterministic wrong assertions, not flaky ones.

## Task 1 — Setup and scaffold

See "Structure" above. First commit message documents which AI tool was used to scaffold the repo
(Claude Code) and what it did.

## Task 2 — Prompt engineering for test generation

- `task2-test-generation/prompts.md` — every prompt used, verbatim, including the first (vague)
  attempt per module and the refined prompt that was actually used, with notes on what changed and
  why.
- `task2-test-generation/generated/login.feature` — Gherkin scenarios for Login.
- `task2-test-generation/generated/dashboard.feature` — Gherkin scenarios for Dashboard.
- `task2-test-generation/generated/api-tests.json` — structured JSON test cases for the REST API.

## Task 3 — LLM integration in the test framework

**Chosen: Option A — Failure Explainer**, over Option B (Flaky Test Classifier). Reasoning
(also in code, see `src/ai/llmClient.ts`): a flaky-test classifier needs a *history* of runs to
classify against — it's not meaningfully demonstrable from a single `npm test` invocation the way
this assessment will be run and reviewed. A failure explainer produces real, verifiable output
from one run, with a real error and real page/API context, which is a more honest demonstration of
an actual LLM call doing something a reviewer can independently check.

**LLM provider — Ollama, running locally.** No cloud account, API key, or billing is needed to
review this: install Ollama, pull one model, and the integration works end to end offline. This
was a deliberate choice over a hosted API for this repo — see `ai-usage-log.md` for the full
reasoning trail.

**How it works:**

1. `tests/ui/fixtures.ts` and `tests/api/fixtures.ts` each define an `auto` Playwright fixture
   (`aiFailureAnalysis`) that runs after every test.
2. On failure, it gathers context — page URL/title/visible text for UI tests
   (`src/ai/pageContext.ts`), or the last recorded API request/response for API tests
   (`src/ai/context.ts`, populated by `src/api/apiClient.ts`) — and calls
   `explainFailure()` in `src/ai/llmClient.ts`.
3. `explainFailure()` makes a real HTTP call to a local Ollama server
   (`http://localhost:11434/api/chat`, model `llama3.2` by default — configurable via
   `OLLAMA_BASE_URL` / `OLLAMA_MODEL`) using Ollama's structured-output support (a JSON Schema
   passed as the `format` field) so the response is guaranteed to parse into
   `{ explanation, likelyRootCause, suggestedFix, confidence }`.
4. The result is attached to the test via `testInfo.attach()` — so it shows up as an
   `ai-failure-analysis.md` attachment directly inside the Playwright HTML report, next to the
   trace and screenshot — and appended to `sample-output/ai-failure-report.json`.
5. `reporters/ai-summary-reporter.ts` prints a short console summary at the end of the run.
6. If Ollama isn't reachable (`src/ai/llmClient.ts`'s `isOllamaReachable()` check), the fixture
   attaches a plain-text explanation instead of failing the whole suite — see
   `src/ai/failureExplainer.ts`.

See `sample-output/README.md` for real, captured output from a run against this repo's own
`[AI-DEMO]` failures.

## ai-usage-log.md

See [`ai-usage-log.md`](./ai-usage-log.md) for every AI tool used across all three tasks, what it
was asked to do, and what it produced.

## What I'd build next with more time

- **Flaky Test Classifier (Option B)** as a second, complementary AI integration — run the suite
  N times in CI, feed the aggregated pass/fail history to Claude, and classify failures into real
  bug / environment issue / flaky test. This is the natural pairing with the Failure Explainer:
  the explainer tells you *what* broke on one run, the classifier tells you *whether it's worth
  caring about* across many runs.
- **A small real backend fixture** (even an in-memory Express app implementing the
  `/api/testcases` surface described in Task 2's API prompt) so the JSON test cases in
  `task2-test-generation/generated/api-tests.json` could become an executable suite too, instead
  of staying documentation-only.
- **Self-healing selectors**: when a UI test fails on a selector-not-found error specifically
  (as opposed to an assertion mismatch), ask the local model to suggest an updated selector from
  the live DOM snapshot, and report the suggested diff instead of only an explanation.
- **Keep the model warm across a run**: Ollama unloads a model from memory after a period of
  inactivity by default. For a CI suite producing many failures in quick succession, passing
  `keep_alive` on each request (or a small local warm-up call at `globalSetup`) would avoid
  paying reload latency on the first failure analysis of a run.
- **A pluggable provider layer**: `src/ai/llmClient.ts` currently hard-codes Ollama. Extracting a
  small `LlmProvider` interface would let this same fixture call a hosted API (Claude, etc.)
  behind an env var, for teams that want centralized/hosted analysis instead of a local model per
  developer machine.
- **A second executable pass at the brute-force lockout scenario** from Task 2, against a
  disposable, self-hosted OrangeHRM instance (e.g. the official Docker image) instead of the
  shared public demo, so it can be safely automated rather than left as documentation-only.
