export interface FailureAnalysis {
  explanation: string;
  likelyRootCause: string;
  suggestedFix: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface FailureContext {
  testTitle: string;
  errorMessage: string;
  pageContext?: string;
  apiContext?: string;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const MAX_CONTEXT_CHARS = 4000;
const REACHABILITY_TIMEOUT_MS = 1500;
// A cold call can take 10-15s just to load the model into memory before it generates a single
// token (measured locally). Bound the call so a stuck/overloaded Ollama fails fast with a clear
// error instead of hanging — see playwright.config.ts's test timeout, which is sized to give a
// full CHAT_TIMEOUT_MS call room to complete inside a single failing test's teardown.
const CHAT_TIMEOUT_MS = 60_000;

function truncate(text: string, limit = MAX_CONTEXT_CHARS): string {
  return text.length > limit ? `${text.slice(0, limit)}\n…(truncated)` : text;
}

function buildPrompt(context: FailureContext): string {
  const sections = [
    `A Playwright test named "${context.testTitle}" just failed. You are helping a QA engineer triage it fast.`,
    `## Error output\n${truncate(context.errorMessage)}`,
  ];

  if (context.pageContext) {
    sections.push(`## Page state at the time of failure (URL + visible text, truncated)\n${truncate(context.pageContext)}`);
  }
  if (context.apiContext) {
    sections.push(`## Last API request/response observed during this test (truncated)\n${truncate(context.apiContext)}`);
  }

  sections.push(
    'Based only on the evidence above, explain in plain English what most likely broke, name the single most ' +
      'likely root cause, and suggest one concrete, actionable fix (to the test, the page object, or the product, ' +
      "whichever is most likely). Do not invent details that aren't supported by the evidence. " +
      'Respond with JSON only, matching this exact shape: ' +
      '{"explanation": string, "likely_root_cause": string, "suggested_fix": string, "confidence": "low"|"medium"|"high"}.',
  );

  return sections.join('\n\n');
}

/** Cheap reachability check so the caller can skip cleanly (with an explanatory attachment)
 *  instead of throwing a raw connection-refused error when Ollama isn't running locally. */
export async function isOllamaReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

interface OllamaChatResponse {
  message?: { content?: string };
}

/**
 * Real local LLM call via Ollama (Option A: Failure Explainer) — see
 * src/ai/failureExplainer.ts for why this option was chosen over the flaky-test classifier
 * (Option B). Uses Ollama's structured-output support (the `format` field, a JSON Schema) so
 * the response is guaranteed to parse into FailureAnalysis rather than needing prompt-based
 * JSON coaxing. No cloud API key required — this hits a local Ollama server.
 */
export async function explainFailure(context: FailureContext): Promise<FailureAnalysis> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        // Keep the model resident in memory for the rest of the run so the second (and
        // subsequent) failure analysis doesn't pay the cold-load cost again.
        keep_alive: '10m',
        messages: [{ role: 'user', content: buildPrompt(context) }],
        format: {
          type: 'object',
          properties: {
            explanation: { type: 'string' },
            likely_root_cause: { type: 'string' },
            suggested_fix: { type: 'string' },
            confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['explanation', 'likely_root_cause', 'suggested_fix', 'confidence'],
        },
        options: { temperature: 0.2 },
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Ollama did not respond within ${CHAT_TIMEOUT_MS}ms (model: ${OLLAMA_MODEL}).`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Ollama request to ${OLLAMA_BASE_URL} failed: ${response.status} ${response.statusText} ${body}`);
  }

  const data = (await response.json()) as OllamaChatResponse;
  const content = data.message?.content;
  if (!content) {
    throw new Error('Ollama returned no message content for the failure analysis request.');
  }

  const parsed = JSON.parse(content) as {
    explanation: string;
    likely_root_cause: string;
    suggested_fix: string;
    confidence: 'low' | 'medium' | 'high';
  };

  return {
    explanation: parsed.explanation,
    likelyRootCause: parsed.likely_root_cause,
    suggestedFix: parsed.suggested_fix,
    confidence: parsed.confidence,
  };
}
