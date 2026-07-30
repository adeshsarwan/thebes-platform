import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config/env.js';
import { loadConfig } from '../config/env.js';
import { buildApp } from './build-app.js';
import { registerShutdownHandlers } from './shutdown.js';

export interface StartedServer {
  app: FastifyInstance;
  address: string;
  disposeShutdownHandlers: () => void;
}

export const startServer = async (config: AppConfig = loadConfig()): Promise<StartedServer> => {
  const app = buildApp({ config });
  const address = await app.listen({ host: config.HOST, port: config.PORT });
  const disposeShutdownHandlers = registerShutdownHandlers(app);

  app.log.info(
    {
      address,
      service: config.SERVICE_NAME,
      version: config.SERVICE_VERSION,
    },
    'Thebes Platform service listening',
  );

  return { app, address, disposeShutdownHandlers };
};
