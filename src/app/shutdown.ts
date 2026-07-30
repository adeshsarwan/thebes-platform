import type { FastifyInstance } from 'fastify';

export type ShutdownSignal = 'SIGINT' | 'SIGTERM';

interface SignalProcess {
  once(event: ShutdownSignal, listener: () => void): unknown;
  off(event: ShutdownSignal, listener: () => void): unknown;
}

export interface ShutdownOptions {
  exit?: (code: number) => void;
  processLike?: SignalProcess;
  signals?: readonly ShutdownSignal[];
}

export const shutdownApplication = async (
  app: FastifyInstance,
  signal: ShutdownSignal | 'manual' = 'manual',
): Promise<void> => {
  app.log.info({ signal }, 'Shutdown started');
  await app.close();
  app.log.info({ signal }, 'Shutdown completed');
};

export const registerShutdownHandlers = (
  app: FastifyInstance,
  options: ShutdownOptions = {},
): (() => void) => {
  const processLike = options.processLike ?? process;
  const exit = options.exit ?? process.exit;
  const signals = options.signals ?? (['SIGTERM', 'SIGINT'] as const);
  let shutdownStarted = false;
  const listeners = new Map<ShutdownSignal, () => void>();

  const beginShutdown = (signal: ShutdownSignal): void => {
    if (shutdownStarted) {
      return;
    }

    shutdownStarted = true;

    void shutdownApplication(app, signal)
      .then(() => exit(0))
      .catch((error: unknown) => {
        app.log.error({ err: error, signal }, 'Shutdown failed');
        exit(1);
      });
  };

  for (const signal of signals) {
    const listener = (): void => beginShutdown(signal);
    listeners.set(signal, listener);
    processLike.once(signal, listener);
  }

  return () => {
    for (const [signal, listener] of listeners) {
      processLike.off(signal, listener);
    }
  };
};
