# Thebes Intelligence

Thebes Intelligence is the shared contracts and minimum backend service layer for the Thebes Platform. It currently provides the ST-001 identifier, attribution, and event contracts plus the ST-002 Fastify service bootstrap.

## Current Scope

Included:

- Branded TypeScript identifier types
- UUID v7 and compact URL-safe identifier generators
- Zod runtime validation for identifiers, attribution, event envelopes, external provider IDs, and service environment configuration
- Minimal Fastify HTTP service
- Request ID handling using the ST-001 `request_id` contract
- `/health` and `/ready` endpoints
- Stable JSON error responses
- Graceful shutdown handling for `SIGTERM` and `SIGINT`
- Architecture documentation and automated tests

Deliberately not implemented yet:

- UI
- Authentication
- Database persistence, ORM, MySQL, Redis, Docker, Kubernetes, or GraphQL
- Campaign management
- Google Ads or GAM API integrations
- SDK event ingestion services
- ROI calculations or optimization workflows
- Deployment configuration or GitHub Actions

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer

## Installation

```bash
npm install
```

## Local Development

```bash
npm run dev
```

The development server reads environment variables and defaults to `0.0.0.0:3996`.

## Production Build And Start

```bash
npm run build
npm start
```

## Environment Variables

| Variable          | Default           | Description                                           |
| ----------------- | ----------------- | ----------------------------------------------------- |
| `NODE_ENV`        | `development`     | Runtime mode: `development`, `test`, or `production`. |
| `HOST`            | `0.0.0.0`         | Host passed to Fastify listen.                        |
| `PORT`            | `3996`            | TCP port, validated from 1 to 65535.                  |
| `LOG_LEVEL`       | `info`            | Fastify/Pino log level.                               |
| `SERVICE_NAME`    | `thebes-platform` | Service name returned by `/health`.                   |
| `SERVICE_VERSION` | package version   | Service version returned by `/health`.                |

Invalid configuration fails startup with a readable error. No secrets or external service credentials are part of ST-002.

## Endpoints

### `GET /health`

Reports that the process is alive. It performs no database or external dependency checks.

```json
{
  "status": "ok",
  "service": "thebes-platform",
  "version": "0.1.0",
  "timestamp": "2026-07-30T08:00:00.000Z",
  "request_id": "0198614b-75cc-7122-8ff0-6d9e9bc8f801"
}
```

### `GET /ready`

Reports initial application readiness. The checks object is shaped so future dependency checks can be added without changing the endpoint contract unnecessarily.

```json
{
  "status": "ready",
  "checks": {
    "configuration": "ok",
    "application": "ok"
  },
  "timestamp": "2026-07-30T08:00:00.000Z",
  "request_id": "0198614b-75cc-7122-8ff0-6d9e9bc8f801"
}
```

## Request ID Behaviour

Every request receives a public `request_id` that follows the ST-001 UUID v7 request ID policy.

- A valid incoming `x-request-id` header is preserved.
- A missing or malformed `x-request-id` header is replaced with a generated UUID v7 request ID.
- The final request ID is returned in the `x-request-id` response header.
- Route handlers use the final request ID.
- Fastify request-scoped logs include the final request ID as `request_id`.

`request_id` is for request and log correlation only. It is not a business identifier.

## Error Response Shape

Errors use a stable JSON response shape:

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Internal Server Error"
  },
  "request_id": "0198614b-75cc-7122-8ff0-6d9e9bc8f801",
  "timestamp": "2026-07-30T08:00:00.000Z"
}
```

Production responses do not expose stack traces for server errors. The service logs the underlying error.

## Graceful Shutdown

The production entrypoint installs `SIGTERM` and `SIGINT` handlers. On normal shutdown the service logs shutdown start, closes Fastify cleanly, logs completion, and exits successfully.

## Scripts

```bash
npm run dev
npm run typecheck
npm run lint
npm run format
npm run format:check
npm test
npm run build
npm start
npm run verify
```

`npm run verify` runs typecheck, lint, format check, tests, and build.

## Folder Structure

```text
docs/architecture/        Tracking contract documentation and decisions
src/app/                  Fastify application factory, server startup, shutdown helpers
src/config/               Environment validation
src/contracts/            Branded TypeScript contracts
src/plugins/              Request context plugin
src/routes/               Health and readiness routes
src/utilities/            Identifier generation and validation helpers
src/validation/           Zod schemas for runtime validation
tests/                    Vitest contract and service tests
```
