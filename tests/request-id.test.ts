import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app/build-app.js';
import { REQUEST_ID_HEADER } from '../src/plugins/request-context.js';
import { generateRequestId } from '../src/utilities/index.js';
import { requestIdSchema } from '../src/validation/index.js';
import { buildTestConfig } from './test-helpers.js';

const getResponseHeader = (value: number | string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value === undefined ? '' : String(value);
};

describe('request ID handling', () => {
  it('preserves an incoming valid x-request-id', async () => {
    const app = buildApp({ config: buildTestConfig(), logger: false });
    const requestId = generateRequestId();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        [REQUEST_ID_HEADER]: requestId,
      },
    });
    const body = response.json();

    expect(body.request_id).toBe(requestId);
    expect(response.headers[REQUEST_ID_HEADER]).toBe(requestId);

    await app.close();
  });

  it('generates a UUID v7 request ID when the header is missing', async () => {
    const app = buildApp({ config: buildTestConfig(), logger: false });
    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json();
    const responseHeader = getResponseHeader(response.headers[REQUEST_ID_HEADER]);

    expect(requestIdSchema.safeParse(body.request_id).success).toBe(true);
    expect(responseHeader).toBe(body.request_id);

    await app.close();
  });

  it('replaces a malformed x-request-id instead of rejecting the request', async () => {
    const app = buildApp({ config: buildTestConfig(), logger: false });
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        [REQUEST_ID_HEADER]: 'not-a-valid-request-id',
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.request_id).not.toBe('not-a-valid-request-id');
    expect(requestIdSchema.safeParse(body.request_id).success).toBe(true);
    expect(response.headers[REQUEST_ID_HEADER]).toBe(body.request_id);

    await app.close();
  });

  it('includes request_id in request-scoped logs', async () => {
    const logLines: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logLines.push(chunk.toString());
        callback();
      },
    });
    const app = buildApp({
      config: buildTestConfig({ LOG_LEVEL: 'info' }),
      logger: { level: 'info', stream },
    });

    await app.inject({ method: 'GET', url: '/health' });
    await app.close();

    expect(logLines.some((line) => line.includes('"request_id"'))).toBe(true);
  });
});
