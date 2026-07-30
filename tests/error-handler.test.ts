import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app/build-app.js';
import { REQUEST_ID_HEADER } from '../src/plugins/request-context.js';
import { requestIdSchema } from '../src/validation/index.js';
import { buildTestConfig, expectUtcIsoTimestamp } from './test-helpers.js';

describe('global error handling', () => {
  it('returns a stable error response with request_id', async () => {
    const app = buildApp({ config: buildTestConfig(), logger: false });
    app.get('/boom', async () => {
      throw new Error('boom');
    });

    const response = await app.inject({ method: 'GET', url: '/boom' });
    const body = response.json();

    expect(response.statusCode).toBe(500);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.message).toBe('boom');
    expect(requestIdSchema.safeParse(body.request_id).success).toBe(true);
    expect(response.headers[REQUEST_ID_HEADER]).toBe(body.request_id);
    expectUtcIsoTimestamp(body.timestamp);

    await app.close();
  });

  it('does not expose stack traces in production error responses', async () => {
    const app = buildApp({
      config: buildTestConfig({ NODE_ENV: 'production' }),
      logger: false,
    });
    app.get('/boom', async () => {
      throw new Error('sensitive implementation detail');
    });

    const response = await app.inject({ method: 'GET', url: '/boom' });
    const body = response.json();
    const rawBody = response.body;

    expect(response.statusCode).toBe(500);
    expect(body.error.message).toBe('Internal Server Error');
    expect(rawBody).not.toContain('sensitive implementation detail');
    expect(rawBody).not.toContain('stack');

    await app.close();
  });

  it('handles not-found responses consistently', async () => {
    const app = buildApp({ config: buildTestConfig(), logger: false });
    const response = await app.inject({ method: 'GET', url: '/missing' });
    const body = response.json();

    expect(response.statusCode).toBe(404);
    expect(body.error).toEqual({ code: 'NOT_FOUND', message: 'Route not found' });
    expect(response.headers[REQUEST_ID_HEADER]).toBe(body.request_id);

    await app.close();
  });
});
