import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config/env.js';
import { getRequestId } from '../plugins/request-context.js';

export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
  request_id: string;
}

export const registerHealthRoute = (app: FastifyInstance, config: AppConfig): void => {
  app.get('/health', async (request): Promise<HealthResponse> => ({
    status: 'ok',
    service: config.SERVICE_NAME,
    version: config.SERVICE_VERSION,
    timestamp: new Date().toISOString(),
    request_id: getRequestId(request),
  }));
};
