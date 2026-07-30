import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app/build-app.js';
import { registerShutdownHandlers, shutdownApplication } from '../src/app/shutdown.js';
import { buildTestConfig } from './test-helpers.js';

class SignalEmitter extends EventEmitter {
  off(eventName: 'SIGTERM' | 'SIGINT', listener: () => void): this {
    return super.off(eventName, listener);
  }

  once(eventName: 'SIGTERM' | 'SIGINT', listener: () => void): this {
    return super.once(eventName, listener);
  }
}

describe('graceful shutdown', () => {
  it('closes the application through the shutdown helper', async () => {
    const app = buildApp({ config: buildTestConfig(), logger: false });
    await app.ready();

    await shutdownApplication(app, 'manual');

    expect(app.server.listening).toBe(false);
  });

  it('registers SIGTERM and SIGINT handlers that close the app and exit successfully', async () => {
    const app = buildApp({ config: buildTestConfig(), logger: false });
    const processLike = new SignalEmitter();
    const exitCodes: number[] = [];
    await app.ready();

    const dispose = registerShutdownHandlers(app, {
      processLike,
      exit: (code) => {
        exitCodes.push(code);
      },
    });

    processLike.emit('SIGTERM');
    await new Promise((resolve) => setImmediate(resolve));
    dispose();

    expect(exitCodes).toEqual([0]);
    expect(app.server.listening).toBe(false);
  });
});
