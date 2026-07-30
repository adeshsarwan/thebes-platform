import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';

describe('environment configuration', () => {
  it('parses valid environment configuration', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: '4000',
      LOG_LEVEL: 'warn',
      SERVICE_NAME: 'thebes-platform',
      SERVICE_VERSION: '1.2.3',
    });

    expect(config).toEqual({
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: 4000,
      LOG_LEVEL: 'warn',
      SERVICE_NAME: 'thebes-platform',
      SERVICE_VERSION: '1.2.3',
    });
  });

  it('applies local development defaults', () => {
    const config = loadConfig({});

    expect(config.NODE_ENV).toBe('development');
    expect(config.HOST).toBe('0.0.0.0');
    expect(config.PORT).toBe(3996);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.SERVICE_NAME).toBe('thebes-platform');
    expect(config.SERVICE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('fails fast for invalid environment configuration', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'staging',
        LOG_LEVEL: 'verbose',
      } as Record<string, unknown>),
    ).toThrow(/Invalid environment configuration/);
  });

  it('rejects invalid TCP ports', () => {
    expect(() => loadConfig({ PORT: '0' })).toThrow(/PORT/);
    expect(() => loadConfig({ PORT: '70000' })).toThrow(/PORT/);
    expect(() => loadConfig({ PORT: 'not-a-number' })).toThrow(/PORT/);
  });
});
