import type { AppConfig } from '../config/env.js';

export interface D1QueryMeta {
  changes?: number;
  changed_db?: boolean;
  duration?: number;
}

export interface D1QueryResult<TRecord extends Record<string, unknown>> {
  results: TRecord[];
  meta?: D1QueryMeta;
}

export interface D1Client {
  query<TRecord extends Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<D1QueryResult<TRecord>>;
}

interface CloudflareD1Response {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  result?: unknown;
}

const getCloudflareError = (payload: CloudflareD1Response, fallback: string): string => {
  const message = payload.errors
    ?.map((error) => error.message)
    .filter(Boolean)
    .join('; ');
  return message || fallback;
};

const normalizeD1Result = <TRecord extends Record<string, unknown>>(
  payload: CloudflareD1Response,
): D1QueryResult<TRecord> => {
  const rawResult = Array.isArray(payload.result) ? payload.result[0] : payload.result;
  const result =
    rawResult && typeof rawResult === 'object'
      ? (rawResult as { success?: boolean; results?: TRecord[]; meta?: D1QueryMeta })
      : undefined;

  if (!payload.success || !result?.success) {
    throw new Error(getCloudflareError(payload, 'Cloudflare D1 query failed'));
  }

  const response: D1QueryResult<TRecord> = { results: result.results ?? [] };
  if (result.meta) response.meta = result.meta;

  return response;
};

export class CloudflareD1Client implements D1Client {
  private readonly endpoint: string;

  constructor(
    private readonly accountId: string,
    private readonly databaseId: string,
    private readonly apiToken: string,
    apiBase = 'https://api.cloudflare.com/client/v4',
  ) {
    this.endpoint = `${apiBase}/accounts/${accountId}/d1/database/${databaseId}/query`;
  }

  async query<TRecord extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<D1QueryResult<TRecord>> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });
    const payload = (await response.json()) as CloudflareD1Response;

    if (!response.ok) {
      throw new Error(
        getCloudflareError(payload, `Cloudflare D1 query failed with ${response.status}`),
      );
    }

    return normalizeD1Result<TRecord>(payload);
  }
}

export const createConfiguredD1Client = (config: AppConfig): D1Client | null => {
  if (
    !config.CLOUDFLARE_ACCOUNT_ID ||
    !config.CLOUDFLARE_API_TOKEN ||
    !config.THEBES_PILOT_D1_DATABASE_ID
  ) {
    return null;
  }

  return new CloudflareD1Client(
    config.CLOUDFLARE_ACCOUNT_ID,
    config.THEBES_PILOT_D1_DATABASE_ID,
    config.CLOUDFLARE_API_TOKEN,
    config.CLOUDFLARE_API_BASE,
  );
};
