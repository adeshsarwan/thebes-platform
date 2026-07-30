import type { FastifyInstance } from 'fastify';
import { getRequestId } from '../plugins/request-context.js';

export interface ReadinessChecks {
  configuration: 'ok';
  application: 'ok';
}

export interface ReadinessResponse {
  status: 'ready';
  checks: ReadinessChecks;
  timestamp: string;
  request_id: string;
}

const getReadinessChecks = (): ReadinessChecks => ({
  configuration: 'ok',
  application: 'ok',
});

export const registerReadinessRoute = (app: FastifyInstance): void => {
  app.get('/ready', async (request): Promise<ReadinessResponse> => ({
    status: 'ready',
    checks: getReadinessChecks(),
    timestamp: new Date().toISOString(),
    request_id: getRequestId(request),
  }));
};
