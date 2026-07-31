# Thebes Intelligence

Thebes Intelligence is the shared contracts and minimum backend service layer for the Thebes Platform. It provides the ST-001 identifier, attribution, and event contracts, the ST-002 Fastify service bootstrap, and the ST-019 pilot Website Registry operator console.

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
- Authenticated operator Website Registry UI and API
- Server-side pilot D1 adapter for the existing ST-004 publisher, placement, and config-version tables
- Architecture documentation and automated tests

Deliberately not implemented yet:

- Public end-user UI
- Platform-owned website/configuration database
- ORM, MySQL, Redis, Docker, Kubernetes, or GraphQL
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

| Variable                      | Default                                | Description                                           |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------- |
| `NODE_ENV`                    | `development`                          | Runtime mode: `development`, `test`, or `production`. |
| `HOST`                        | `0.0.0.0`                              | Host passed to Fastify listen.                        |
| `PORT`                        | `3996`                                 | TCP port, validated from 1 to 65535.                  |
| `LOG_LEVEL`                   | `info`                                 | Fastify/Pino log level.                               |
| `SERVICE_NAME`                | `thebes-platform`                      | Service name returned by `/health`.                   |
| `SERVICE_VERSION`             | package version                        | Service version returned by `/health`.                |
| `OPERATOR_SECRET`             | unset                                  | Required for operator console and API access.         |
| `CLOUDFLARE_ACCOUNT_ID`       | unset                                  | Cloudflare account ID for server-side D1 API access.  |
| `CLOUDFLARE_API_TOKEN`        | unset                                  | Server-side Cloudflare D1 read/write token.           |
| `CLOUDFLARE_API_BASE`         | `https://api.cloudflare.com/client/v4` | Cloudflare API base URL.                              |
| `THEBES_PILOT_D1_DATABASE_ID` | unset                                  | Existing ST-004 pilot D1 database ID.                 |

Invalid configuration fails startup with a readable error. Operator and Cloudflare values are server-only and must never be embedded in browser JavaScript.

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

## Operator Website Registry

ST-019 adds an authenticated pilot-only operator console:

- `GET /operator/websites`
- `GET /operator/websites/:websiteId`

The page hierarchy is:

```text
Website
├── General
├── Ad Units
└── Configuration
```

General fields are limited to domain, environment, GAM network code, and website enabled. `site_key` and `display_name` are derived from the normalized domain. The console does not collect DOM IDs, selectors, coordinates, page layout, or runtime elements.

The operator API is authenticated and server-side only:

- `GET /api/operator/websites`
- `GET /api/operator/websites/:websiteId`
- `GET /api/operator/websites/by-domain/:domain`
- `POST /api/operator/websites`
- `POST /api/operator/websites/:websiteId/general`
- `POST /api/operator/websites/:websiteId/enable`
- `POST /api/operator/websites/:websiteId/disable`
- `GET /api/operator/websites/:websiteId/ad-units`
- `POST /api/operator/websites/:websiteId/ad-units`
- `POST /api/operator/websites/:websiteId/ad-units/:placementId`
- `POST /api/operator/websites/:websiteId/ad-units/:placementId/enable`
- `POST /api/operator/websites/:websiteId/ad-units/:placementId/disable`
- `DELETE /api/operator/websites/:websiteId/ad-units/:placementId`
- `POST /api/operator/websites/:websiteId/configuration`

Every approved pilot write creates a new `publisher_config_versions` row in the existing ST-004 pilot D1 database and activates it after the write succeeds. Production remains blocked/display-only in ST-019.

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
docs/stories/             Story implementation notes
src/app/                  Fastify application factory, server startup, shutdown helpers
src/config/               Environment validation
src/contracts/            Branded TypeScript contracts
src/operator/             Authenticated operator routes, UI, services, and D1 adapter
src/plugins/              Request context plugin
src/routes/               Health and readiness routes
src/utilities/            Identifier generation and validation helpers
src/validation/           Zod schemas for runtime validation
tests/                    Vitest contract and service tests
```
