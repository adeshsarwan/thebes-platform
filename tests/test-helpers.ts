import { expect } from 'vitest';
import type { AppConfig, AppEnvironment } from '../src/config/env.js';
import { loadConfig } from '../src/config/env.js';

export const buildTestConfig = (overrides: Partial<AppEnvironment> = {}): AppConfig =>
  loadConfig({
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: 3996,
    LOG_LEVEL: 'silent',
    SERVICE_NAME: 'thebes-platform-test',
    SERVICE_VERSION: '0.1.0-test',
    ...overrides,
  });

export const expectUtcIsoTimestamp = (value: unknown): void => {
  if (typeof value !== 'string') {
    throw new TypeError('Expected timestamp to be a string');
  }

  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  expect(Number.isNaN(Date.parse(value))).toBe(false);
};
