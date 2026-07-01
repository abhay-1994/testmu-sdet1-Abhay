export interface ApiExchange {
  method: string;
  url: string;
  requestBody?: unknown;
  status: number;
  responseBody?: unknown;
}

// Module-level singleton: the API test helper (src/api/apiClient.ts) records the most
// recent request/response here so the failure explainer fixture can attach it to the
// prompt without threading it through every test signature.
let lastExchange: ApiExchange | undefined;

export function recordApiExchange(exchange: ApiExchange): void {
  lastExchange = exchange;
}

export function getLastApiExchange(): ApiExchange | undefined {
  return lastExchange;
}

export function clearApiExchange(): void {
  lastExchange = undefined;
}
