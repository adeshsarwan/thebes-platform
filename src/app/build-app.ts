import fastify, { LogController } from 'fastify';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import type { AppConfig } from '../config/env.js';
import { loadConfig } from '../config/env.js';
import { createConfiguredD1Client } from '../operator/d1-client.js';
import { registerOperatorRoutes } from '../operator/routes.js';
import { PilotD1WebsiteRegistryRepository } from '../operator/website-registry/d1-repository.js';
import {
  UnconfiguredWebsiteRegistryRepository,
  type WebsiteRegistryRepository,
} from '../operator/website-registry/repository.js';
import { WebsiteRegistryService } from '../operator/website-registry/service.js';
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
  websiteRegistryRepository?: WebsiteRegistryRepository;
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

const hasErrorCode = (error: unknown): error is { code: string } =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string';

const getStatusCode = (error: unknown): number => {
  const statusCode = hasStatusCode(error) ? error.statusCode : 500;

  return statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
};

const getErrorCode = (error: unknown, statusCode: number): string => {
  if (hasErrorCode(error)) {
    return error.code;
  }

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

const createWebsiteRegistryRepository = (config: AppConfig): WebsiteRegistryRepository => {
  const d1Client = createConfiguredD1Client(config);

  return d1Client
    ? new PilotD1WebsiteRegistryRepository(d1Client)
    : new UnconfiguredWebsiteRegistryRepository();
};

export const buildApp = (options: BuildAppOptions = {}): FastifyInstance => {
  const config = options.config ?? loadConfig();
  const websiteRegistryRepository =
    options.websiteRegistryRepository ?? createWebsiteRegistryRepository(config);
  const app = fastify({
    logger: options.logger ?? { level: config.LOG_LEVEL },
    genReqId: (request) => resolveRequestId(request.headers),
    requestIdHeader: false,
    logController: new LogController({ requestIdLogLabel: 'request_id' }),
  });

  registerRequestContext(app);
  registerHealthRoute(app, config);
  registerReadinessRoute(app);
  registerOperatorRoutes(app, config, new WebsiteRegistryService(websiteRegistryRepository));

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
        code: getErrorCode(error, statusCode),
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
