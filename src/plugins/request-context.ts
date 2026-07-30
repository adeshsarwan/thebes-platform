import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { RequestId } from '../contracts/index.js';
import { generateRequestId, isRequestId, parseRequestId } from '../utilities/index.js';

export const REQUEST_ID_HEADER = 'x-request-id';

const readHeaderValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

export const resolveRequestId = (
  headers: Record<string, string | string[] | undefined>,
): RequestId => {
  const incomingRequestId = readHeaderValue(headers[REQUEST_ID_HEADER]);

  return isRequestId(incomingRequestId) ? incomingRequestId : generateRequestId();
};

export const getRequestId = (request: FastifyRequest): RequestId => parseRequestId(request.id);

export const registerRequestContext = (app: FastifyInstance): void => {
  app.addHook('onRequest', async (request, reply) => {
    reply.header(REQUEST_ID_HEADER, request.id);
  });
};
