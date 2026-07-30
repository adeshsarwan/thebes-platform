import fastify, { LogController } from 'fastify';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import type { AppConfig } from '../config/env.js';
import { loadConfig } from '../config/env.js';
import {
  REQUEST_ID_HEADER,
  getRequestId,
  registerRequestContext,
  resolveRequestId,
} from '../plugins/request-context.js';
import { registerHealthRoute } from '../routes/health.js';
import { registerReadinessRoute } from '../routes/readiness.js';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
  request_id: string;
  timestamp: string;
}

export interface BuildAppOptions {
  config?: AppConfig;
  logger?: FastifyServerOptions['logger'];
}

const hasStatusCode = (error: unknown): error is { statusCode: number } =>
  typeof error === 'object' &&
  error !== null &&
  'statusCode' in error &&
  typeof error.statusCode === 'number';

const hasMessage = (error: unknown): error is { message: string } =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string';

const getStatusCode = (error: unknown): number => {
  const statusCode = hasStatusCode(error) ? error.statusCode : 500;

  return statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
};

const getErrorCode = (statusCode: number): string => {
  if (statusCode === 404) {
    return 'NOT_FOUND';
  }

  if (statusCode >= 500) {
    return 'INTERNAL_SERVER_ERROR';
  }

  return 'REQUEST_ERROR';
};

const getSafeErrorMessage = (error: unknown, statusCode: number, config: AppConfig): string => {
  if (statusCode >= 500 && config.NODE_ENV === 'production') {
    return 'Internal Server Error';
  }

  return hasMessage(error) && error.message.length > 0 ? error.message : 'Request failed';
};

export const buildApp = (options: BuildAppOptions = {}): FastifyInstance => {
  const config = options.config ?? loadConfig();
  const app = fastify({
    logger: options.logger ?? { level: config.LOG_LEVEL },
    genReqId: (request) => resolveRequestId(request.headers),
    requestIdHeader: false,
    logController: new LogController({ requestIdLogLabel: 'request_id' }),
  });

  registerRequestContext(app);
  registerHealthRoute(app, config);
  registerReadinessRoute(app);

  app.setNotFoundHandler((request, reply) => {
    const response: ErrorResponse = {
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
      request_id: getRequestId(request),
      timestamp: new Date().toISOString(),
    };

    request.log.warn({ request_id: response.request_id }, 'Route not found');
    reply.status(404).header(REQUEST_ID_HEADER, response.request_id).send(response);
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode = getStatusCode(error);
    const requestId = getRequestId(request);
    const response: ErrorResponse = {
      error: {
        code: getErrorCode(statusCode),
        message: getSafeErrorMessage(error, statusCode, config),
      },
      request_id: requestId,
      timestamp: new Date().toISOString(),
    };

    request.log.error({ err: error, request_id: requestId }, 'Request failed');
    reply.status(statusCode).header(REQUEST_ID_HEADER, requestId).send(response);
  });

  return app;
};
