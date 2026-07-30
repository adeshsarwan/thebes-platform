import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app/build-app.js';
import { requestIdSchema } from '../src/validation/index.js';
import { buildTestConfig, expectUtcIsoTimestamp } from './test-helpers.js';

describe('GET /health', () => {
  it('returns the health response contract', async () => {
    const app = buildApp({ config: buildTestConfig(), logger: false });
    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('thebes-platform-test');
    expect(body.version).toBe('0.1.0-test');
    expect(requestIdSchema.safeParse(body.request_id).success).toBe(true);
    expect(response.headers['x-request-id']).toBe(body.request_id);
    expectUtcIsoTimestamp(body.timestamp);

    await app.close();
  });
});
