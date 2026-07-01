# Sample output

`ai-failure-report.json` in this folder is generated automatically by
`reporters/ai-summary-reporter.ts` + `src/ai/failureExplainer.ts` every time you run the suite —
it is reset at the start of each run and populated with one entry per failing test that Claude
successfully analyzed.

**No `ANTHROPIC_API_KEY` was available in the environment this repo was built in**, so this file
currently contains `[]` and each failing test's HTML report attachment says
`ai-failure-analysis-skipped.txt` instead of a real analysis — the code path that skips cleanly
when no key is present is itself intentional (see `src/ai/failureExplainer.ts`), not a stand-in
for the real integration. Nothing in this repository fabricates or mocks an LLM response.

To generate real output:

```bash
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...
npm test
```

Two tests are deliberately seeded with wrong assertions to guarantee at least one real failure to
analyze on every run (search for `[AI-DEMO]` in `tests/ui/login.spec.ts` and
`tests/api/users-api.spec.ts`) — one exercises the page-state context path, the other the
API-response context path. After a run with a real key, this file will contain entries shaped
like:

```json
[
  {
    "test": "Login > [AI-DEMO] invalid credentials shows an unrelated error message",
    "file": "tests/ui/login.spec.ts",
    "timestamp": "2026-07-01T12:00:00.000Z",
    "errorSummary": "Error: expect(locator).toHaveText(expected) failed",
    "analysis": {
      "explanation": "...",
      "likelyRootCause": "...",
      "suggestedFix": "...",
      "confidence": "high"
    }
  }
]
```

You can also open `playwright-report/index.html` after a run and click into either `[AI-DEMO]`
test to see the same analysis rendered as an `ai-failure-analysis.md` attachment inline in the
HTML report — that attachment is Claude's response verbatim, not reformatted.
