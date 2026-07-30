import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app/build-app.js';
import { buildTestConfig } from './test-helpers.js';

describe('application startup', () => {
  it('builds the application without opening a network port', async () => {
    const app = buildApp({ config: buildTestConfig(), logger: false });

    await app.ready();

    expect(app.server.listening).toBe(false);
    await app.close();
  });

  it('can close the application cleanly', async () => {
    const app = buildApp({ config: buildTestConfig(), logger: false });

    await app.ready();
    await app.close();

    expect(app.server.listening).toBe(false);
  });
});
