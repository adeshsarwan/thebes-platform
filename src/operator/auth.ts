import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config/env.js';

export interface OperatorIdentity {
  updated_by: string;
}

const OPERATOR_SECRET_HEADER = 'x-thebes-operator-secret';
const OPERATOR_ID_HEADER = 'x-thebes-operator-id';

const readHeader = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const secretDigest = (value: string): Buffer => createHash('sha256').update(value).digest();

const constantTimeEqual = (left: string | undefined, right: string): boolean => {
  if (left === undefined) return false;

  return timingSafeEqual(secretDigest(left), secretDigest(right));
};

const parseBasicAuth = (
  authorization: string | undefined,
):
  | (OperatorIdentity & {
      password: string;
    })
  | null => {
  if (!authorization?.startsWith('Basic ')) return null;
  const decoded = Buffer.from(authorization.slice('Basic '.length), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0) return null;
  const username = decoded.slice(0, separator).trim();
  const password = decoded.slice(separator + 1);

  return { updated_by: username || 'operator', password };
};

export const authenticateOperator = (
  request: FastifyRequest,
  config: AppConfig,
): OperatorIdentity | null => {
  if (!config.OPERATOR_SECRET) return null;

  const suppliedSecret = readHeader(request.headers[OPERATOR_SECRET_HEADER]);
  if (constantTimeEqual(suppliedSecret, config.OPERATOR_SECRET)) {
    const suppliedOperator = readHeader(request.headers[OPERATOR_ID_HEADER]);
    return { updated_by: suppliedOperator?.trim() || 'operator' };
  }

  const basic = parseBasicAuth(readHeader(request.headers.authorization));
  if (basic && constantTimeEqual(basic.password, config.OPERATOR_SECRET)) {
    return { updated_by: basic.updated_by };
  }

  return null;
};

export const requireOperator = (
  request: FastifyRequest,
  reply: FastifyReply,
  config: AppConfig,
): OperatorIdentity | null => {
  const identity = authenticateOperator(request, config);
  if (identity) return identity;

  reply
    .status(401)
    .header('www-authenticate', 'Basic realm="Thebes Operator", charset="UTF-8"')
    .send({
      error: { code: 'OPERATOR_AUTH_REQUIRED', message: 'Operator authentication required' },
    });
  return null;
};
