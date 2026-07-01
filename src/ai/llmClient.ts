import Anthropic from '@anthropic-ai/sdk';

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

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const MAX_CONTEXT_CHARS = 4000;

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!client) {
    // Reads ANTHROPIC_API_KEY from the environment. Never hardcode the key.
    client = new Anthropic();
  }
  return client;
}

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
      "whichever is most likely). Do not invent details that aren't supported by the evidence.",
  );

  return sections.join('\n\n');
}

/**
 * Real Claude API call (Option A: Failure Explainer) — see src/ai/failureExplainer.ts for why
 * this option was chosen over the flaky-test classifier (Option B).
 */
export async function explainFailure(context: FailureContext): Promise<FailureAnalysis> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            explanation: {
              type: 'string',
              description: 'Plain-English explanation of what broke, written for a QA engineer.',
            },
            likely_root_cause: {
              type: 'string',
              description: 'One or two sentences naming the single most likely root cause.',
            },
            suggested_fix: {
              type: 'string',
              description: 'A concrete, actionable fix — a code change, selector change, or test change.',
            },
            confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['explanation', 'likely_root_cause', 'suggested_fix', 'confidence'],
          additionalProperties: false,
        },
      },
    },
    messages: [{ role: 'user', content: buildPrompt(context) }],
  });

  const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
  if (!textBlock) {
    throw new Error('Claude returned no text content for the failure analysis request.');
  }

  const parsed = JSON.parse(textBlock.text) as {
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
