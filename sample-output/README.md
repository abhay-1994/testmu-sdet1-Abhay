# Sample output

`ai-failure-report.json` in this folder is generated automatically by
`reporters/ai-summary-reporter.ts` + `src/ai/failureExplainer.ts` every time you run the suite —
it is reset at the start of each run and populated with one entry per failing test that the local
Ollama model successfully analyzed.

To generate it yourself:

```bash
ollama pull llama3.2   # if you haven't already
npm test
```

Two tests are deliberately seeded with wrong assertions to guarantee at least one real failure to
analyze on every run (search for `[AI-DEMO]` in `tests/ui/login.spec.ts` and
`tests/api/users-api.spec.ts`) — one exercises the page-state context path, the other the
API-response context path. Since `playwright.config.ts` retries failed tests once, and these two
are deterministically wrong (they fail identically every attempt), you'll typically see **two**
entries per demo test per run — one per attempt, each a genuinely separate call to the model, not
a duplicate. A real, non-deterministic failure elsewhere in the suite would only produce one entry
if it happened to pass on retry.

Here is real output captured from an actual run against this repo (`llama3.2` via Ollama, one
entry per demo test shown; timestamps trimmed):

```json
[
  {
    "test": "Login > [AI-DEMO] invalid credentials shows an unrelated error message",
    "file": "tests/ui/login.spec.ts",
    "errorSummary": "Error: expect(locator).toHaveText(expected) failed",
    "analysis": {
      "explanation": "The test failed because it was expecting a specific error message ('Account locked, contact your administrator') to be displayed on the page, but instead received an unrelated error message ('Invalid credentials'). This suggests that the test is not correctly identifying the expected error message.",
      "likelyRootCause": "Incorrect locator or selector",
      "suggestedFix": "Verify that the locator for the alert message is correct and update it if necessary to match the actual HTML structure of the page.",
      "confidence": "high"
    }
  },
  {
    "test": "[AI-DEMO] product schema check with a deliberately wrong expectation",
    "file": "tests/api/users-api.spec.ts",
    "errorSummary": "Error: expect(received).toBe(expected) // Object.is equality",
    "analysis": {
      "explanation": "The test failed because it expected the category of a product to be 'electronics', but the actual response from the API showed 'beauty'.",
      "likelyRootCause": "Inconsistent or incorrect data in the product schema",
      "suggestedFix": "Verify that the product schema is correctly defined and updated with the correct categories for all products, especially those under the 'beauty' category.",
      "confidence": "high"
    }
  }
]
```

Note the model's suggested fix for the login case reads as if the *locator* is wrong — it isn't;
the test's expected string is wrong (see the comment right above that test in
`tests/ui/login.spec.ts`). This is worth calling out honestly: `llama3.2` is a small, fast local
model, and it inferred a plausible-but-not-quite-right root cause from the evidence rather than
the exact one a human (or a larger model) would land on. The API-side analysis, by contrast, is
exactly right. This is a realistic, unfiltered result, not a cherry-picked one — see
`ai-usage-log.md` for the reasoning on choosing a local, free model over a hosted one for Task 3.

You can also open `playwright-report/index.html` after a run and click into either `[AI-DEMO]`
test to see the same analysis rendered as an `ai-failure-analysis.md` attachment inline in the
HTML report — that attachment is the model's response verbatim, not reformatted.

If Ollama isn't installed or isn't running, this file stays `[]` and each failing test's HTML
report attachment says `ai-failure-analysis-skipped.txt` instead — that's the intentional,
tested fail-closed path in `src/ai/failureExplainer.ts`, not a stand-in for the real integration.
