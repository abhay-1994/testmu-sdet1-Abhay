import type { APIRequestContext, APIResponse } from '@playwright/test';
import { recordApiExchange } from '../ai/context';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface ApiCallResult {
  response: APIResponse;
  status: number;
  body: unknown;
}

/** Thin wrapper around Playwright's APIRequestContext that records every exchange so the
 *  AI failure explainer can see the last request/response when a test fails. */
export async function apiCall(
  request: APIRequestContext,
  method: HttpMethod,
  url: string,
  options?: Parameters<APIRequestContext['get']>[1],
): Promise<ApiCallResult> {
  const response = await request[method](url, options);
  const status = response.status();

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = await response.text().catch(() => undefined);
  }

  recordApiExchange({
    method: method.toUpperCase(),
    url,
    requestBody: (options as { data?: unknown } | undefined)?.data,
    status,
    responseBody: body,
  });

  return { response, status, body };
}
