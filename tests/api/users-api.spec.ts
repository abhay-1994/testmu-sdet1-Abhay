import Ajv from 'ajv';
import { test, expect } from './fixtures';
import { apiCall } from '../../src/api/apiClient';
import { productSchema, loginResponseSchema } from '../../src/api/schemas';

const ajv = new Ajv();

// DummyJSON's published demo credentials — https://dummyjson.com/docs/auth
const VALID_USERNAME = 'emilys';
const VALID_PASSWORD = 'emilyspass';

test.describe('REST API — auth', () => {
  test('valid credentials return an access token matching the expected schema', async ({ request }) => {
    const { status, body } = await apiCall(request, 'post', '/auth/login', {
      data: { username: VALID_USERNAME, password: VALID_PASSWORD },
    });

    expect(status).toBe(200);
    const validate = ajv.compile(loginResponseSchema);
    expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
  });

  test('invalid credentials are rejected with a 400 and a clear message', async ({ request }) => {
    const { status, body } = await apiCall(request, 'post', '/auth/login', {
      data: { username: VALID_USERNAME, password: 'not-the-real-password' },
    });

    expect(status).toBe(400);
    expect((body as { message: string }).message).toBe('Invalid credentials');
  });

  test('an unauthenticated request to a protected endpoint returns 401', async ({ request }) => {
    const { status } = await apiCall(request, 'get', '/auth/me');
    expect(status).toBe(401);
  });

  test('a valid bearer token grants access to the protected profile endpoint', async ({ request }) => {
    const login = await apiCall(request, 'post', '/auth/login', {
      data: { username: VALID_USERNAME, password: VALID_PASSWORD },
    });
    const token = (login.body as { accessToken: string }).accessToken;

    const { status, body } = await apiCall(request, 'get', '/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(status).toBe(200);
    expect((body as { username: string }).username).toBe(VALID_USERNAME);
  });
});

test.describe('REST API — CRUD', () => {
  test('GET returns a product matching the expected schema', async ({ request }) => {
    const { status, body } = await apiCall(request, 'get', '/products/1');

    expect(status).toBe(200);
    const validate = ajv.compile(productSchema);
    expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
  });

  test('POST creates a product and returns the new id', async ({ request }) => {
    const { status, body } = await apiCall(request, 'post', '/products/add', {
      data: { title: 'AI-generated regression widget', category: 'test-automation' },
    });

    expect(status).toBe(201);
    expect((body as { id: number }).id).toBeGreaterThan(0);
    expect((body as { title: string }).title).toBe('AI-generated regression widget');
  });

  test('PUT updates a product and returns the change', async ({ request }) => {
    const { status, body } = await apiCall(request, 'put', '/products/1', {
      data: { title: 'Updated by Playwright' },
    });

    expect(status).toBe(200);
    expect((body as { title: string }).title).toBe('Updated by Playwright');
  });

  test('DELETE removes a product and flags it as deleted', async ({ request }) => {
    const { status, body } = await apiCall(request, 'delete', '/products/1');

    expect(status).toBe(200);
    expect((body as { isDeleted: boolean }).isDeleted).toBe(true);
  });
});

test.describe('REST API — error handling', () => {
  test('GET on a non-existent product returns 404 with a descriptive message', async ({ request }) => {
    const { status, body } = await apiCall(request, 'get', '/products/999999');

    expect(status).toBe(404);
    expect((body as { message: string }).message).toContain('not found');
  });

  test('POST with a malformed body is still handled without a 5xx', async ({ request }) => {
    const { status } = await apiCall(request, 'post', '/products/add', {
      data: {},
    });

    // DummyJSON accepts an empty payload rather than rejecting it — documented in
    // task2-test-generation/generated/api-notes.md as a real limitation of this mock API.
    // The assertion below still guards against the service ever regressing into a 5xx.
    expect(status).toBeLessThan(500);
  });
});

test.describe('REST API — rate limiting (documented limitation)', () => {
  test('rapid repeated requests do not crash the service', async ({ request }) => {
    // DummyJSON does not enforce a 429 rate limit on this endpoint (verified manually —
    // see task2-test-generation/generated/api-notes.md). Against a real rate-limited
    // service this test would assert a 429 after N requests within the window; here it
    // documents the limitation by asserting the burst stays healthy instead of crashing.
    const results = await Promise.all(
      Array.from({ length: 10 }, () => apiCall(request, 'get', '/products/1')),
    );

    for (const { status } of results) {
      expect(status).toBe(200);
    }
  });
});

// Intentionally-wrong assertion — kept in the suite on purpose to produce a real,
// reproducible failure for Task 3 (AI Failure Explainer), using API response context
// instead of page state. See tests/ui/login.spec.ts for the UI-side equivalent.
test('[AI-DEMO] product schema check with a deliberately wrong expectation', async ({ request }) => {
  const { body } = await apiCall(request, 'get', '/products/1');
  expect((body as { category: string }).category).toBe('electronics');
});
